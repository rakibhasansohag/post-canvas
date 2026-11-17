// URL safety for every node and mark that stores a URL. Use these in parseHTML, in commands and in postCanvasSanitize.

const allowedHrefSchemes = new Set(['http', 'https', 'mailto', 'tel']);

// C0 control characters and DEL. Browsers drop tabs and newlines anywhere in a URL ("java\tscript:" still runs).
// eslint-disable-next-line no-control-regex
const controls = /[\u0000-\u001f\u007f]/g;

// Controls plus every kind of space, removed only to find the scheme a browser could see.
// eslint-disable-next-line no-control-regex
const invisible = /[\u0000-\u0020\u007f-\u00a0\u1680\u180e\u2000-\u200f\u2028\u2029\u202f\u205f\u3000\ufeff]/g;

const namedEntities: Record<string, string> = {
  colon: ':',
  tab: '\t',
  newline: '\n',
  sol: '/',
  amp: '&',
  lpar: '(',
  rpar: ')',
  nbsp: ' ',
};

/** Decodes numeric and the few named HTML entities that can hide a scheme. Runs until nothing changes. */
function decodeEntities(value: string): string {
  let current = value;
  for (let pass = 0; pass < 5; pass++) {
    const next = current.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);?/gi, (match, body: string) => {
      if (body.startsWith('#')) {
        const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
        return Number.isFinite(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
      }
      return namedEntities[body.toLowerCase()] ?? match;
    });
    if (next === current) break;
    current = next;
  }
  return current;
}

/** Decodes percent-escapes, leaving malformed ones alone. Runs until nothing changes. */
function decodePercent(value: string): string {
  let current = value;
  for (let pass = 0; pass < 5; pass++) {
    const next = current.replace(/(?:%[0-9a-f]{2})+/gi, (match) => {
      try {
        return decodeURIComponent(match);
      } catch {
        return match;
      }
    });
    if (next === current) break;
    current = next;
  }
  return current;
}

/** The scheme a browser would see, lower-cased, or `null` for a relative URL. */
function schemeOf(value: string): string | null {
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(value);
  return match?.[1]?.toLowerCase() ?? null;
}

interface Inspected {
  /** The trimmed input, with control characters removed. */
  clean: string;
  /** Every scheme the value could resolve to, raw and decoded. */
  schemes: Set<string | null>;
  /** Starts with two slashes or backslashes: another host, relative to the page's protocol. */
  protocolRelative: boolean;
}

function inspect(url: unknown): Inspected | null {
  if (typeof url !== 'string') return null;
  const clean = url.replace(controls, '').trim();
  if (!clean) return null;
  const forms = [clean, decodeEntities(clean), decodePercent(clean), decodePercent(decodeEntities(clean))].map((form) =>
    form.replace(invisible, ''),
  );
  return {
    clean,
    schemes: new Set(forms.map(schemeOf)),
    protocolRelative: forms.some((form) => /^[/\\]{2}/.test(form)),
  };
}

/**
 * Returns a URL that is safe to put in a link's `href`, or `null`. Allows http, https, mailto, tel and relative URLs
 * (paths, `?query` and `#hash`). Blocks every other scheme (`javascript:`, `vbscript:`, `data:`, `file:` and the rest),
 * also when it hides behind whitespace, control characters, mixed case, HTML entities or percent-encoding, and blocks
 * protocol-relative URLs such as `//example.com`.
 */
export function safeHref(url: unknown): string | null {
  const found = inspect(url);
  if (!found || found.protocolRelative) return null;
  for (const scheme of found.schemes) {
    if (scheme !== null && !allowedHrefSchemes.has(scheme)) return null;
  }
  return found.clean;
}

/**
 * Returns an absolute http or https URL, normalised, or `null`. Use it for anything the app's server will fetch or a
 * reader's browser will load from another site.
 */
export function safeHttpUrl(url: unknown): string | null {
  const found = inspect(url);
  if (!found || found.protocolRelative) return null;
  for (const scheme of found.schemes) {
    if (scheme !== 'http' && scheme !== 'https') return null;
  }
  try {
    const parsed = new URL(found.clean);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
}

/**
 * Returns a URL that is safe as an image or media `src`, or `null`: absolute http or https only. Pass
 * `{ allowBlob: true }` in the editor to accept a `blob:` URL while an upload runs; saved documents never keep one.
 */
export function safeMediaSrc(url: unknown, options: { allowBlob?: boolean } = {}): string | null {
  if (options.allowBlob && typeof url === 'string') {
    const clean = url.replace(controls, '').trim();
    if (/^blob:https?:\/\/[^\s]+$/i.test(clean)) return clean;
  }
  return safeHttpUrl(url);
}
