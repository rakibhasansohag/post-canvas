import { describe, expect, it, vi } from 'vitest';
import { createEmbedResolver, EmbedResolveError } from './resolvers/embed-resolver';
import { cleanText, decodeEntities, readHtmlMeta } from './resolvers/html-meta';
import { createLinkPreviewResolver, type ResolverFetch } from './resolvers/link-resolver';
import {
  checkUrl,
  isBlockedAddress,
  LinkPreviewError,
  parseIPv4Literal,
  resolveHost,
  type LookupFunction,
} from './resolvers/ssrf';

const ctx = () => ({ signal: new AbortController().signal });

const publicLookup = (address = '93.184.216.34') =>
  vi.fn<LookupFunction>(() => Promise.resolve([{ address, family: address.includes(':') ? 6 : 4 }]));

function html(body: string, init: { status?: number; type?: string; headers?: Record<string, string> } = {}): Response {
  return new Response(body, {
    status: init.status ?? 200,
    headers: { 'content-type': init.type ?? 'text/html; charset=utf-8', ...init.headers },
  });
}

function redirect(location: string, status = 302): Response {
  return new Response(null, { status, headers: { location } });
}

async function codeOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof LinkPreviewError || error instanceof EmbedResolveError) return error.code;
    throw error;
  }
  throw new Error('expected a rejection');
}

describe('isBlockedAddress', () => {
  const blocked = [
    '0.0.0.0',
    '0.1.2.3',
    '10.0.0.1',
    '10.255.255.255',
    '100.64.0.1',
    '100.127.255.255',
    '127.0.0.1',
    '127.255.255.254',
    '169.254.169.254',
    '172.16.0.1',
    '172.31.255.255',
    '192.0.0.8',
    '192.0.2.1',
    '192.88.99.1',
    '192.168.1.1',
    '198.18.0.1',
    '198.19.255.255',
    '198.51.100.7',
    '203.0.113.9',
    '224.0.0.1',
    '239.255.255.250',
    '240.0.0.1',
    '255.255.255.255',
    '::',
    '::1',
    '[::1]',
    '0:0:0:0:0:0:0:1',
    '::ffff:127.0.0.1',
    '::ffff:7f00:1',
    '[::ffff:169.254.169.254]',
    '::ffff:10.0.0.1',
    '::127.0.0.1',
    '::7f00:1',
    'fc00::1',
    'fd12::1',
    'fe80::1',
    'fe80::1%en0',
    'fec0::1',
    'ff02::1',
    '2001:db8::1',
    '2001::1',
    '2001:0:4136:e378:8000:63bf:3fff:fdd2',
    '2001:2::1',
    '2002:7f00:1::',
    '2002:808:808::1',
    '64:ff9b::7f00:1',
    '64:ff9b::10.0.0.1',
    '64:ff9b:1::1',
    '100::1',
    '3fff::1',
    'not-an-ip',
    '',
    '::ffff:1.2.3.256',
    '1::2::3',
    '12345::1',
  ];
  it.each(blocked)('blocks %s', (ip) => {
    expect(isBlockedAddress(ip)).toBe(true);
  });

  const allowed = [
    '93.184.216.34',
    '8.8.8.8',
    '1.1.1.1',
    '100.128.0.1',
    '100.63.255.255',
    '172.32.0.1',
    '172.15.255.255',
    '192.169.0.1',
    '2606:4700:4700::1111',
    '[2606:4700:4700::1111]',
    '2a00:1450:4001:80b::200e',
    '::ffff:8.8.8.8',
    '64:ff9b::808:808',
  ];
  it.each(allowed)('allows %s', (ip) => {
    expect(isBlockedAddress(ip)).toBe(false);
  });
});

describe('parseIPv4Literal', () => {
  it.each([
    ['127.0.0.1', '127.0.0.1'],
    ['2130706433', '127.0.0.1'],
    ['0x7f000001', '127.0.0.1'],
    ['0177.0.0.1', '127.0.0.1'],
    ['127.1', '127.0.0.1'],
    ['127.0.1', '127.0.0.1'],
    ['0x7f.1', '127.0.0.1'],
    ['127.0.0.1.', '127.0.0.1'],
  ])('reads %s', (input, expected) => {
    expect(parseIPv4Literal(input)).toBe(expected);
  });

  it.each(['example.com', '256.0.0.1', '1.2.3.4.5', '4294967296', '08.0.0.1', ''])('rejects %s', (input) => {
    expect(parseIPv4Literal(input)).toBeNull();
  });
});

describe('checkUrl and resolveHost', () => {
  it('refuses other protocols, user names and ports', () => {
    for (const url of ['ftp://example.com/', 'file:///etc/passwd', 'javascript:alert(1)', 'data:text/html,hi']) {
      expect(() => checkUrl(url)).toThrow(LinkPreviewError);
    }
    expect(() => checkUrl('http://user@example.com/')).toThrow(/user name/);
    expect(() => checkUrl('http://example.com:8080/')).toThrow(/Port 8080/);
    expect(checkUrl('http://example.com:8080/', { allowPorts: [8080] }).port).toBe('8080');
    expect(checkUrl('https://example.com:443/').hostname).toBe('example.com');
    expect(() => checkUrl('http://localhost/')).toThrow(LinkPreviewError);
    expect(() => checkUrl('http://api.localhost./')).toThrow(LinkPreviewError);
  });

  it('rejects a host when any of its addresses is private', async () => {
    const lookup: LookupFunction = () =>
      Promise.resolve([
        { address: '93.184.216.34', family: 4 },
        { address: '10.0.0.5', family: 4 },
      ]);
    expect(await codeOf(resolveHost('mixed.example', lookup))).toBe('blocked');
  });

  it('returns the first address of a public host', async () => {
    const lookup: LookupFunction = () =>
      Promise.resolve([
        { address: '2606:4700:4700::1111', family: 6 },
        { address: '1.1.1.1', family: 4 },
      ]);
    expect(await resolveHost('one.example', lookup)).toEqual({ address: '2606:4700:4700::1111', family: 6 });
  });

  it('treats a host that does not resolve as unavailable', async () => {
    expect(await codeOf(resolveHost('none.example', () => Promise.resolve([])))).toBe('unavailable');
    expect(await codeOf(resolveHost('none.example', () => Promise.reject(new Error('ENOTFOUND'))))).toBe('unavailable');
  });
});

describe('createLinkPreviewResolver', () => {
  it.each([
    'http://2130706433/',
    'http://0x7f000001/',
    'http://0177.0.0.1/',
    'http://127.1/',
    'http://[::ffff:127.0.0.1]/',
    'http://[::1]/',
    'http://169.254.169.254/latest/meta-data',
    'http://[fe80::1]/',
    'http://0/',
  ])('blocks %s without fetching', async (url) => {
    const fetch = vi.fn<ResolverFetch>();
    const lookup = publicLookup();
    const resolve = createLinkPreviewResolver({ fetch, lookup });
    expect(await codeOf(resolve(url, ctx()))).toBe('blocked');
    expect(fetch).not.toHaveBeenCalled();
    expect(lookup).not.toHaveBeenCalled();
  });

  it('blocks a host that resolves to one public and one private address', async () => {
    const fetch = vi.fn<ResolverFetch>();
    const lookup: LookupFunction = () =>
      Promise.resolve([
        { address: '8.8.8.8', family: 4 },
        { address: '127.0.0.1', family: 4 },
      ]);
    const resolve = createLinkPreviewResolver({ fetch, lookup });
    expect(await codeOf(resolve('https://rebind.example/', ctx()))).toBe('blocked');
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ['http://example.com:8080/', 'blocked'],
    ['ftp://example.com/', 'invalid_url'],
    ['file:///etc/passwd', 'invalid_url'],
    ['javascript:alert(1)', 'invalid_url'],
    ['http://user@example.com/', 'invalid_url'],
    ['http://user:pass@example.com/', 'invalid_url'],
    ['not a url', 'invalid_url'],
  ])('refuses %s', async (url, code) => {
    const fetch = vi.fn<ResolverFetch>();
    const resolve = createLinkPreviewResolver({ fetch, lookup: publicLookup() });
    expect(await codeOf(resolve(url, ctx()))).toBe(code);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('blocks a redirect to the metadata address', async () => {
    const fetch = vi.fn<ResolverFetch>(() => Promise.resolve(redirect('http://169.254.169.254/latest/meta-data')));
    const resolve = createLinkPreviewResolver({ fetch, lookup: publicLookup() });
    expect(await codeOf(resolve('https://example.com/', ctx()))).toBe('blocked');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('re-resolves every redirect hop', async () => {
    const lookup = vi.fn<LookupFunction>((host) =>
      Promise.resolve([{ address: host === 'internal.example' ? '192.168.0.10' : '93.184.216.34', family: 4 }]),
    );
    const fetch = vi.fn<ResolverFetch>(() => Promise.resolve(redirect('https://internal.example/admin', 301)));
    const resolve = createLinkPreviewResolver({ fetch, lookup });
    expect(await codeOf(resolve('https://example.com/', ctx()))).toBe('blocked');
    expect(lookup).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('refuses a redirect to another protocol or port', async () => {
    const toFile = createLinkPreviewResolver({
      fetch: () => Promise.resolve(redirect('file:///etc/passwd')),
      lookup: publicLookup(),
    });
    expect(await codeOf(toFile('https://example.com/', ctx()))).toBe('invalid_url');
    const toPort = createLinkPreviewResolver({
      fetch: () => Promise.resolve(redirect('http://example.com:6379/')),
      lookup: publicLookup(),
    });
    expect(await codeOf(toPort('https://example.com/', ctx()))).toBe('blocked');
  });

  it('stops after maxRedirects', async () => {
    let hop = 0;
    const fetch = vi.fn<ResolverFetch>(() => Promise.resolve(redirect(`/hop-${++hop}`)));
    const resolve = createLinkPreviewResolver({ fetch, lookup: publicLookup(), maxRedirects: 3 });
    expect(await codeOf(resolve('https://example.com/', ctx()))).toBe('too_many_redirects');
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('follows relative redirects and sends the expected request', async () => {
    const fetch = vi.fn<ResolverFetch>((url) =>
      Promise.resolve(url === 'https://example.com/start' ? redirect('/final') : html('<title>Final page</title>')),
    );
    const resolve = createLinkPreviewResolver({ fetch, lookup: publicLookup() });
    const preview = await resolve('https://example.com/start', ctx());
    expect(preview.title).toBe('Final page');
    expect(preview.url).toBe('https://example.com/final');
    expect(fetch.mock.calls.map(([url]) => url)).toEqual(['https://example.com/start', 'https://example.com/final']);
    const init = fetch.mock.calls[0]?.[1];
    expect(init?.redirect).toBe('manual');
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(new Headers(init?.headers).get('accept')).toBe('text/html,application/xhtml+xml');
    expect(new Headers(init?.headers).get('user-agent')).toMatch(/^post-canvas-link-preview/);
  });

  it.each(['application/json', 'image/png', ''])('refuses content type %j as not_html', async (type) => {
    const resolve = createLinkPreviewResolver({
      fetch: () => Promise.resolve(new Response('{}', { headers: type ? { 'content-type': type } : {} })),
      lookup: publicLookup(),
    });
    expect(await codeOf(resolve('https://example.com/data', ctx()))).toBe('not_html');
  });

  it('reports a non-2xx answer as http_error with its status', async () => {
    const resolve = createLinkPreviewResolver({
      fetch: () => Promise.resolve(html('gone', { status: 410 })),
      lookup: publicLookup(),
    });
    const error = await resolve('https://example.com/', ctx()).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(LinkPreviewError);
    expect((error as LinkPreviewError).code).toBe('http_error');
    expect((error as LinkPreviewError).status).toBe(410);
  });

  it('cuts an oversize body and still parses its head', async () => {
    const head = new TextEncoder().encode(
      '<html><head><meta property="og:title" content="Big page"><title>Fallback</title></head><body>',
    );
    const chunk = new Uint8Array(16_384).fill(97);
    const total = 5 * 1024 * 1024;
    let pulled = 0;
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          const next = pulled === 0 ? head : chunk;
          pulled += next.byteLength;
          controller.enqueue(next);
          if (pulled >= total) controller.close();
        },
        cancel() {
          cancelled = true;
        },
      },
      { highWaterMark: 0 },
    );
    const resolve = createLinkPreviewResolver({
      fetch: () => Promise.resolve(new Response(stream, { headers: { 'content-type': 'text/html' } })),
      lookup: publicLookup(),
      maxBytes: 1000,
    });
    const preview = await resolve('https://example.com/big', ctx());
    expect(preview.title).toBe('Big page');
    expect(cancelled).toBe(true);
    expect(pulled).toBeLessThanOrEqual(1000 + chunk.byteLength);
  });

  it('reads OpenGraph tags, resolves relative images and drops unsafe ones', async () => {
    const page = `<!doctype html><html><head>
      <!-- <meta property="og:title" content="Commented out"> -->
      <meta property="og:title" content="Tom &amp; Jerry &#8217;s &quot;Show&quot;">
      <meta property='og:description' content='A   long
        description &lt;b&gt;'>
      <meta property="og:image" content="javascript:alert(1)">
      <meta name="twitter:image" content="/images/card.png?x=1&amp;y=2">
      <meta property="og:site_name" content="Example Site">
      <meta property="og:url" content="https://evil.example/phish">
      <link rel="shortcut icon" href="/static/icon.png">
      <title>Plain title</title>
      <script>var s = '<meta property="og:image" content="https://evil.example/x.png">';</script>
    </head><body></body></html>`;
    const resolve = createLinkPreviewResolver({ fetch: () => Promise.resolve(html(page)), lookup: publicLookup() });
    const preview = await resolve('https://www.example.com/articles/1', ctx());
    expect(preview).toEqual({
      url: 'https://www.example.com/articles/1',
      title: 'Tom & Jerry ’s "Show"',
      description: 'A long description <b>',
      image: 'https://www.example.com/images/card.png?x=1&y=2',
      siteName: 'Example Site',
      favicon: 'https://www.example.com/static/icon.png',
    });
  });

  it('falls back to the title tag, the host and /favicon.ico', async () => {
    const resolve = createLinkPreviewResolver({
      fetch: () => Promise.resolve(html('<html><head></head><body>No tags</body></html>')),
      lookup: publicLookup(),
    });
    expect(await resolve('https://www.example.com/x', ctx())).toEqual({
      url: 'https://www.example.com/x',
      title: 'example.com',
      siteName: 'example.com',
      favicon: 'https://www.example.com/favicon.ico',
    });
  });

  it('keeps a same-site og:url and clips long text', async () => {
    const long = 'word '.repeat(300);
    const page = `<meta property="og:url" content="https://example.com/canonical"><meta name="description" content="${long}"><title>${long}</title>`;
    const resolve = createLinkPreviewResolver({ fetch: () => Promise.resolve(html(page)), lookup: publicLookup() });
    const preview = await resolve('https://www.example.com/x?ref=1', ctx());
    expect(preview.url).toBe('https://example.com/canonical');
    expect(preview.title.length).toBeLessThanOrEqual(200);
    expect(preview.title.endsWith('word…')).toBe(true);
    expect(preview.description?.length).toBeLessThanOrEqual(500);
  });

  it('respects a charset in the content type', async () => {
    const bytes = new Uint8Array([
      ...new TextEncoder().encode('<title>Caf'),
      0xe9,
      ...new TextEncoder().encode('</title>'),
    ]);
    const resolve = createLinkPreviewResolver({
      fetch: () =>
        Promise.resolve(new Response(bytes, { headers: { 'content-type': 'text/html; charset=iso-8859-1' } })),
      lookup: publicLookup(),
    });
    expect((await resolve('https://example.com/', ctx())).title).toBe('Café');
  });

  it('rethrows the caller’s abort and maps its own timeout', async () => {
    const hang: ResolverFetch = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(init.signal?.reason as Error));
      });
    const controller = new AbortController();
    const reason = new Error('caller gave up');
    const pending = createLinkPreviewResolver({ fetch: hang, lookup: publicLookup() })('https://example.com/', {
      signal: controller.signal,
    });
    controller.abort(reason);
    await expect(pending).rejects.toBe(reason);
    const timed = createLinkPreviewResolver({ fetch: hang, lookup: publicLookup(), timeoutMs: 20 });
    expect(await codeOf(timed('https://example.com/', ctx()))).toBe('timeout');
  });
});

describe('html-meta', () => {
  it('decodes entities once and cleans text', () => {
    expect(decodeEntities('&amp;lt; &#x27;&#39; &hellip; &unknown;')).toBe("&lt; '' … &unknown;");
    expect(cleanText('  a\n\tb\u0000 ', 10)).toBe('a b');
    expect(cleanText('alpha beta gamma delta', 12)).toBe('alpha beta…');
    expect(cleanText(42, 10)).toBe('');
  });

  it('reads unquoted attributes and stays fast on hostile input', () => {
    expect(readHtmlMeta('<meta name=description content=Hello>').meta.get('description')).toBe('Hello');
    const hostile = `<meta ${'x'.repeat(200_000)}<meta content="${'"'.repeat(1000)}${'<!--'.repeat(50_000)}`;
    const started = Date.now();
    readHtmlMeta(hostile);
    expect(Date.now() - started).toBeLessThan(1000);
  });
});

describe('createEmbedResolver', () => {
  const youtubeOembed = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent('https://www.youtube.com/watch?v=dQw4w9WgXcQ')}`;

  function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  }

  it('fetches only the fixed YouTube endpoints', async () => {
    const fetch = vi.fn<ResolverFetch>((url) =>
      Promise.resolve(
        url.startsWith('https://www.youtube.com/oembed')
          ? json({ title: 'A video', width: 200, height: 113, html: '<iframe src="https://evil.example">' })
          : html('<meta property="og:description" content="About the video &amp; more">'),
      ),
    );
    const resolve = createEmbedResolver({ fetch });
    const meta = await resolve('https://youtu.be/dQw4w9WgXcQ?si=tracking', ctx());
    expect(fetch.mock.calls.map(([url]) => url).sort()).toEqual(
      [youtubeOembed, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'].sort(),
    );
    const watchInit = fetch.mock.calls.find(([url]) => url.includes('/watch'))?.[1];
    expect(new Headers(watchInit?.headers).get('cookie')).toBe('SOCS=CAI');
    expect(meta).toEqual({
      title: 'A video',
      description: 'About the video & more',
      thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      aspectRatio: 200 / 113,
    });
    expect(JSON.stringify(meta)).not.toContain('iframe');
  });

  it('refuses lookalike hosts without fetching', async () => {
    const fetch = vi.fn<ResolverFetch>();
    const resolve = createEmbedResolver({ fetch });
    for (const url of [
      'https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ',
      'https://youtube.com@evil.com/watch?v=dQw4w9WgXcQ',
      'https://example.com/',
      'javascript:alert(1)',
    ]) {
      expect(await codeOf(resolve(url, ctx()))).toBe('unsupported');
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    [404, 'not_found'],
    [400, 'not_found'],
    [401, 'not_embeddable'],
    [403, 'not_embeddable'],
    [500, 'unavailable'],
  ])('maps a %i answer to %s', async (status, code) => {
    const resolve = createEmbedResolver({ fetch: () => Promise.resolve(json({}, status)) });
    expect(await codeOf(resolve('https://vimeo.com/76979871', ctx()))).toBe(code);
  });

  it('maps a network failure to unavailable', async () => {
    const resolve = createEmbedResolver({ fetch: () => Promise.reject(new TypeError('fetch failed')) });
    expect(await codeOf(resolve('https://vimeo.com/76979871', ctx()))).toBe('unavailable');
  });

  it('drops a Vimeo thumbnail on a foreign host and keeps a vertical ratio', async () => {
    const fetch = vi.fn<ResolverFetch>(() =>
      Promise.resolve(
        json({
          title: 'Clip',
          description: 'Desc',
          thumbnail_url: 'https://evil.example/t.jpg',
          width: 1080,
          height: 1920,
        }),
      ),
    );
    const meta = await createEmbedResolver({ fetch })('https://vimeo.com/76979871', ctx());
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]?.[0]).toMatch(/^https:\/\/vimeo\.com\/api\/oembed\.json\?/);
    expect(meta).toEqual({ title: 'Clip', description: 'Desc', aspectRatio: 1080 / 1920 });
  });

  it('keeps a Vimeo thumbnail from its own image host', async () => {
    const thumbnail = 'https://i.vimeocdn.com/video/452001751-8216e5f4_1280';
    const resolve = createEmbedResolver({
      fetch: () => Promise.resolve(json({ title: 'Clip', thumbnail_url: thumbnail })),
    });
    expect((await resolve('https://vimeo.com/76979871', ctx())).thumbnailUrl).toBe(thumbnail);
  });

  it('serves a cache hit without fetching again', async () => {
    const fetch = vi.fn<ResolverFetch>(() => Promise.resolve(json({ title: 'Clip' })));
    const resolve = createEmbedResolver({ fetch });
    const first = await resolve('https://vimeo.com/76979871', ctx());
    const second = await resolve('https://www.vimeo.com/76979871', ctx());
    expect(second).toEqual(first);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('evicts the oldest entry when the cache is full', async () => {
    const fetch = vi.fn<ResolverFetch>(() => Promise.resolve(json({ title: 'Clip' })));
    const resolve = createEmbedResolver({ fetch, cacheSize: 1 });
    await resolve('https://vimeo.com/1', ctx());
    await resolve('https://vimeo.com/2', ctx());
    await resolve('https://vimeo.com/1', ctx());
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
