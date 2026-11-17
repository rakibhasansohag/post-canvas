// HTML in: any HTML (from TinyMCE, Froala, CKEditor, Word or our own output) parsed through the schema's parse rules,
// then sanitized. It needs an HTML parser: the browser's own, or a server-side window such as happy-dom's.
import type { JSONContent } from '@tiptap/core';
import { DOMParser as SchemaParser } from '@tiptap/pm/model';
import type { Features } from '../core/types';
import { sanitizeDocument, sanitizerSetup, type DocumentLimits } from './sanitize';

/** Anything that can parse an HTML string into a document: a browser `window`, or a happy-dom or linkedom window. */
export interface HTMLParserHost {
  DOMParser: new () => { parseFromString(html: string, type: 'text/html'): Document };
}

/** Options of `fromHTML()`. */
export interface FromHTMLOptions {
  features?: Features;
  limits?: Partial<DocumentLimits>;
  /**
   * The parser to use. Defaults to the global `DOMParser`, which browsers have. On a server, pass a window from a DOM
   * library, for example `new (await import('happy-dom')).Window()`.
   */
  window?: HTMLParserHost;
}

function parserHost(options: FromHTMLOptions): HTMLParserHost {
  if (options.window) return options.window;
  const global = globalThis as { DOMParser?: HTMLParserHost['DOMParser'] };
  if (global.DOMParser) return { DOMParser: global.DOMParser };
  throw new Error(
    "[post-canvas] fromHTML() needs an HTML parser here. Pass { window } from a DOM library, e.g. new (await import('happy-dom')).Window().",
  );
}

/**
 * Reads HTML into a sanitized document. Scripts never run: the HTML is parsed into an inert document, read through the
 * schema's parse rules, and then cleaned by `sanitizeDocument()`. HTML from editors such as TinyMCE and Froala keeps
 * its headings, lists, tables, links and formatting, and their YouTube, Vimeo and other player iframes become video
 * and embed nodes.
 */
export function fromHTML(html: string, options: FromHTMLOptions = {}): JSONContent {
  const host = parserHost(options);
  const { schema } = sanitizerSetup({ features: options.features });
  const document = new host.DOMParser().parseFromString(`<!doctype html><html><body>${html}</body></html>`, 'text/html');
  for (const element of Array.from(document.querySelectorAll('script, style, template, noscript, object, embed, link, meta'))) {
    element.remove();
  }
  const parsed = SchemaParser.fromSchema(schema).parse(document.body).toJSON() as JSONContent;
  return sanitizeDocument(parsed, { features: options.features, limits: options.limits }).doc;
}
