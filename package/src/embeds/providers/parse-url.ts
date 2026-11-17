// The one place a pasted link becomes a `URL` for the provider matchers. Every check that doesn't depend on the provider
// happens here, so a custom provider can't forget one.

const maxLength = 2048;

// C0 controls, DEL and every kind of space. A link with any of them inside is not a plain pasted link.
// eslint-disable-next-line no-control-regex
const forbidden = /[\u0000-\u0020\u007f-\u00a0\u1680\u180e\u2000-\u200f\u2028\u2029\u202f\u205f\u3000\ufeff]/;

/**
 * Parses a pasted link for embedding, or returns `null`. Accepts a bare `example.com/path` by assuming https. Refuses
 * anything that isn't http or https, carries a user name or password (`https://youtube.com@evil.com`), names a port,
 * holds whitespace or control characters, or is longer than 2048 characters. The returned URL's host is lower-case and
 * has no trailing dot.
 */
export function parseEmbedUrl(input: unknown): URL | null {
  if (typeof input !== 'string') return null;
  const raw = input.trim();
  if (!raw || raw.length > maxLength || forbidden.test(raw)) return null;
  // A scheme is letters then a colon. "youtube.com:443/…" isn't one, but a host with a port is refused below anyway.
  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(raw);
  if (hasScheme && !/^https?:\/\//i.test(raw)) return null;
  let url: URL;
  try {
    url = new URL(hasScheme ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  if (!host || host.endsWith('.')) return null;
  return url;
}

/** The non-empty path segments of a URL, decoded only where that is safe. */
export function pathParts(url: URL): string[] {
  return url.pathname.split('/').filter(Boolean);
}

/** True when `value` is a string that fully matches `pattern`. */
export function fits(value: unknown, pattern: RegExp): value is string {
  return typeof value === 'string' && pattern.test(value);
}
