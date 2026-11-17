/**
 * The `post-canvas/render` entry: show and convert documents without the editor. Everything here works in React
 * Server Components; `renderToHTML`, `sanitizeDocument`, the Markdown and text helpers run on any server with no DOM.
 * `fromHTML` needs an HTML parser (the browser's, or a server-side window).
 *
 * Run `sanitizeDocument()` on JSON from a client before you show it to others. `renderToHTML` and `PostCanvasView`
 * do it by default.
 *
 * @packageDocumentation
 */

export { renderToHTML, type RenderHTMLOptions } from './output/html';
export { PostCanvasView, type PostCanvasViewProps } from './output/react-view';
export { toMarkdown, fromMarkdown, type FromMarkdownOptions } from './output/markdown';
export { toPlainText, excerpt, getCover, hasTransientContent } from './output/text';
export { fromHTML, type FromHTMLOptions, type HTMLParserHost } from './output/from-html';
export {
  sanitizeDocument,
  defaultLimits,
  type DocumentLimits,
  type SanitizeOptions,
  type SanitizeReason,
  type SanitizeRemoval,
  type SanitizeResult,
} from './output/sanitize';
export { activateEmbeds } from './output/activate-embeds';
export { embedViews, EmbedPlayer, VideoView, EmbedView, LinkCardView, type EmbedPlayerProps } from './embeds/view/index';
export type { EmbedRenderMode } from './embeds/render-spec';
