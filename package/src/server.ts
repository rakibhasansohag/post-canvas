/**
 * The `post-canvas/server` entry: everything an app's server needs to accept, store and show documents, with no DOM
 * and no React. `validateDocument`, `sanitizeDocument` and `renderToHTML` also run in edge runtimes. The link-preview
 * resolver loads `undici` and `node:dns` when it first runs, so it needs Node; the embed resolver only calls `fetch`
 * (the global one by default) on fixed oEmbed endpoints.
 *
 * Always run `sanitizeDocument()` (or check `validateDocument()`) on JSON that came from a client before you show it to
 * anyone else.
 *
 * Wire the resolvers as the editor's `adapters.embeds` and `adapters.links` through a route handler. A Next.js route:
 *
 * @example
 * ```ts
 * // app/api/previews/route.ts
 * import { createEmbedResolver, createLinkPreviewResolver } from 'post-canvas/server';
 *
 * const embeds = createEmbedResolver();
 * const links = createLinkPreviewResolver();
 *
 * export async function POST(request: Request) {
 *   const { url, kind } = (await request.json()) as { url: string; kind: 'embed' | 'link' };
 *   try {
 *     const resolve = kind === 'embed' ? embeds : links;
 *     return Response.json(await resolve(url, { signal: request.signal }));
 *   } catch (error) {
 *     const code = error instanceof Error && 'code' in error ? String(error.code) : 'unavailable';
 *     return Response.json({ code }, { status: 422 });
 *   }
 * }
 *
 * // In the browser:
 * const post = (kind: 'embed' | 'link') => async (url: string, { signal }: { signal: AbortSignal }) => {
 *   const response = await fetch('/api/previews', { method: 'POST', body: JSON.stringify({ url, kind }), signal });
 *   if (!response.ok) throw new Error(((await response.json()) as { code: string }).code);
 *   return response.json();
 * };
 * <PostCanvas adapters={{ embeds: post('embed'), links: post('link') }} />
 * ```
 *
 * @packageDocumentation
 */

export {
  sanitizeDocument,
  defaultLimits,
  type DocumentLimits,
  type SanitizeOptions,
  type SanitizeReason,
  type SanitizeRemoval,
  type SanitizeResult,
} from './output/sanitize';
export { renderToHTML, type RenderHTMLOptions } from './output/html';
export { fromHTML, type FromHTMLOptions, type HTMLParserHost } from './output/from-html';
export { hasTransientContent } from './output/text';
export {
  validateDocument,
  type ValidateOptions,
  type ValidationCode,
  type ValidationError,
  type ValidationResult,
} from './server/validate';
export {
  createEmbedResolver,
  EmbedResolveError,
  type EmbedResolveErrorCode,
  type EmbedResolverOptions,
} from './server/resolvers/embed-resolver';
export {
  createLinkPreviewResolver,
  type LinkPreviewResolverOptions,
  type ResolverFetch,
} from './server/resolvers/link-resolver';
export {
  LinkPreviewError,
  isBlockedAddress,
  type LinkPreviewErrorCode,
  type LookupFunction,
} from './server/resolvers/ssrf';
export { registerEmbedProvider, defineEmbedProvider, type EmbedProvider } from './embeds/providers/index';
export { defaultFeatures, resolveFeatures, builtInEmbedProviderNames } from './core/features';
export { hasPendingUploads } from './media/upload/pending';
export type { EmbedRenderMode } from './embeds/render-spec';
