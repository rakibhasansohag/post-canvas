// The render-safe text schema: node and mark names, attributes, parseHTML, renderHTML and sanitizers. No React, no DOM
// access at import time and no node views, so it runs on the server. `text/kit.ts` extends these for the editor.
import { mergeAttributes, type AnyExtension } from '@tiptap/core';
import Blockquote from '@tiptap/extension-blockquote';
import Bold from '@tiptap/extension-bold';
import Code from '@tiptap/extension-code';
import CodeBlock from '@tiptap/extension-code-block';
import Document from '@tiptap/extension-document';
import HardBreak from '@tiptap/extension-hard-break';
import Heading from '@tiptap/extension-heading';
import Highlight, { type HighlightOptions } from '@tiptap/extension-highlight';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Italic from '@tiptap/extension-italic';
import Link, { type LinkOptions } from '@tiptap/extension-link';
import { BulletList, ListItem, OrderedList, TaskItem, TaskList } from '@tiptap/extension-list';
import Mention from '@tiptap/extension-mention';
import Paragraph from '@tiptap/extension-paragraph';
import Strike from '@tiptap/extension-strike';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import Text from '@tiptap/extension-text';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { safeHref } from '../core/url';
import type { Features } from '../core/types';
import {
  codeLanguage,
  linkRel,
  paletteColor,
  sanitizeCodeBlock,
  sanitizeHeading,
  sanitizeHighlight,
  sanitizeLink,
  sanitizeMention,
  sanitizeOrderedList,
  sanitizeParagraph,
  sanitizeTableCell,
  sanitizeTaskItem,
  sanitizeTextStyle,
} from './sanitize';
import '../core/extension-fields';

/** `paragraph`, with its sanitizer. */
export const PcParagraph = Paragraph.extend({ postCanvasSanitize: sanitizeParagraph });

/** `heading`, levels 1 to 4. */
export const PcHeading = Heading.extend({ postCanvasSanitize: sanitizeHeading });

/** `orderedList`, with a sanitized `start`. */
export const PcOrderedList = OrderedList.extend({ postCanvasSanitize: sanitizeOrderedList });

/** `taskItem`, with a boolean `checked`. Items can nest. */
export const PcTaskItem = TaskItem.extend({ postCanvasSanitize: sanitizeTaskItem }).configure({ nested: true });

/** `tableCell`, with sanitized spans and widths. */
export const PcTableCell = TableCell.extend({ postCanvasSanitize: sanitizeTableCell });

/** `tableHeader`, with sanitized spans and widths. */
export const PcTableHeader = TableHeader.extend({ postCanvasSanitize: sanitizeTableCell });

/** `codeBlock`: the language comes from `class="language-…"` and must match the language pattern. */
export const PcCodeBlock = CodeBlock.extend({
  addAttributes() {
    return {
      language: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const code = element.querySelector('code') ?? element;
          const named = Array.from(code.classList).find((name) => name.startsWith('language-'));
          return codeLanguage(named ? named.slice('language-'.length) : element.getAttribute('data-language'));
        },
        rendered: false,
      },
    };
  },
  postCanvasSanitize: sanitizeCodeBlock,
});

/**
 * `link`: `href` must pass `safeHref`, `target` is `_blank` or nothing, and `rel` always carries `noopener` with
 * `_blank`. Nothing is clickable in the editor.
 */
export const PcLink = Link.extend({
  addOptions() {
    return {
      ...(this.parent?.() as LinkOptions),
      openOnClick: false,
      autolink: false,
      linkOnPaste: false,
      enableClickSelection: false,
      defaultProtocol: 'https',
      HTMLAttributes: {},
      isAllowedUri: (url: string) => safeHref(url) !== null,
    };
  },
  addAttributes() {
    return {
      href: { default: null, parseHTML: (element: HTMLElement) => safeHref(element.getAttribute('href')) },
      target: {
        default: null,
        parseHTML: (element: HTMLElement) => (element.getAttribute('target') === '_blank' ? '_blank' : null),
      },
      rel: { default: null, parseHTML: (element: HTMLElement) => element.getAttribute('rel') },
    };
  },
  renderHTML({ HTMLAttributes }) {
    const target = HTMLAttributes.target === '_blank' ? '_blank' : null;
    return [
      'a',
      {
        href: safeHref(HTMLAttributes.href) ?? '',
        target,
        rel: linkRel(HTMLAttributes.rel, target),
      },
      0,
    ];
  },
  postCanvasSanitize: sanitizeLink,
});

/** `textStyle`, carrying a palette colour by name. */
export const PcTextStyle = TextStyle.extend({
  parseHTML() {
    return [
      {
        tag: 'span[data-color]',
        getAttrs: (element: HTMLElement) => (paletteColor(element.getAttribute('data-color')) ? {} : false),
      },
    ];
  },
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element: HTMLElement) => paletteColor(element.getAttribute('data-color')),
        renderHTML: (attrs: { color?: unknown }) => {
          const color = paletteColor(attrs.color);
          return color ? { 'data-color': color, class: `pc-color-${color}` } : {};
        },
      },
    };
  },
  postCanvasSanitize: sanitizeTextStyle,
});

/** `highlight`, in a palette colour or the default. */
export const PcHighlight = Highlight.extend({
  addOptions() {
    return { ...(this.parent?.() as HighlightOptions), multicolor: true, HTMLAttributes: {} };
  },
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element: HTMLElement) => paletteColor(element.getAttribute('data-color')),
        renderHTML: (attrs: { color?: unknown }) => {
          const color = paletteColor(attrs.color);
          return color ? { 'data-color': color, class: `pc-highlight-${color}` } : {};
        },
      },
    };
  },
  postCanvasSanitize: sanitizeHighlight,
});

/** The text a mention shows: `@Ada Lovelace` or `#design`. */
export function mentionText(attrs: Record<string, unknown>): string {
  const char = attrs.mentionSuggestionChar === '#' ? '#' : '@';
  const label = typeof attrs.label === 'string' && attrs.label ? attrs.label : String(attrs.id ?? '');
  return `${char}${label}`;
}

/** `mention`: people with `@` and hashtags with `#`. The schema version never opens a suggestion list. */
export const PcMention = Mention.extend({
  postCanvasSanitize: sanitizeMention,
}).configure({
  suggestion: { allow: () => false },
  renderText: ({ node }) => mentionText(node.attrs),
  renderHTML: ({ options, node }) => [
    'span',
    mergeAttributes(options.HTMLAttributes, {
      class: node.attrs.mentionSuggestionChar === '#' ? 'pc-hashtag' : 'pc-mention',
    }),
    mentionText(node.attrs),
  ],
});

/** Options shared by the schema and the editor kit. */
export interface TextExtensionParts {
  link: AnyExtension;
  table: AnyExtension;
  mention: AnyExtension;
  codeBlock: AnyExtension;
}

/**
 * Every text extension for a feature set, in schema order. `parts` swaps in editor versions of the few extensions that
 * differ (the kit passes autolinking links, resizable tables, suggesting mentions and highlighted code).
 */
export function textExtensions(features: Features, parts?: Partial<TextExtensionParts>): AnyExtension[] {
  const list: AnyExtension[] = [Document, Text, PcParagraph, HardBreak];
  if (features.heading) list.push(PcHeading.configure({ levels: features.heading.levels }));
  if (features.bold) list.push(Bold);
  if (features.italic) list.push(Italic);
  if (features.underline) list.push(Underline);
  if (features.strike) list.push(Strike);
  if (features.code) list.push(Code);
  if (features.subscript) list.push(Subscript);
  if (features.superscript) list.push(Superscript);
  if (features.link) list.push(parts?.link ?? PcLink);
  if (features.color) list.push(PcTextStyle);
  if (features.highlight) list.push(PcHighlight);
  if (features.textAlign) {
    list.push(
      TextAlign.configure({
        types: features.heading ? ['heading', 'paragraph'] : ['paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
        defaultAlignment: null,
      }),
    );
  }
  if (features.blockquote) list.push(Blockquote);
  if (features.horizontalRule) list.push(HorizontalRule);
  if (features.bulletList || features.orderedList) list.push(ListItem);
  if (features.bulletList) list.push(BulletList);
  if (features.orderedList) list.push(PcOrderedList);
  if (features.taskList) list.push(TaskList, PcTaskItem);
  if (features.codeBlock) list.push(parts?.codeBlock ?? PcCodeBlock);
  if (features.table) {
    list.push(parts?.table ?? Table.configure({ resizable: false }), TableRow, PcTableHeader, PcTableCell);
  }
  if (features.mention || features.hashtag) list.push(parts?.mention ?? PcMention);
  return list;
}

/** The render-safe text extensions for a feature set. */
export function textSchema(features: Features): AnyExtension[] {
  return textExtensions(features);
}
