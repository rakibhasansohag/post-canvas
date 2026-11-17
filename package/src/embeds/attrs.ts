// Pure attribute cleaning for the embed nodes. These run in the sanitizer on the server, so they never trust a value:
// every URL is rebuilt or re-checked, every text is cut to length, and unknown keys are dropped.
import { safeHttpUrl, safeMediaSrc } from '../core/url';
import type { EmbedAttrs, LinkCardAttrs, VideoAttrs } from '../core/types';
import { getEmbedProvider, verifyEmbedRef } from './providers/index';
import { embedRefFromVideoRef, isVideoThumbnail, videoProviders, type VideoRef } from './providers/video';

/** Longest stored title. */
export const titleMax = 200;
/** Longest stored video description. */
export const videoDescriptionMax = 1000;
/** Longest stored link-card description. */
export const linkDescriptionMax = 500;
/** Longest stored site name. */
export const siteNameMax = 100;

const nodeId = /^[A-Za-z0-9_-]{1,64}$/;

// C0 and C1 controls except tab and newline, plus the bidi overrides that can disguise text.
// eslint-disable-next-line no-control-regex
const unsafeText = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g;

/** Cuts text at a word boundary to `max` characters, adding an ellipsis when it cut. */
export function clipText(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut.slice(0, max - 1)).trimEnd()}…`;
}

/** A clean, trimmed, length-capped single-line string from anything. */
export function cleanLine(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return clipText(value.replace(unsafeText, '').replace(/\s+/g, ' ').trim(), max);
}

/** A clean, trimmed, length-capped string from anything, keeping line breaks. */
export function cleanText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return clipText(
    value
      .replace(unsafeText, '')
      .replace(/\r\n?/g, '\n')
      .replace(/[^\S\n]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
    max,
  );
}

/** A node id kept only when it is a short token; anything else becomes `null` (the editor makes a new one). */
export function cleanId(value: unknown): string | null {
  return typeof value === 'string' && nodeId.test(value) ? value : null;
}

function ratio(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0.2 && value <= 5
    ? Math.round(value * 10000) / 10000
    : null;
}

/** Cleans a `video` node's attributes, or returns `null` when the video can't be rebuilt from its ids. */
export function sanitizeVideoAttrs(attrs: Record<string, unknown>): Record<string, unknown> | null {
  const provider = attrs.provider;
  if (provider !== 'youtube' && provider !== 'vimeo') return null;
  if (typeof attrs.videoId !== 'string') return null;
  const hash = typeof attrs.hash === 'string' && attrs.hash ? attrs.hash : null;
  const start =
    typeof attrs.start === 'number' && Number.isInteger(attrs.start) && attrs.start > 0 && attrs.start <= 43200
      ? attrs.start
      : null;
  const video: VideoRef = {
    provider,
    videoId: attrs.videoId,
    hash: provider === 'vimeo' ? hash : null,
    vertical: provider === 'youtube' && attrs.vertical === true,
    // A Short's canonical URL has no start time, so a vertical video never keeps one.
    start: provider === 'youtube' && attrs.vertical === true ? null : start,
  };
  if (!verifyEmbedRef(videoProviders[provider], embedRefFromVideoRef(video))) return null;
  const clean: Omit<VideoAttrs, 'id'> & { id: string | null } = {
    id: cleanId(attrs.id),
    ...video,
    title: cleanLine(attrs.title, titleMax),
    description: cleanText(attrs.description, videoDescriptionMax),
    thumbnailUrl: isVideoThumbnail(provider, attrs.thumbnailUrl) ? attrs.thumbnailUrl : null,
  };
  return clean;
}

/**
 * Cleans an `embed` node's attributes, or returns `null`. The provider must be registered and in `allowed`, and the
 * ref must round-trip through the provider's canonical URL. The stored `url` is replaced by the rebuilt canonical one.
 */
export function sanitizeEmbedAttrs(
  attrs: Record<string, unknown>,
  allowed: readonly string[],
): Record<string, unknown> | null {
  if (typeof attrs.provider !== 'string' || !allowed.includes(attrs.provider)) return null;
  const provider = getEmbedProvider(attrs.provider);
  if (!provider) return null;
  const checked = verifyEmbedRef(provider, attrs.ref);
  if (!checked) return null;
  const clean: Omit<EmbedAttrs, 'id'> & { id: string | null } = {
    id: cleanId(attrs.id),
    provider: provider.name,
    ref: checked.ref,
    url: checked.url,
    title: cleanLine(attrs.title, titleMax),
    aspectRatio: ratio(attrs.aspectRatio) ?? provider.aspectRatio,
  };
  return clean;
}

/** Cleans a `linkCard` node's attributes, or returns `null` when its URL isn't a safe http(s) link. */
export function sanitizeLinkCardAttrs(attrs: Record<string, unknown>): Record<string, unknown> | null {
  const url = safeHttpUrl(attrs.url);
  if (!url) return null;
  const host = new URL(url).hostname.replace(/^www\./, '');
  const clean: Omit<LinkCardAttrs, 'id'> & { id: string | null } = {
    id: cleanId(attrs.id),
    url,
    title: cleanLine(attrs.title, titleMax) || host,
    description: cleanText(attrs.description, linkDescriptionMax),
    image: safeMediaSrc(attrs.image),
    siteName: cleanLine(attrs.siteName, siteNameMax) || null,
    favicon: safeMediaSrc(attrs.favicon),
  };
  return clean;
}
