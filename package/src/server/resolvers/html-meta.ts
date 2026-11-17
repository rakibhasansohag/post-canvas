// Reads a page's preview tags (OpenGraph, Twitter and the basic ones) from raw HTML without a DOM. Every scan is
// linear in the input, so a hostile page can't make it slow: tags are found with patterns that stop at the next `<`,
// and attributes are read by a small hand-written scanner instead of a backtracking pattern.

/** The preview tags of one page. */
export interface HtmlMeta {
  /**
   * `<meta>` values by their lower-cased `property`, `name` or `itemprop`, such as `og:title` or `description`. The
   * first tag with a key wins. Values are entity-decoded and trimmed.
   */
  meta: Map<string, string>;
  /** The `<title>` text, entity-decoded and trimmed, or `null`. */
  title: string | null;
  /** The `href` of every `<link rel="icon">`, then every `apple-touch-icon`, in page order, entity-decoded. */
  icons: string[];
}

const namedEntities: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  laquo: '«',
  raquo: '»',
  bull: '•',
  middot: '·',
  copy: '©',
  reg: '®',
  trade: '™',
};

/**
 * Decodes HTML character references once: numeric ones (`&#39;`, `&#x27;`) and the common named ones. Unknown names
 * are left as they are; null, surrogate and out-of-range code points become U+FFFD.
 */
export function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]{1,8}|#\d{1,10}|[a-z][a-z0-9]{1,31});/gi, (match, body: string) => {
    if (body.startsWith('#')) {
      const hex = body[1] === 'x' || body[1] === 'X';
      const code = hex ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return '�';
      return String.fromCodePoint(code);
    }
    return namedEntities[body.toLowerCase()] ?? match;
  });
}

// C0 controls and DEL, which have no place in a title or description.
// eslint-disable-next-line no-control-regex
const controls = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

/**
 * Turns an untrusted value into display text: non-strings become `''`, control characters are removed, runs of
 * whitespace collapse to one space, and text longer than `max` is cut at a word boundary with an ellipsis (the result
 * is never longer than `max`).
 */
export function cleanText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  const text = value.replace(controls, '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  let cut = text.slice(0, max);
  const space = cut.lastIndexOf(' ');
  cut = space > max * 0.6 ? cut.slice(0, space) : cut.slice(0, max - 1);
  // Don't leave half of a surrogate pair at the end.
  const last = cut.charCodeAt(cut.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}

function isSpace(code: number): boolean {
  return code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0c || code === 0x0d;
}

/** Reads a tag's attributes, after its name. Names are lower-cased; the first of a repeated name wins. */
function parseAttributes(source: string): Map<string, string> {
  const attributes = new Map<string, string>();
  const length = source.length;
  let index = 0;
  while (index < length) {
    const start = index;
    while (index < length && (isSpace(source.charCodeAt(index)) || source[index] === '/')) index++;
    const nameStart = index;
    while (index < length && !isSpace(source.charCodeAt(index)) && !'/>='.includes(source[index] ?? '')) index++;
    const name = source.slice(nameStart, index).toLowerCase();
    while (index < length && isSpace(source.charCodeAt(index))) index++;
    let value = '';
    if (source[index] === '=') {
      index++;
      while (index < length && isSpace(source.charCodeAt(index))) index++;
      const quote = source[index];
      if (quote === '"' || quote === "'") {
        const end = source.indexOf(quote, index + 1);
        const stop = end === -1 ? length : end;
        value = source.slice(index + 1, stop);
        index = stop + 1;
      } else {
        const valueStart = index;
        while (index < length && !isSpace(source.charCodeAt(index)) && source[index] !== '>') index++;
        value = source.slice(valueStart, index);
      }
    }
    if (name && !attributes.has(name)) attributes.set(name, value);
    if (index === start) index++;
  }
  return attributes;
}

// Blocks whose contents are never preview tags. Each opening is matched once and its end searched for once, from that
// point on, so the scan stays linear even when a block is never closed.
const blockStart = /<!--|<(script|style|template|svg|textarea)\b/gi;

function stripBlocks(html: string): string {
  let out = '';
  let from = 0;
  blockStart.lastIndex = 0;
  for (let match = blockStart.exec(html); match; match = blockStart.exec(html)) {
    out += html.slice(from, match.index);
    const end = match[1] ? new RegExp(`</${match[1]}\\s*>`, 'gi') : /-->/g;
    end.lastIndex = match.index + match[0].length;
    const closed = end.exec(html);
    if (!closed) return out;
    from = closed.index + closed[0].length;
    blockStart.lastIndex = from;
  }
  return out + html.slice(from);
}

/**
 * Reads the `<meta>` tags, the `<title>` and the icon links from an HTML string. Comments, scripts, styles, templates,
 * SVG and textareas are skipped. Pure and DOM-free.
 */
export function readHtmlMeta(html: string): HtmlMeta {
  const source = stripBlocks(html);
  const meta = new Map<string, string>();
  const icons: string[] = [];
  const touchIcons: string[] = [];
  for (const match of source.matchAll(/<(meta|link)\b((?:[^<>"']|"[^"]*"|'[^']*')*)>/gi)) {
    const attributes = parseAttributes(match[2] ?? '');
    if (match[1]?.toLowerCase() === 'meta') {
      const content = attributes.get('content');
      if (content === undefined) continue;
      const value = decodeEntities(content).trim();
      for (const keyName of ['property', 'name', 'itemprop']) {
        const key = attributes.get(keyName)?.trim().toLowerCase();
        if (key && !meta.has(key)) meta.set(key, value);
      }
      continue;
    }
    const href = attributes.get('href');
    if (!href) continue;
    const rel = (attributes.get('rel') ?? '').toLowerCase().split(/\s+/);
    if (rel.includes('icon')) icons.push(decodeEntities(href).trim());
    else if (rel.includes('apple-touch-icon')) touchIcons.push(decodeEntities(href).trim());
  }
  let title: string | null = null;
  const open = /<title\b[^<>]*>/i.exec(source);
  if (open) {
    const textStart = open.index + open[0].length;
    const close = /<\/title\s*>/gi;
    close.lastIndex = textStart;
    const end = close.exec(source);
    if (end) title = decodeEntities(source.slice(textStart, end.index)).trim();
  }
  return { meta, title, icons: [...icons, ...touchIcons] };
}
