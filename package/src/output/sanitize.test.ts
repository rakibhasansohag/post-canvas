import { Node } from '@tiptap/core';
import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';
import type { JSONContent } from '../core/types';
import { fromHTML, type HTMLParserHost } from './from-html';
import { renderToHTML } from './html';
import { sanitizeDocument } from './sanitize';
import { hasTransientContent } from './text';
import { toMarkdown } from './markdown';
import { postCanvasSchema } from '../core/schema';

const yt = 'dQw4w9WgXcQ';
const ctrl = String.fromCharCode(1);
const host = new Window() as unknown as HTMLParserHost;

/** URL and attribute vectors: never allowed anywhere, not even as data in the JSON. */
const urlVectors = ['javascript:', 'vbscript:', 'data:text/html', 'srcdoc', 'evil.com', 'onerror', 'onclick', 'onload'];

/** Nothing that can run script, load a hidden document or style the page may survive. */
function expectClean(html: string, vectors?: string[]): void {
  const lower = html.toLowerCase();
  for (const bad of vectors ?? [
    'javascript:',
    'vbscript:',
    'data:text/html',
    '<script',
    '<style',
    '<svg',
    '<object',
    '<embed',
    'srcdoc',
    'onerror',
    'onclick',
    'onload',
    'onmouseover',
    'evil.com',
    'expression(',
  ]) {
    expect(lower, `found ${bad}`).not.toContain(bad);
  }
}

const badHrefs = [
  'javascript:alert(1)',
  'JaVaScRiPt:alert(1)',
  ' javascript:alert(1)',
  `${ctrl}javascript:alert(1)`,
  'java\tscript:alert(1)',
  '&#106;avascript:alert(1)',
  '&#x6A;avascript&colon;alert(1)',
  'javascript%3Aalert(1)',
  'vbscript:msgbox(1)',
  'data:text/html,<script>alert(1)</script>',
  'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
  '//evil.com/x',
];

const linked = (href: string): JSONContent => ({
  type: 'paragraph',
  content: [{ type: 'text', text: 'click', marks: [{ type: 'link', attrs: { href, target: '_blank' } }] }],
});

const hostile: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      attrs: { onclick: 'alert(1)', style: 'x:expression(alert(1))' },
      content: [{ type: 'text', text: '<script>alert(1)</script>' }],
    },
    ...badHrefs.map(linked),
    { type: 'script', content: [{ type: 'text', text: 'kept inside unknown' }] },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'marked', marks: [{ type: 'evil', attrs: { onload: 'x' } }] }],
    },
    { type: 'iframe', attrs: { src: 'https://evil.com', srcdoc: '<script>alert(1)</script>' } },
    { type: 'video', attrs: { provider: 'youtube', videoId: '"><img src=x onerror=alert(1)>' } },
    {
      type: 'video',
      attrs: { provider: 'youtube', videoId: yt, thumbnailUrl: 'https://evil.com/pixel.png', title: 'ok' },
    },
    { type: 'video', attrs: { provider: 'evil', videoId: yt } },
    {
      type: 'embed',
      attrs: {
        provider: 'spotify',
        ref: { type: 'track', id: '"><script>alert(1)</script>' },
        url: 'https://open.spotify.com/track/x',
      },
    },
    {
      type: 'embed',
      attrs: { provider: 'spotify', ref: { type: 'track', id: '4uLU6hMCjMI75M1A2tKUQC' }, url: 'javascript:alert(1)' },
    },
    { type: 'embed', attrs: { provider: 'evil', ref: { id: '1' }, url: 'https://evil.com' } },
    { type: 'embed', attrs: { provider: 'google-maps', ref: { q: '"><svg onload=alert(1)>' } } },
    { type: 'linkCard', attrs: { url: 'javascript:alert(1)', title: 'x' } },
    {
      type: 'linkCard',
      attrs: {
        url: 'https://example.org/post',
        title: 'Card',
        image: 'javascript:alert(1)',
        favicon: 'data:text/html,x',
      },
    },
    { type: 'embedInput', attrs: { value: 'https://evil.com' } },
    {
      type: 'codeBlock',
      attrs: { language: '"><script>alert(1)</script>' },
      content: [{ type: 'text', text: 'let a = 1;' }],
    },
    { type: 'heading', attrs: { level: '<script>' }, content: [{ type: 'text', text: 'Heading' }] },
  ],
};

describe('sanitizeDocument', () => {
  it('runs with no DOM', () => {
    expect(typeof (globalThis as { document?: unknown }).document).toBe('undefined');
  });

  it('removes every script vector from JSON, and renders clean HTML', () => {
    const { doc, removed } = sanitizeDocument(hostile);
    const html = renderToHTML(doc, { sanitize: false });
    expectClean(html);
    expectClean(JSON.stringify(doc), urlVectors);
    expect(removed.length).toBeGreaterThan(10);
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('kept inside unknown');
    // The video with a foreign thumbnail keeps its id and falls back to YouTube's own thumbnail.
    expect(html).toContain(`https://i.ytimg.com/vi/${yt}/hqdefault.jpg`);
    // The embed's stored url is replaced by the rebuilt canonical one.
    expect(html).toContain('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC');
    expect(html).toContain('https://example.org/post');
    expect(hasTransientContent(doc)).toBe(false);
  });

  it('renderToHTML sanitizes by default, in every embed mode', () => {
    for (const embeds of ['facade', 'iframe', 'link'] as const) expectClean(renderToHTML(hostile, { embeds }));
  });

  it('builds iframes only from provider ids, sandboxed', () => {
    const html = renderToHTML(
      { type: 'doc', content: [{ type: 'video', attrs: { provider: 'youtube', videoId: yt } }] },
      { embeds: 'iframe' },
    );
    expect(html).toContain(`<iframe src="https://www.youtube-nocookie.com/embed/${yt}?rel=0&amp;playsinline=1"`);
    expect(html).toContain('sandbox="allow-scripts allow-same-origin');
    expect(html).toContain('referrerpolicy="strict-origin-when-cross-origin"');
    expect(html).not.toContain('autoplay=1');
  });

  it('drops transient state', () => {
    const { doc, removed } = sanitizeDocument({
      type: 'doc',
      content: [
        { type: 'embedInput', attrs: { value: 'x' } },
        { type: 'paragraph', content: [{ type: 'text', text: 'stay' }] },
      ],
    });
    expect(JSON.stringify(doc)).not.toContain('embedInput');
    expect(removed).toContainEqual(expect.objectContaining({ reason: 'transient', type: 'embedInput' }));
  });

  it('keeps normal content as it is', () => {
    const normal: JSONContent = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Title' }] },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Bold', marks: [{ type: 'bold' }] },
            { type: 'text', text: ' and ' },
            { type: 'text', text: 'a link', marks: [{ type: 'link', attrs: { href: 'https://example.com/a?b=1' } }] },
          ],
        },
        {
          type: 'bulletList',
          content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'one' }] }] }],
        },
        {
          type: 'video',
          attrs: {
            id: 'v1',
            provider: 'vimeo',
            videoId: '76979871',
            hash: '8272103f6e',
            title: 'Clip',
            description: 'About it',
          },
        },
        {
          type: 'embed',
          attrs: { provider: 'x', ref: { user: 'jack', id: '20' }, url: 'https://x.com/jack/status/20' },
        },
        {
          type: 'linkCard',
          attrs: { url: 'https://example.com/', title: 'Example', description: 'A page', siteName: 'Example' },
        },
      ],
    };
    const { doc, removed } = sanitizeDocument(normal);
    expect(removed).toEqual([]);
    const html = renderToHTML(doc);
    expect(html).toContain('<h2>Title</h2>');
    expect(html).toContain('<strong>Bold</strong>');
    expect(html).toContain('href="https://example.com/a?b=1"');
    expect(html).toContain('<li>');
    expect(html).toContain('https://vimeo.com/76979871/8272103f6e');
    expect(html).toContain('Clip');
    expect(html).toContain('https://x.com/jack/status/20');
    expect(html).toContain('class="pc-link-card pc-link-card-text"');
    expect(html.startsWith('<div class="pc-view" data-pc-theme="auto"><div class="pc-content">')).toBe(true);
  });

  it('cuts at the caps', () => {
    const many = {
      type: 'doc',
      content: Array.from({ length: 50 }, () => ({
        type: 'paragraph',
        content: [{ type: 'text', text: 'x'.repeat(100) }],
      })),
    };
    const { doc, removed } = sanitizeDocument(many, { limits: { maxNodes: 21, maxTextLength: 1050 } });
    expect(doc.content!.length).toBeLessThanOrEqual(11);
    expect(removed.map((item) => item.reason)).toEqual(expect.arrayContaining(['limit-nodes']));
    const deep: JSONContent = { type: 'paragraph', content: [{ type: 'text', text: 'deep' }] };
    let nested: JSONContent = deep;
    for (let i = 0; i < 80; i++) nested = { type: 'blockquote', content: [nested] };
    const result = sanitizeDocument({ type: 'doc', content: [nested] }, { limits: { maxDepth: 10 } });
    expect(result.removed.some((item) => item.reason === 'limit-depth')).toBe(true);
  });

  it('survives garbage input', () => {
    for (const input of [
      null,
      42,
      'doc',
      [],
      { type: 'doc', content: 'x' },
      { type: 'doc', content: [null, 1, { type: 1 }] },
      { __proto__: { type: 'doc' } },
    ]) {
      const { doc } = sanitizeDocument(input);
      expect(doc.type).toBe('doc');
      expect(doc.content?.length).toBeGreaterThan(0);
    }
  });
});

describe('review regressions', () => {
  it('caps the removal list, so junk cannot amplify the response', () => {
    let nested: JSONContent = { type: 'blockquote', content: new Array(200_000).fill(0) as JSONContent[] };
    for (let i = 0; i < 46; i++) nested = { type: 'blockquote', content: [nested] };
    const { removed, omitted } = sanitizeDocument({ type: 'doc', content: [nested] });
    expect(removed.length).toBeLessThanOrEqual(100);
    expect(omitted).toBeGreaterThan(0);
    expect(JSON.stringify(removed).length).toBeLessThan(100_000);
  });

  it('cleans URL-like attributes of custom nodes without a sanitizer', () => {
    const Card = Node.create({
      name: 'card',
      group: 'block',
      atom: true,
      addAttributes: () => ({
        url: { default: null },
        poster: { default: null },
        style: { default: null },
        srcset: { default: null },
        action: { default: null },
        note: { default: null },
        label: { default: null },
      }),
      renderHTML: ({ HTMLAttributes, node }) => [
        'div',
        HTMLAttributes,
        ['a', { href: node.attrs.url as string }, 'open'],
      ],
    });
    const html = renderToHTML(
      {
        type: 'doc',
        content: [
          {
            type: 'card',
            attrs: {
              url: 'javascript:alert(1)',
              poster: 'javascript:alert(2)',
              style: 'background:url(https://evil.com/x)',
              srcset: 'javascript:x 1x',
              action: 'javascript:alert(3)',
              note: 'vbscript:msgbox',
              label: 'Note: a plain label',
            },
          },
        ],
      },
      { extensions: [Card] },
    );
    expectClean(html);
    expect(html).toContain('Note: a plain label');
  });

  it('keeps text that merely starts with "blob:"', () => {
    const { doc, removed } = sanitizeDocument({
      type: 'doc',
      content: [{ type: 'video', attrs: { provider: 'youtube', videoId: yt, title: 'blob: my title' } }],
    });
    expect(removed).toEqual([]);
    expect(JSON.stringify(doc)).toContain('blob: my title');
  });

  it('keeps a Short with a start time, without the start', () => {
    const { doc, removed } = sanitizeDocument({
      type: 'doc',
      content: [{ type: 'video', attrs: { provider: 'youtube', videoId: yt, vertical: true, start: 5 } }],
    });
    expect(removed).toEqual([]);
    expect(doc.content?.[0]?.attrs).toMatchObject({ vertical: true, start: null });
  });

  it('reports content that is not an array', () => {
    expect(sanitizeDocument({ type: 'doc', content: {} }).removed).toContainEqual(
      expect.objectContaining({ reason: 'invalid-content' }),
    );
  });
});

describe('fromHTML', () => {
  const html = `
    <p onclick="alert(1)">Hello <a href="javascript:alert(1)">x</a> <a href="  JaVaScRiPt:alert(1)">y</a>
      <a href="&#106;avascript:alert(1)">z</a> <a href="data:text/html,&lt;script&gt;alert(1)&lt;/script&gt;">d</a></p>
    <script>alert(1)</script><style>body { color: red }</style>
    <iframe srcdoc="<script>alert(1)</script>"></iframe>
    <iframe src="javascript:alert(1)"></iframe>
    <iframe src="https://evil.com/embed"></iframe>
    <iframe src="https://www.youtube.com/embed/${yt}" width="560" height="315"></iframe>
    <img src="x" onerror="alert(1)">
    <object data="https://evil.com/x"></object><embed src="https://evil.com/x">
    <div data-pc-link-card data-url="javascript:alert(1)"><a href="javascript:alert(1)">card</a></div>
    <figure data-pc-embed data-provider="spotify" data-url="https://evil.com/embed/track/4uLU6hMCjMI75M1A2tKUQC"></figure>
    <p style="background:url(javascript:alert(1))">styled</p>`;

  it('imports only safe content', () => {
    const doc = fromHTML(html, { window: host });
    const out = renderToHTML(doc);
    expectClean(out);
    expectClean(JSON.stringify(doc), urlVectors);
    expect(out).toContain('Hello');
    expect(out).toContain('styled');
    expect(out).toContain('data-provider="youtube"');
  });

  it('drops script inside SVG', () => {
    // happy-dom (unlike browsers) swallows everything after a <script> inside <svg>, so this case runs on its own.
    const doc = fromHTML('<p>a</p><svg><script>alert(1)</script><a href="javascript:alert(1)">svg</a></svg>', {
      window: host,
    });
    expectClean(renderToHTML(doc));
    expect(JSON.stringify(doc)).toContain('"text":"a"');
  });

  it('keeps the structure of editor HTML', () => {
    const tinymce = `
      <h1>Release notes</h1>
      <p style="text-align: center;"><strong>Bold</strong>, <em>italic</em> and <a href="https://example.com" target="_blank" rel="noopener">a link</a>.</p>
      <ul><li>First</li><li>Second<ul><li>Nested</li></ul></li></ul>
      <ol start="3"><li>Three</li></ol>
      <blockquote><p>Quoted</p></blockquote>
      <pre class="language-javascript"><code>const a = 1;</code></pre>
      <table border="1"><tbody><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></tbody></table>
      <p><iframe src="https://player.vimeo.com/video/76979871" width="640" height="360"></iframe></p>`;
    const doc = fromHTML(tinymce, { window: host });
    const types = JSON.stringify(doc);
    for (const type of [
      'heading',
      'bold',
      'italic',
      'link',
      'bulletList',
      'orderedList',
      'blockquote',
      'codeBlock',
      'table',
      'video',
    ]) {
      expect(types, type).toContain(`"type":"${type}"`);
    }
    expect(types).toContain('Nested');
    expect(types).toContain('"videoId":"76979871"');
  });

  it('needs a parser on the server', () => {
    expect(() => fromHTML('<p>x</p>')).toThrow(/needs an HTML parser/);
  });
});

describe('review regressions', () => {
  const staged = 'https://staged.post-canvas.invalid/k1';
  const photo = (src: string, key: string) => ({
    key,
    src,
    width: 10,
    height: 10,
    alt: '',
    srcset: null,
    placeholder: null,
    uploadId: null,
    uploadKey: null,
    place: null,
  });

  it('treats the staged-upload marker as transient', () => {
    const image = { type: 'image', attrs: { id: 'i', ...photo(staged, 'x'), caption: '', align: 'center' } };
    const gallery = {
      type: 'gallery',
      attrs: {
        id: 'g',
        layout: 'grid',
        caption: '',
        photos: [photo(staged, 'a'), photo('https://cdn.example/b.jpg', 'b')],
      },
    };
    const doc = { type: 'doc', content: [image, gallery] };
    expect(hasTransientContent(doc)).toBe(true);
    const { doc: clean, removed } = sanitizeDocument(doc);
    expect(JSON.stringify(clean)).not.toContain('staged.post-canvas.invalid');
    expect(clean.content).toHaveLength(1);
    expect((clean.content?.[0]?.attrs?.photos as unknown[]).length).toBe(1);
    expect(removed.every((item) => item.reason === 'transient')).toBe(true);
  });

  it('lists what fromHTML leaves out, and keeps h5 and h6 as h4', () => {
    const removed: string[] = [];
    const doc = fromHTML(
      '<h5>Deep</h5><img src="/relative.png"><img src="data:image/png;base64,AAAA"><iframe src="https://evil.example/x"></iframe><script>1</script><p>Text</p>',
      { window: host, onRemoved: (list) => removed.push(...list.map((item) => item.type ?? '')) },
    );
    expect(doc.content?.[0]).toMatchObject({ type: 'heading', attrs: { level: 4 } });
    expect(removed).toEqual(['script', 'img', 'img', 'iframe']);
  });

  it('marks the wrapper with the theme', () => {
    expect(renderToHTML({ type: 'doc', content: [] }, { theme: 'dark' })).toContain('data-pc-theme="dark"');
  });

  it('keeps Markdown output inert: backslash schemes, raw HTML in link text, code fences', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'x', marks: [{ type: 'link', attrs: { href: 'javascript\\:alert(1)' } }] }],
        },
        {
          type: 'file',
          attrs: { id: 'f', src: 'https://cdn.example/a.pdf', name: '<img src=x onerror=alert(1)>.pdf' },
        },
        {
          type: 'codeBlock',
          attrs: { language: null },
          content: [{ type: 'text', text: '```\n~~~~\n<img src=x onerror=1>' }],
        },
      ],
    };
    const markdown = toMarkdown(doc);
    expect(markdown).not.toMatch(/javascript\\?:/i);
    // The file name is escaped as text (`\\<img`); the `<img` left is inside the code fence, where it's only code.
    expect(markdown.split('\n').find((line) => line.includes('.pdf'))).toContain('\\<img');
    expect(markdown).toContain('````\n```\n~~~~');
  });

  it('nulls dangerous schemes in custom attributes, whitespace or not', () => {
    const Custom = Node.create({
      name: 'custom',
      group: 'block',
      atom: true,
      addAttributes: () => ({ to: { default: null } }),
      renderHTML: ({ HTMLAttributes }) => ['a', { href: HTMLAttributes.to as string }],
    });
    for (const to of ['javascript:alert(1) ', ' javascript:void(0); alert(1)', 'java\tscript:x\n']) {
      const { doc } = sanitizeDocument(
        { type: 'doc', content: [{ type: 'custom', attrs: { to } }] },
        { extensions: [...postCanvasSchema(), Custom] },
      );
      expect(doc.content?.[0]?.attrs?.to).toBeNull();
    }
    const note = sanitizeDocument(
      { type: 'doc', content: [{ type: 'custom', attrs: { to: 'Note: read this' } }] },
      { extensions: [...postCanvasSchema(), Custom] },
    );
    expect(note.doc.content?.[0]?.attrs?.to).toBe('Note: read this');
  });

  it('refuses oversized or absurdly nested HTML before parsing', () => {
    expect(() => fromHTML('<p>x</p>'.repeat(200_000), { window: host })).toThrow(RangeError);
    expect(() => fromHTML('<blockquote>'.repeat(5000), { window: host })).toThrow(RangeError);
    expect(fromHTML('<ul>' + '<li>item'.repeat(2000) + '</ul>', { window: host }).content?.[0]?.type).toBe(
      'bulletList',
    );
  });
});
