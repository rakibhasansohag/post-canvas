// The server half of link cards: fetches a pasted page safely and reads its preview tags. Every hop is checked by the
// SSRF guard, and on Node the connection is pinned to the address that was checked. Node-only modules load lazily, so
// importing this file is safe on edge runtimes (inject `fetch` and `lookup` there).
import type * as Undici from 'undici';
import { safeHttpUrl, safeMediaSrc } from '../../core/url';
import type { LinkPreview, LinkPreviewResolver } from '../../core/types';
import { cleanText, readHtmlMeta } from './html-meta';
import {
  checkUrl,
  createPinnedLookup,
  LinkPreviewError,
  resolveHost,
  type LookupFunction,
  type ResolvedAddress,
} from './ssrf';

/** A `fetch` the resolvers can call: the global one, undici's, or a test stub. */
export type ResolverFetch = (input: string, init: RequestInit) => Promise<Response>;

/** Options for {@link createLinkPreviewResolver}. */
export interface LinkPreviewResolverOptions {
  /** The whole lookup's deadline, across every redirect, in milliseconds. Default `5000`. */
  timeoutMs?: number;
  /** The most bytes of a page that are read. A longer page is cut there and its start is still parsed. Default 1 MB. */
  maxBytes?: number;
  /** The most redirects that are followed. Default `3`. */
  maxRedirects?: number;
  /** Ports a link may name. Default `[80, 443]`. */
  allowPorts?: readonly number[];
  /** The `user-agent` header sent with every request. */
  userAgent?: string;
  /**
   * A `fetch` to use instead of undici's. It receives `redirect: 'manual'`; the resolver follows redirects itself.
   * **An injected `fetch` is not safe against DNS rebinding:** it resolves the name again when it connects, so a host
   * that answers the check with a public address and the connection with a private one gets through. Inject one only
   * in tests or behind an egress proxy that blocks private networks itself.
   */
  fetch?: ResolverFetch;
  /** Resolves host names. Default `lookup` from `node:dns/promises`. */
  lookup?: LookupFunction;
}

const redirectStatuses = new Set([301, 302, 303, 307, 308]);
const htmlTypes = new Set(['text/html', 'application/xhtml+xml']);

interface Sent {
  response: Response;
  close: () => Promise<void>;
}

let nodeLookup: Promise<LookupFunction> | undefined;

function defaultLookup(): Promise<LookupFunction> {
  nodeLookup ??= import('node:dns/promises').then(
    (dns): LookupFunction =>
      (hostname, options) =>
        dns.lookup(hostname, options),
  );
  return nodeLookup.catch(() => {
    nodeLookup = undefined;
    throw new LinkPreviewError('unavailable', 'No DNS lookup is available here. Pass `lookup` and `fetch`.');
  });
}

async function loadUndici(): Promise<typeof Undici> {
  try {
    return await import('undici');
  } catch {
    throw new LinkPreviewError('unavailable', 'undici could not be loaded. Pass `fetch` on this runtime.');
  }
}

/** Rejects as soon as the signal aborts, for steps that don't take a signal themselves. */
function untilAborted<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason as Error);
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason as Error);
    signal.addEventListener('abort', onAbort, { once: true });
    void promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
  });
}

function cancelBody(response: Response): void {
  response.body?.cancel().catch(() => undefined);
}

/** Reads at most `maxBytes` of a body, then cancels the rest. */
export async function readHead(body: ReadableStream<Uint8Array> | null, maxBytes: number): Promise<Uint8Array> {
  if (!body) return new Uint8Array(0);
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (total < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      const room = maxBytes - total;
      const chunk = value.byteLength > room ? value.subarray(0, room) : value;
      chunks.push(chunk);
      total += chunk.byteLength;
    }
  } finally {
    reader.cancel().catch(() => undefined);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function decodeBody(bytes: Uint8Array, contentType: string): string {
  const charset = /;\s*charset\s*=\s*"?([\w.:-]{1,40})"?/i.exec(contentType)?.[1];
  if (charset) {
    try {
      return new TextDecoder(charset).decode(bytes);
    } catch {
      // An unknown charset falls back to UTF-8.
    }
  }
  return new TextDecoder('utf-8').decode(bytes);
}

/** Resolves a page-relative URL against the page and keeps it only when it's a safe http(s) image URL. */
function mediaUrl(value: string | undefined | null, base: URL): string | null {
  if (!value || value.length > 2048) return null;
  try {
    return safeMediaSrc(new URL(value, base).href);
  } catch {
    return null;
  }
}

function bareHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, '');
}

/** The page's own `og:url` when it stays on the same site, otherwise the URL that was fetched. */
function previewUrl(ogUrl: string | undefined, final: URL): string {
  if (ogUrl && ogUrl.length <= 2048) {
    try {
      const candidate = new URL(ogUrl, final);
      const safe = safeHttpUrl(candidate.href);
      const a = bareHost(candidate.hostname);
      const b = bareHost(final.hostname);
      const sameSite = a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`);
      if (safe && sameSite && !candidate.username && !candidate.password) return safe;
    } catch {
      // Fall through to the fetched URL.
    }
  }
  return safeHttpUrl(final.href) ?? final.href;
}

function firstText(values: (string | null | undefined)[], max: number): string {
  for (const value of values) {
    const text = cleanText(value, max);
    if (text) return text;
  }
  return '';
}

/** Builds a preview from a page's HTML and the URL it was finally served from. */
function buildPreview(html: string, final: URL): LinkPreview {
  const { meta, title, icons } = readHtmlMeta(html);
  const host = bareHost(final.hostname);
  const preview: LinkPreview = {
    url: previewUrl(meta.get('og:url'), final),
    title: firstText([meta.get('og:title'), meta.get('twitter:title'), title], 200) || host,
  };
  const description = firstText(
    [meta.get('og:description'), meta.get('twitter:description'), meta.get('description')],
    500,
  );
  if (description) preview.description = description;
  for (const key of ['og:image:secure_url', 'og:image', 'og:image:url', 'twitter:image', 'twitter:image:src']) {
    const image = mediaUrl(meta.get(key), final);
    if (image) {
      preview.image = image;
      break;
    }
  }
  preview.siteName = cleanText(meta.get('og:site_name'), 100) || host;
  let favicon: string | null = null;
  for (const icon of icons) {
    favicon = mediaUrl(icon, final);
    if (favicon) break;
  }
  favicon ??= safeMediaSrc(`${final.origin}/favicon.ico`);
  if (favicon) preview.favicon = favicon;
  return preview;
}

/**
 * Creates a {@link LinkPreviewResolver} for the server: pass it to your link-preview endpoint. It fetches the page with
 * every SSRF check in place (http and https only, allowed ports only, no user names, every resolved address public,
 * the connection pinned to a checked address, every redirect checked again), reads at most `maxBytes` of HTML and
 * returns its title, description, image, site name and icon. Failures throw a {@link LinkPreviewError}; an abort from
 * the caller's signal is rethrown as it is.
 *
 * @example
 * ```ts
 * const resolveLink = createLinkPreviewResolver();
 * app.post('/api/link-preview', async (req, res) => {
 *   res.json(await resolveLink(req.body.url, { signal: AbortSignal.timeout(8000) }));
 * });
 * ```
 */
export function createLinkPreviewResolver(options: LinkPreviewResolverOptions = {}): LinkPreviewResolver {
  const {
    timeoutMs = 5000,
    maxBytes = 1_000_000,
    maxRedirects = 3,
    allowPorts = [80, 443],
    userAgent = 'post-canvas-link-preview (+https://github.com/saimulft/post-canvas)',
  } = options;
  const injectedFetch = options.fetch;
  const injectedLookup = options.lookup;

  async function send(url: URL, pinned: ResolvedAddress, signal: AbortSignal): Promise<Sent> {
    const init: RequestInit = {
      method: 'GET',
      redirect: 'manual',
      signal,
      headers: { accept: 'text/html,application/xhtml+xml', 'user-agent': userAgent },
    };
    if (injectedFetch) {
      return { response: await injectedFetch(url.href, init), close: () => Promise.resolve() };
    }
    const undici = await loadUndici();
    const agent: Undici.Agent = new undici.Agent({ connect: { lookup: createPinnedLookup(pinned) } });
    const close = () => agent.destroy().catch(() => undefined);
    try {
      const response = await undici.fetch(url.href, { ...init, dispatcher: agent } as Undici.RequestInit);
      return { response: response as unknown as Response, close };
    } catch (error) {
      await close();
      throw error;
    }
  }

  async function run(input: string, signal: AbortSignal): Promise<LinkPreview> {
    const lookup = injectedLookup ?? (await defaultLookup());
    let current = checkUrl(input, { allowPorts });
    for (let redirects = 0; ; redirects++) {
      const pinned = await untilAborted(resolveHost(current.hostname, lookup), signal);
      const { response, close } = await send(current, pinned, signal);
      try {
        const location = response.headers.get('location');
        if (redirectStatuses.has(response.status) && location) {
          cancelBody(response);
          if (redirects >= maxRedirects) {
            throw new LinkPreviewError('too_many_redirects', `The link redirected more than ${maxRedirects} times.`);
          }
          let next: string;
          try {
            next = new URL(location, current).href;
          } catch {
            throw new LinkPreviewError('invalid_url', 'The link redirected to an invalid URL.');
          }
          current = checkUrl(next, { allowPorts });
          continue;
        }
        if (!response.ok) {
          cancelBody(response);
          throw new LinkPreviewError('http_error', `The page answered ${response.status}.`, response.status);
        }
        const contentType = response.headers.get('content-type') ?? '';
        const mediaType = contentType.split(';')[0]?.trim().toLowerCase() ?? '';
        if (!htmlTypes.has(mediaType)) {
          cancelBody(response);
          throw new LinkPreviewError('not_html', 'The link is not an HTML page.');
        }
        const bytes = await readHead(response.body, maxBytes);
        return buildPreview(decodeBody(bytes, contentType), current);
      } finally {
        await close();
      }
    }
  }

  return async (url, ctx) => {
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = AbortSignal.any([ctx.signal, timeout]);
    try {
      return await run(url, signal);
    } catch (error) {
      if (ctx.signal.aborted) throw ctx.signal.reason ?? error;
      if (error instanceof LinkPreviewError) throw error;
      if (timeout.aborted) throw new LinkPreviewError('timeout', `The page didn't answer within ${timeoutMs} ms.`);
      throw new LinkPreviewError('unavailable', 'The page could not be reached.');
    }
  };
}
