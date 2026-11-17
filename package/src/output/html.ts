// Server-safe HTML output: Tiptap JSON to an HTML string through `@tiptap/static-renderer`, with no DOM. Text and
// attribute values are escaped by the renderer, and every embed URL is rebuilt from validated ids.
import type { AnyExtension, JSONContent } from '@tiptap/core';
import { renderToHTMLString } from '@tiptap/static-renderer/pm/html-string';
import type { Features, Locale } from '../core/types';
import type { EmbedRenderMode } from '../embeds/render-spec';
import { renderExtensions } from './render-extensions';
import { sanitizeDocument, type DocumentLimits } from './sanitize';

/** Options of `renderToHTML()`. */
export interface RenderHTMLOptions {
  /** The features the document may use. Default: every feature. */
  features?: Features;
  /**
   * Run `sanitizeDocument()` first. Default `true`. Turn it off only for a document you sanitized yourself when it was
   * saved.
   */
  sanitize?: boolean;
  /** How videos and embeds appear: `facade` (default, click to load), `iframe` or `link`. */
  embeds?: EmbedRenderMode;
  /** Wrap the output in `<div class="pc-view"><div class="pc-content">`. Default `true`. */
  wrapper?: boolean;
  /** The language of the few strings the output contains, such as "Watch on YouTube". Default English. */
  locale?: Locale;
  /** Size caps for the sanitizer. */
  limits?: Partial<DocumentLimits>;
  /** Extra schema extensions, for your own nodes. They replace built-in ones with the same name. */
  extensions?: AnyExtension[];
}

/**
 * Renders a document to an HTML string, on the server or in the browser, with no DOM. By default it sanitizes the
 * document first, wraps the result in `.pc-view > .pc-content` (style it with `post-canvas/styles.css`), and shows
 * videos and embeds as click-to-load facades: call `activateEmbeds()` from `post-canvas/vanilla` on the page to turn a
 * click into the player, or use `embeds: 'iframe'`.
 *
 * @example
 * ```ts
 * import { renderToHTML } from 'post-canvas/render';
 * const html = renderToHTML(post.content);
 * ```
 */
export function renderToHTML(json: JSONContent, options: RenderHTMLOptions = {}): string {
  const { features, sanitize = true, embeds = 'facade', wrapper = true, locale, limits } = options;
  const base = renderExtensions(features, embeds, locale).extensions;
  const extensions = options.extensions?.length ? mergedFor(base, options.extensions) : base;
  const content = sanitize
    ? sanitizeDocument(json, { features, limits, ...(options.extensions?.length ? { extensions } : {}) }).doc
    : json;
  const html = renderToHTMLString({ content, extensions });
  return wrapper ? `<div class="pc-view"><div class="pc-content">${html}</div></div>` : html;
}

const merged = new WeakMap<AnyExtension[], WeakMap<AnyExtension[], AnyExtension[]>>();

/** `mergeExtensions(base, extra)`, built once per pair of arrays so the sanitizer's schema cache hits. */
function mergedFor(base: AnyExtension[], extra: AnyExtension[]): AnyExtension[] {
  let byBase = merged.get(extra);
  if (!byBase) {
    byBase = new WeakMap();
    merged.set(extra, byBase);
  }
  let result = byBase.get(base);
  if (!result) {
    result = mergeExtensions(base, extra);
    byBase.set(base, result);
  }
  return result;
}

/** `base` with every extension in `extra` replacing the one with the same name, or added at the end. */
export function mergeExtensions(base: AnyExtension[], extra: AnyExtension[]): AnyExtension[] {
  const names = new Set(extra.map((extension) => extension.name));
  return [...base.filter((extension) => !names.has(extension.name)), ...extra];
}
