'use client';
// Clean pasting from Word, Google Docs and the web: keep the structure (headings, lists, tables, links, bold and the
// like), drop the noise (styles, classes, Office markup, scripts, handlers). Plain text keeps its paragraphs.
import { Extension } from '@tiptap/core';
import { Fragment, Slice, type Node as PmNode, type ResolvedPos, type Schema } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { safeHref } from '../core/url';
import { codeLanguagePattern } from './sanitize';

// Elements removed with everything inside them.
const dropped = new Set([
  'script',
  'style',
  'meta',
  'link',
  'title',
  'head',
  'xml',
  'noscript',
  'template',
  'iframe',
  'frame',
  'frameset',
  'object',
  'embed',
  'applet',
  'form',
  'input',
  'button',
  'select',
  'textarea',
  'svg',
  'math',
  'canvas',
  'audio',
  'video',
  'source',
  'base',
  'o:p',
]);

// Elements replaced by their children.
const unwrapped = new Set(['font', 'center', 'span', 'div', 'section', 'article', 'header', 'footer', 'main', 'aside']);

// Attributes kept per element, besides `data-*`.
const keptAttributes: Record<string, readonly string[]> = {
  a: ['href'],
  img: ['src', 'alt', 'width', 'height'],
  td: ['colspan', 'rowspan'],
  th: ['colspan', 'rowspan'],
  ol: ['start', 'type'],
};

/** True for Office, Google Docs or other namespaced elements such as `o:p`, `w:sdt` and `v:shape`. */
function isNamespaced(tag: string): boolean {
  return tag.includes(':');
}

function styleOf(element: Element): string {
  return (element.getAttribute('style') ?? '').toLowerCase().replace(/\s+/g, '');
}

/** An element's inline style declarations, by property name (lower-case, spaces removed). */
function declarations(element: Element): Map<string, string> {
  const map = new Map<string, string>();
  for (const part of styleOf(element).split(';')) {
    const colon = part.indexOf(':');
    if (colon > 0) map.set(part.slice(0, colon), part.slice(colon + 1).replace(/!important$/, ''));
  }
  return map;
}

/** Wraps an element's children in a new element. */
function wrapChildren(element: Element, tag: string): void {
  const doc = element.ownerDocument;
  const wrapper = doc.createElement(tag);
  while (element.firstChild) wrapper.appendChild(element.firstChild);
  element.appendChild(wrapper);
}

function unwrap(element: Element): void {
  const parent = element.parentNode;
  if (!parent) return;
  while (element.firstChild) parent.insertBefore(element.firstChild, element);
  parent.removeChild(element);
}

function rename(element: Element, tag: string): Element {
  const doc = element.ownerDocument;
  const next = doc.createElement(tag);
  for (const attr of Array.from(element.attributes)) next.setAttribute(attr.name, attr.value);
  while (element.firstChild) next.appendChild(element.firstChild);
  element.parentNode?.replaceChild(next, element);
  return next;
}

/** Turns inline styles that carry meaning (bold, italic, underline, strike, super and subscript) into tags. */
function semanticStyles(element: Element): void {
  const style = declarations(element);
  if (style.size === 0) return;
  const tag = element.tagName.toLowerCase();
  const weight = style.get('font-weight') ?? '';
  if ((weight === 'bold' || weight === 'bolder' || Number(weight) >= 600) && tag !== 'b' && tag !== 'strong')
    wrapChildren(element, 'strong');
  if (style.get('font-style') === 'italic' && tag !== 'i' && tag !== 'em') wrapChildren(element, 'em');
  const decoration = `${style.get('text-decoration') ?? ''} ${style.get('text-decoration-line') ?? ''}`;
  if (decoration.includes('underline') && tag !== 'u' && !element.closest('a')) wrapChildren(element, 'u');
  if (decoration.includes('line-through') && tag !== 's') wrapChildren(element, 's');
  const align = style.get('vertical-align');
  if (align === 'super') wrapChildren(element, 'sup');
  if (align === 'sub') wrapChildren(element, 'sub');
}

function isEmptyBlock(element: Element): boolean {
  if (element.querySelector('img, br, hr, table')) return false;
  return (element.textContent ?? '').replace(/[\s ​]/g, '') === '';
}

/** Word writes lists as `<p style="mso-list:l0 level1">` paragraphs with a marker span. Rebuild real lists. */
function rebuildWordLists(body: Element): void {
  const doc = body.ownerDocument;
  const paragraphs = Array.from(body.querySelectorAll('p')).filter((p) => /mso-list:/.test(styleOf(p)));
  const handled = new Set<Element>();
  for (const first of paragraphs) {
    if (handled.has(first)) continue;
    // A run of list paragraphs that sit next to each other.
    const run: Element[] = [];
    let node: Element | null = first;
    while (node && node.tagName.toLowerCase() === 'p' && /mso-list:/.test(styleOf(node))) {
      run.push(node);
      handled.add(node);
      node = node.nextElementSibling;
    }
    const stack: { list: Element; level: number }[] = [];
    const container = doc.createElement('div');
    first.parentNode?.insertBefore(container, first);
    for (const p of run) {
      const level = Number(/level(\d+)/.exec(styleOf(p))?.[1] ?? '1');
      const marker = Array.from(p.querySelectorAll('span')).find((span) => declarations(span).get('mso-list') === 'ignore');
      const markerText = (marker?.textContent ?? '').replace(/[\s ]/g, '');
      marker?.remove();
      const ordered = /^\(?[0-9a-z]{1,4}[.)]$/i.test(markerText);
      while (stack.length > 0 && stack[stack.length - 1]!.level > level) stack.pop();
      let top = stack[stack.length - 1];
      if (!top || top.level < level) {
        const list = doc.createElement(ordered ? 'ol' : 'ul');
        if (top) (top.list.lastElementChild ?? top.list).appendChild(list);
        else container.appendChild(list);
        top = { list, level };
        stack.push(top);
      }
      const item = doc.createElement('li');
      const content = doc.createElement('p');
      while (p.firstChild) content.appendChild(p.firstChild);
      item.appendChild(content);
      top.list.appendChild(item);
      p.remove();
    }
    unwrap(container);
  }
}

function cleanElement(element: Element): void {
  const tag = element.tagName.toLowerCase();
  const kept = keptAttributes[tag] ?? [];
  for (const attr of Array.from(element.attributes)) {
    const name = attr.name.toLowerCase();
    const keepData = name.startsWith('data-') && !name.startsWith('data-pm-');
    const keepLanguage =
      name === 'class' &&
      (tag === 'code' || tag === 'pre') &&
      /^language-/.test(attr.value) &&
      codeLanguagePattern.test(attr.value.slice('language-'.length));
    if (!kept.includes(name) && !keepData && !keepLanguage) element.removeAttribute(attr.name);
  }
  if (tag === 'a') {
    const href = safeHref(element.getAttribute('href'));
    if (href) element.setAttribute('href', href);
    else element.removeAttribute('href');
  }
}

function walk(node: Node, visit: (element: Element) => void): void {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === 8) {
      child.parentNode?.removeChild(child); // comments, conditional comments included
    } else if (child.nodeType === 1) {
      walk(child, visit);
      visit(child as Element);
    }
  }
}

/**
 * Cleans HTML pasted from Word, Google Docs or a web page. Keeps headings, paragraphs, lists, tables, links, quotes,
 * code and inline formatting; removes styles, classes, ids, event handlers, scripts, Office markup and comments. HTML
 * copied from a Post Canvas editor (ProseMirror's own clipboard) keeps its data attributes, so mentions, task lists
 * and media survive a copy within the editor.
 *
 * Needs a DOM (`DOMParser`); on the server, use `fromHTML` from `post-canvas/server` instead.
 */
export function cleanPastedHTML(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const body = doc.body;
  if (!body) return '';

  // Google Docs wraps everything in a <b style="font-weight:normal" id="docs-internal-guid-…">.
  for (const wrapper of Array.from(body.querySelectorAll('b, strong'))) {
    const weight = declarations(wrapper).get('font-weight');
    if (weight === 'normal' || weight === '400') unwrap(wrapper);
  }
  rebuildWordLists(body);

  // Word's title styles become headings.
  for (const p of Array.from(body.querySelectorAll('p'))) {
    const cls = p.getAttribute('class') ?? '';
    if (/MsoTitle\b/.test(cls)) rename(p, 'h1');
    else if (/MsoSubtitle\b/.test(cls)) rename(p, 'h2');
  }

  walk(body, (element) => {
    const tag = element.tagName.toLowerCase();
    if (dropped.has(tag) || tag.startsWith('v:')) {
      element.remove();
      return;
    }
    semanticStyles(element);
    cleanElement(element);
    if (tag === 'a' && !element.hasAttribute('href')) {
      unwrap(element);
    } else if (unwrapped.has(tag) || isNamespaced(tag)) {
      unwrap(element);
    } else if (tag === 'h5' || tag === 'h6') {
      rename(element, 'h4');
    } else if (tag === 'p' && isEmptyBlock(element) && element.parentElement === body) {
      element.remove();
    } else if (tag === 'br' && /apple-interchange-newline/i.test(element.getAttribute('class') ?? '')) {
      element.remove();
    }
  });

  // Inline wrappers left empty by the cleanup.
  for (const element of Array.from(body.querySelectorAll('strong, em, b, i, u, s, sup, sub'))) {
    if ((element.textContent ?? '') === '' && !element.querySelector('img, br')) element.remove();
  }
  return body.innerHTML;
}

/**
 * Turns pasted plain text into paragraphs: a blank line starts a new paragraph, and a single line break becomes a
 * hard break. Inside a code block the text stays as it is.
 */
export function plainTextSlice(text: string, schema: Schema, $context: ResolvedPos): Slice {
  const normalized = text.replace(/\r\n?/g, '\n');
  if ($context.parent.type.spec.code) return new Slice(Fragment.from(schema.text(normalized)), 0, 0);
  const paragraphType = schema.nodes.paragraph!;
  const hardBreak = schema.nodes.hardBreak;
  const blocks = normalized
    .split(/\n[ \t]*\n+/)
    .map((block) => block.replace(/^\n+|\n+$/g, ''))
    .filter((block) => block.trim() !== '')
    .map((block) => {
      const lines = block.split('\n');
      const content: PmNode[] = [];
      lines.forEach((line, index) => {
        if (index > 0) content.push(hardBreak ? hardBreak.create() : schema.text(' '));
        if (line) content.push(schema.text(line));
      });
      return paragraphType.create(null, content);
    });
  if (blocks.length === 0) return Slice.empty;
  if (blocks.length === 1) return new Slice(blocks[0]!.content, 0, 0);
  return new Slice(Fragment.from(blocks), 1, 1);
}

/** Cleans pasted HTML and splits pasted plain text into paragraphs. */
export const PasteCleanup = Extension.create({
  name: 'postCanvasPaste',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('postCanvasPaste'),
        props: {
          transformPastedHTML: (html) => (/data-pm-slice/.test(html) ? cleanOwnHTML(html) : cleanPastedHTML(html)),
          clipboardTextParser: (text, $context) => plainTextSlice(text, this.editor.schema, $context),
        },
      }),
    ];
  },
});

/** HTML from ProseMirror's own clipboard: only scripts, handlers and styles go. */
function cleanOwnHTML(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  walk(doc.body, (element) => {
    const tag = element.tagName.toLowerCase();
    if (dropped.has(tag) && tag !== 'o:p') {
      element.remove();
      return;
    }
    for (const attr of Array.from(element.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on') || name === 'style' || name === 'srcdoc' || name === 'formaction')
        element.removeAttribute(attr.name);
    }
    if (tag === 'a') {
      const href = safeHref(element.getAttribute('href'));
      if (href) element.setAttribute('href', href);
      else element.removeAttribute('href');
    }
  });
  return doc.body.innerHTML;
}
