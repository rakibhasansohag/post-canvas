// The read-only React view of a document. No hooks and no "use client", so it renders in React Server Components; the
// interactive parts (the video facades, the carousel) are client components inside the node views.
import type { JSONContent } from '@tiptap/core';
import { renderToReactElement } from '@tiptap/static-renderer/pm/react';
import type { ReactNode } from 'react';
import type { Features, Locale, ViewMap } from '../core/types';
import type { EmbedRenderMode } from '../embeds/render-spec';
import { embedViews } from '../embeds/view/index';
import { mediaViews } from '../media/view/index';
import { renderExtensions } from './render-extensions';
import { sanitizeDocument, type DocumentLimits } from './sanitize';

/** Props of `PostCanvasView`. */
export interface PostCanvasViewProps {
  /** The document. */
  content: JSONContent;
  /** The features the document may use. Default: every feature. */
  features?: Features;
  /**
   * How videos and embeds appear: `facade` (default: click to load, with the interactive views), `iframe` (the player
   * straight away) or `link` (a plain link).
   */
  embeds?: EmbedRenderMode;
  /** Extra classes on the root `.pc-view`. */
  className?: string;
  /** The language of the view's few strings. Default English. */
  locale?: Locale;
  /** Light, dark or the reader's system setting. Default `auto`. */
  theme?: 'light' | 'dark' | 'auto';
  /** Run `sanitizeDocument()` first. Default `true`. */
  sanitize?: boolean;
  /** Size caps for the sanitizer. */
  limits?: Partial<DocumentLimits>;
  /** Your own views by node type. They replace the built-in ones. */
  views?: ViewMap;
}

/**
 * Shows a document read-only, with the same look as the editor. Media and embed nodes use their interactive views;
 * everything else renders from the schema's static HTML. It sanitizes by default and works from a Server Component.
 *
 * @example
 * ```tsx
 * import { PostCanvasView } from 'post-canvas/render';
 * import 'post-canvas/styles.css';
 * export default function Post({ post }) {
 *   return <PostCanvasView content={post.content} />;
 * }
 * ```
 */
export function PostCanvasView({
  content,
  features,
  embeds = 'facade',
  className,
  locale,
  theme = 'auto',
  sanitize = true,
  limits,
  views,
}: PostCanvasViewProps): ReactNode {
  const { extensions, t } = renderExtensions(features, embeds, locale);
  const doc = sanitize ? sanitizeDocument(content, { features, limits }).doc : content;
  const map: ViewMap = { ...mediaViews, ...(embeds === 'facade' ? embedViews : {}), ...views };
  const nodeMapping = Object.fromEntries(
    Object.entries(map).flatMap(([type, View]) =>
      View
        ? [[type, ({ node }: { node: { attrs: Record<string, unknown> } }) => <View node={{ type, attrs: node.attrs }} t={t} />]]
        : [],
    ),
  );
  const body = renderToReactElement({ content: doc, extensions, options: { nodeMapping } });
  return (
    <div className={className ? `pc-view ${className}` : 'pc-view'} data-pc-theme={theme}>
      <div className="pc-content">{body}</div>
    </div>
  );
}
