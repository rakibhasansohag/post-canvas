// The server half of video and social embeds: looks up a title, description and thumbnail through each provider's
// public oEmbed endpoint. Only fixed endpoint URLs built from validated ids are ever fetched, so a pasted link can't
// make the server call anywhere else, and the oEmbed `html` is never passed on.
import { readHead } from './link-resolver';
import type { EmbedMetadata, EmbedMetadataResolver } from '../../core/types';
import { safeHttpUrl, safeMediaSrc } from '../../core/url';
import { matchEmbedUrl, type EmbedProvider, type EmbedRef } from '../../embeds/providers';
import { embedRefFromVideoRef, isVideoThumbnail, parseVideoUrl, videoProviders } from '../../embeds/providers/video';
import { cleanText, readHtmlMeta } from './html-meta';
import type { ResolverFetch } from './link-resolver';

/** Why an embed lookup failed. */
export type EmbedResolveErrorCode = 'unsupported' | 'not_found' | 'not_embeddable' | 'unavailable' | 'timeout';

/** The error the embed resolver throws. `status` is the provider's HTTP status, when it answered. */
export class EmbedResolveError extends Error {
  /** What went wrong, for the app to map to its own message. */
  readonly code: EmbedResolveErrorCode;
  /** The provider's HTTP status, when there was a response. */
  readonly status?: number;

  /**
   * @param code - What went wrong.
   * @param message - An English description for logs.
   * @param status - The provider's HTTP status, when there was a response.
   */
  constructor(code: EmbedResolveErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'EmbedResolveError';
    this.code = code;
    if (status !== undefined) this.status = status;
  }
}

/** Options for {@link createEmbedResolver}. */
export interface EmbedResolverOptions {
  /** The `fetch` to call the providers with. Default `globalThis.fetch`. */
  fetch?: ResolverFetch;
  /** Each request's deadline in milliseconds. Default `5000`. */
  timeoutMs?: number;
  /** How many lookups are kept. The oldest is dropped first. `0` turns the cache off. Default `500`. */
  cacheSize?: number;
  /** How long a lookup is kept, in milliseconds. Default ten minutes. */
  cacheTtlMs?: number;
  /**
   * Which providers to look up, by name, such as `['youtube', 'vimeo', 'spotify']`. Default: YouTube, Vimeo and every
   * registered embed provider. Pass the names your editor's features allow, so the server never looks up others.
   */
  providers?: readonly string[];
}

const titleMax = 200;
/** The most bytes of an oEmbed answer that are read. */
const oembedMaxBytes = 256 * 1024;
/** The most bytes of YouTube's watch page that are read; the description is in its head. */
const pageMaxBytes = 1024 * 1024;
const descriptionMax = 1000;
const youtubeId = /^[A-Za-z0-9_-]{11}$/;

interface Target {
  provider: EmbedProvider;
  ref: EmbedRef;
  key: string;
}

/** Finds the provider for a pasted URL: YouTube and Vimeo first, then every registered embed provider. */
function identify(input: string, providers?: readonly string[]): Target | null {
  const video = parseVideoUrl(input);
  if (video && (!providers || providers.includes(video.provider))) {
    const provider = videoProviders[video.provider];
    const ref = embedRefFromVideoRef(video);
    return { provider, ref, key: `${provider.name}:${provider.canonicalUrl(ref)}` };
  }
  if (video) return null;
  const match = matchEmbedUrl(
    input,
    providers?.filter((name) => name !== 'youtube' && name !== 'vimeo'),
  );
  return match ? { provider: match.provider, ref: match.ref, key: `${match.provider.name}:${match.url}` } : null;
}

function defaultAspect(target: Target): number | null {
  try {
    return target.provider.frame(target.ref).aspectRatio ?? target.provider.aspectRatio;
  } catch {
    return target.provider.aspectRatio;
  }
}

function positive(value: unknown): number | null {
  const number = typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value) ? Number(value) : value;
  return typeof number === 'number' && Number.isFinite(number) && number > 0 ? number : null;
}

/** The ratio from oEmbed's width and height, when both are positive and the result is a sane shape. */
function oembedAspect(data: Record<string, unknown>): number | null {
  const width = positive(data.width);
  const height = positive(data.height);
  if (width === null || height === null) return null;
  const ratio = width / height;
  return ratio >= 0.2 && ratio <= 5 ? ratio : null;
}

function localThumbnail(target: Target): string | null {
  try {
    const url = target.provider.thumbnail?.(target.ref);
    const safe = safeMediaSrc(url);
    return safe?.startsWith('https://') ? safe : null;
  } catch {
    return null;
  }
}

/**
 * Creates an {@link EmbedMetadataResolver} for the server: pass it to your embed endpoint. It recognises the pasted URL
 * (YouTube and Vimeo, then every registered embed provider), fetches only that provider's fixed oEmbed endpoint (plus
 * YouTube's watch page for the description, best effort), and returns the title, description, thumbnail and aspect
 * ratio. Results are cached by provider and canonical URL. Failures throw an {@link EmbedResolveError}; an abort from
 * the caller's signal is rethrown as it is.
 */
export function createEmbedResolver(options: EmbedResolverOptions = {}): EmbedMetadataResolver {
  const { timeoutMs = 5000, cacheSize = 500, cacheTtlMs = 10 * 60_000 } = options;
  const fetchFn: ResolverFetch =
    options.fetch ??
    ((input, init) => {
      if (typeof globalThis.fetch !== 'function') {
        return Promise.reject(new EmbedResolveError('unavailable', 'No fetch is available here. Pass `fetch`.'));
      }
      return globalThis.fetch(input, init);
    });
  const cache = new Map<string, { at: number; value: EmbedMetadata }>();

  function remember(key: string, value: EmbedMetadata): void {
    if (cacheSize <= 0 || cacheTtlMs <= 0) return;
    cache.delete(key);
    cache.set(key, { at: Date.now(), value });
    while (cache.size > cacheSize) {
      const oldest = cache.keys().next().value;
      if (oldest === undefined) break;
      cache.delete(oldest);
    }
  }

  function recall(key: string): EmbedMetadata | null {
    const hit = cache.get(key);
    if (!hit) return null;
    if (Date.now() - hit.at >= cacheTtlMs) {
      cache.delete(key);
      return null;
    }
    return hit.value;
  }

  async function getJson(url: string, label: string, signal: AbortSignal): Promise<Record<string, unknown>> {
    const response = await fetchFn(url, { headers: { accept: 'application/json' }, redirect: 'error', signal });
    if (response.status === 400 || response.status === 404) {
      throw new EmbedResolveError('not_found', `${label} has no such item.`, response.status);
    }
    if (response.status === 401 || response.status === 403) {
      throw new EmbedResolveError('not_embeddable', `${label} doesn't allow embedding this item.`, response.status);
    }
    if (!response.ok) {
      throw new EmbedResolveError('unavailable', `${label} answered ${response.status}.`, response.status);
    }
    const type = response.headers.get('content-type') ?? '';
    if (type && !/json|javascript|text\/plain/i.test(type)) {
      await response.body?.cancel().catch(() => undefined);
      throw new EmbedResolveError('unavailable', `${label} sent an unreadable answer.`);
    }
    let data: unknown;
    try {
      data = JSON.parse(new TextDecoder().decode(await readHead(response.body, oembedMaxBytes)));
    } catch {
      throw new EmbedResolveError('unavailable', `${label} sent an unreadable answer.`);
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new EmbedResolveError('unavailable', `${label} sent an unreadable answer.`);
    }
    return data as Record<string, unknown>;
  }

  /** YouTube's oEmbed has no description, so read it from the watch page's meta tags. Best effort: `''` on failure. */
  async function youtubeDescription(id: string, signal: AbortSignal): Promise<string> {
    if (!youtubeId.test(id)) return '';
    try {
      const response = await fetchFn(`https://www.youtube.com/watch?v=${id}`, {
        // SOCS=CAI declines the EU consent page, so the request gets the watch page itself.
        headers: { accept: 'text/html', 'accept-language': 'en', cookie: 'SOCS=CAI' },
        redirect: 'error',
        signal,
      });
      if (!response.ok) return '';
      const html = new TextDecoder().decode(await readHead(response.body, pageMaxBytes));
      const { meta } = readHtmlMeta(html);
      return meta.get('og:description') ?? meta.get('description') ?? '';
    } catch {
      return '';
    }
  }

  async function lookup(target: Target, signal: AbortSignal): Promise<EmbedMetadata> {
    const { provider, ref } = target;
    const result: EmbedMetadata = {};
    const fallbackAspect = defaultAspect(target);
    const endpoint = provider.oembed ? safeHttpUrl(provider.oembed(ref)) : null;
    if (!endpoint?.startsWith('https://')) {
      const thumbnail = localThumbnail(target);
      if (thumbnail) result.thumbnailUrl = thumbnail;
      if (fallbackAspect !== null) result.aspectRatio = fallbackAspect;
      return result;
    }
    const isYoutube = provider === videoProviders.youtube;
    const [data, watchDescription] = await Promise.all([
      getJson(endpoint, provider.label, signal),
      isYoutube ? youtubeDescription(ref.id ?? '', signal) : Promise.resolve(''),
    ]);
    const title = cleanText(data.title, titleMax);
    if (title) result.title = title;
    const description = cleanText(isYoutube ? watchDescription : data.description, descriptionMax);
    if (description) result.description = description;
    let thumbnail: string | null;
    if (isYoutube) {
      thumbnail = localThumbnail(target);
    } else if (provider === videoProviders.vimeo) {
      thumbnail = isVideoThumbnail('vimeo', data.thumbnail_url) ? data.thumbnail_url : null;
    } else {
      const safe = safeMediaSrc(data.thumbnail_url);
      thumbnail = safe?.startsWith('https://') ? safe : localThumbnail(target);
    }
    if (thumbnail) result.thumbnailUrl = thumbnail;
    // A fixed-height player (audio, posts) keeps no ratio, whatever size oEmbed reports.
    if (fallbackAspect !== null) result.aspectRatio = oembedAspect(data) ?? fallbackAspect;
    return result;
  }

  return async (url, ctx) => {
    const target = identify(url, options.providers);
    if (!target) throw new EmbedResolveError('unsupported', 'No embed provider recognises this link.');
    const cached = recall(target.key);
    if (cached) return { ...cached };
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = AbortSignal.any([ctx.signal, timeout]);
    let value: EmbedMetadata;
    try {
      value = await lookup(target, signal);
    } catch (error) {
      if (ctx.signal.aborted) throw ctx.signal.reason ?? error;
      if (error instanceof EmbedResolveError) throw error;
      if (timeout.aborted) throw new EmbedResolveError('timeout', `${target.provider.label} didn't answer in time.`);
      throw new EmbedResolveError('unavailable', `${target.provider.label} could not be reached.`);
    }
    remember(target.key, value);
    return { ...value };
  };
}
