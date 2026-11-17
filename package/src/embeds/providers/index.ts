// The provider registry: the built-in providers plus any the app registers, and the round-trip check the sanitizer
// relies on.
import { embedProviders } from './built-in';
import { parseEmbedUrl } from './parse-url';
import type { EmbedMatch, EmbedProvider, EmbedRef } from './types';
import { videoProviders } from './video';

export type { EmbedFrame, EmbedMatch, EmbedProvider, EmbedRef } from './types';
export { parseEmbedUrl } from './parse-url';
export {
  canonicalVideoUrl,
  defaultVideoThumbnail,
  isVideoThumbnail,
  parseStartTime,
  parseVideoUrl,
  videoFrame,
  videoProviders,
  withAutoplay,
  type VideoProvider,
  type VideoRef,
} from './video';

const providerName = /^[a-z][a-z0-9-]{0,39}$/;
const refKey = /^[a-z][a-zA-Z0-9]{0,19}$/;

/**
 * Checks and returns an embed provider. Use it for your own providers, then pass the result to
 * `registerEmbedProvider()` on both the client and the server, and add its name to the `embed` feature's `providers`.
 *
 * @example
 * ```ts
 * const peertube = defineEmbedProvider({
 *   name: 'peertube',
 *   label: 'PeerTube',
 *   aspectRatio: 16 / 9,
 *   match: (url) => (url.hostname === 'video.example.org' && /^\/w\/[A-Za-z0-9]{22}$/.test(url.pathname)
 *     ? { id: url.pathname.slice(3) } : null),
 *   frame: (ref) => ({ src: `https://video.example.org/videos/embed/${ref.id}`, title: 'PeerTube video',
 *     allow: 'fullscreen', sandbox: 'allow-scripts allow-same-origin', aspectRatio: 16 / 9, height: null }),
 *   canonicalUrl: (ref) => `https://video.example.org/w/${ref.id}`,
 * });
 * ```
 */
export function defineEmbedProvider(provider: EmbedProvider): EmbedProvider {
  if (!providerName.test(provider.name)) {
    throw new Error(`[post-canvas] Embed provider name "${provider.name}" must be lower-case letters, digits and dashes.`);
  }
  if (typeof provider.match !== 'function' || typeof provider.frame !== 'function') {
    throw new Error(`[post-canvas] Embed provider "${provider.name}" needs match() and frame().`);
  }
  if (typeof provider.canonicalUrl !== 'function') {
    throw new Error(`[post-canvas] Embed provider "${provider.name}" needs canonicalUrl().`);
  }
  return Object.freeze({ ...provider });
}

/** Every built-in provider: YouTube and Vimeo (for the `video` node), then the nine `embed` providers. */
export const builtInProviders: readonly EmbedProvider[] = [videoProviders.youtube, videoProviders.vimeo, ...embedProviders];

const registry = new Map<string, EmbedProvider>(embedProviders.map((provider) => [provider.name, provider]));

/**
 * Adds a provider to the `embed` node's registry, so the editor, the sanitizer and the renderers know it. Register it in
 * every place that renders or sanitizes documents, including the server. A built-in name can't be replaced.
 */
export function registerEmbedProvider(provider: EmbedProvider): void {
  const checked = defineEmbedProvider(provider);
  if (embedProviders.some((builtIn) => builtIn.name === checked.name) || checked.name in videoProviders) {
    throw new Error(`[post-canvas] "${checked.name}" is a built-in embed provider and can't be replaced.`);
  }
  registry.set(checked.name, checked);
}

/** The `embed` provider registered under `name`, or `undefined`. YouTube and Vimeo belong to the `video` node. */
export function getEmbedProvider(name: unknown): EmbedProvider | undefined {
  return typeof name === 'string' ? registry.get(name) : undefined;
}

/** Every registered `embed` provider, built-in ones first. */
export function listEmbedProviders(): EmbedProvider[] {
  return [...registry.values()];
}

/** True when a ref is a flat record of short strings with safe keys. */
function isCleanRef(ref: unknown): ref is EmbedRef {
  if (!ref || typeof ref !== 'object' || Array.isArray(ref)) return false;
  const entries = Object.entries(ref);
  return (
    entries.length <= 8 &&
    entries.every(([key, value]) => refKey.test(key) && typeof value === 'string' && value.length > 0 && value.length <= 200)
  );
}

function sameRef(a: EmbedRef, b: EmbedRef): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => Object.hasOwn(b, key) && a[key] === b[key]);
}

function safeMatch(provider: EmbedProvider, url: URL): EmbedRef | null {
  try {
    const ref = provider.match(url);
    return isCleanRef(ref) ? ref : null;
  } catch {
    return null;
  }
}

/**
 * Finds the provider for a pasted link among `names` (default: every registered `embed` provider), or returns `null`.
 * The link must pass `parseEmbedUrl()`, and the returned ref must round-trip through the provider's canonical URL.
 */
export function matchEmbedUrl(input: string, names?: readonly string[]): EmbedMatch | null {
  const url = parseEmbedUrl(input);
  if (!url) return null;
  const providers = names ? names.map(getEmbedProvider).filter((p): p is EmbedProvider => !!p) : listEmbedProviders();
  for (const provider of providers) {
    const ref = safeMatch(provider, url);
    if (!ref) continue;
    const checked = verifyEmbedRef(provider, ref);
    if (checked) return { provider, ref: checked.ref, url: checked.url };
  }
  return null;
}

/**
 * Re-checks a stored ref: builds the provider's canonical URL from it, matches that URL again, and accepts the ref only
 * when the result is identical. Anything a provider wouldn't have produced itself, such as an id with a slash or a
 * query in it, fails. Returns the ref and its canonical URL, or `null`.
 */
export function verifyEmbedRef(provider: EmbedProvider, ref: unknown): { ref: EmbedRef; url: string } | null {
  if (!isCleanRef(ref)) return null;
  let canonical: string;
  try {
    canonical = provider.canonicalUrl(ref);
  } catch {
    return null;
  }
  const url = parseEmbedUrl(canonical);
  if (!url || url.protocol !== 'https:') return null;
  const again = safeMatch(provider, url);
  if (!again || !sameRef(again, ref)) return null;
  return { ref: { ...again }, url: url.href };
}
