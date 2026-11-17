// YouTube and Vimeo, for the `video` node. The link is parsed as it is pasted and again by the sanitizer, and every
// player URL is built from the validated id: the privacy-friendly youtube-nocookie player, and Vimeo with `dnt=1`.
import { fits, parseEmbedUrl, pathParts } from './parse-url';
import type { EmbedFrame, EmbedProvider, EmbedRef } from './types';

/** The two video providers. */
export type VideoProvider = 'youtube' | 'vimeo';

/** A parsed video link: everything the `video` node stores about where the video lives. */
export interface VideoRef {
  provider: VideoProvider;
  videoId: string;
  /** The privacy hash of an unlisted Vimeo video, or `null`. */
  hash: string | null;
  /** A vertical video, such as a YouTube Short. */
  vertical: boolean;
  /** Start time in seconds, or `null`. */
  start: number | null;
}

const youtubeId = /^[A-Za-z0-9_-]{11}$/;
const vimeoId = /^\d{1,12}$/;
const vimeoHash = /^[0-9a-f]{6,20}$/i;
const digits = /^\d{1,6}$/;
/** Twelve hours: longer start times are treated as typos. */
const maxStart = 12 * 60 * 60;

const youtubeHosts = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);
const vimeoHosts = new Set(['vimeo.com', 'www.vimeo.com']);

const videoAllow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
const videoSandbox = 'allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox';

/** Reads `90`, `90s`, `1m30s` or `1h2m3s` as seconds. Anything else, zero, or over twelve hours is `null`. */
export function parseStartTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /^(?:(\d{1,2})h)?(?:(\d{1,4})m)?(?:(\d{1,6})s?)?$/i.exec(value.trim());
  if (!match || (!match[1] && !match[2] && !match[3])) return null;
  const seconds = Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
  return seconds > 0 && seconds <= maxStart ? seconds : null;
}

function startRef(seconds: number | null): EmbedRef {
  return seconds === null ? {} : { start: String(seconds) };
}

function refStart(ref: EmbedRef): number | null {
  return fits(ref.start, digits) ? parseStartTime(ref.start) : null;
}

/** YouTube: watch, youtu.be, Shorts, embed and live links. */
export const youtube: EmbedProvider = {
  name: 'youtube',
  label: 'YouTube',
  aspectRatio: 16 / 9,
  match(url): EmbedRef | null {
    const host = url.hostname.toLowerCase();
    const parts = pathParts(url);
    const start = startRef(parseStartTime(url.searchParams.get('t') ?? url.searchParams.get('start')));
    const make = (id: string | null | undefined, vertical = false): EmbedRef | null =>
      fits(id, youtubeId) ? { id, ...(vertical ? { vertical: '1' } : start) } : null;
    if (host === 'youtu.be' || host === 'www.youtu.be') return parts.length === 1 ? make(parts[0]) : null;
    if (!youtubeHosts.has(host)) return null;
    if (parts[0] === 'watch' && parts.length === 1) return make(url.searchParams.get('v'));
    if (parts[0] === 'shorts' && parts.length === 2) return make(parts[1], true);
    if ((parts[0] === 'embed' || parts[0] === 'live' || parts[0] === 'v') && parts.length === 2) return make(parts[1]);
    return null;
  },
  frame(ref) {
    const start = refStart(ref);
    return {
      src: `https://www.youtube-nocookie.com/embed/${ref.id}?rel=0&playsinline=1${start ? `&start=${start}` : ''}`,
      title: 'YouTube video',
      allow: videoAllow,
      sandbox: videoSandbox,
      aspectRatio: ref.vertical === '1' ? 9 / 16 : 16 / 9,
      height: null,
    };
  },
  canonicalUrl(ref) {
    const start = refStart(ref);
    if (ref.vertical === '1') return `https://www.youtube.com/shorts/${ref.id}`;
    return `https://www.youtube.com/watch?v=${ref.id}${start ? `&t=${start}s` : ''}`;
  },
  oembed(ref) {
    return `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${ref.id}`)}`;
  },
  thumbnail(ref) {
    return fits(ref.id, youtubeId) ? `https://i.ytimg.com/vi/${ref.id}/hqdefault.jpg` : null;
  },
};

/** Vimeo: public and unlisted videos, the player URL, and videos inside channels, groups and showcases. */
export const vimeo: EmbedProvider = {
  name: 'vimeo',
  label: 'Vimeo',
  aspectRatio: 16 / 9,
  match(url): EmbedRef | null {
    const host = url.hostname.toLowerCase();
    const parts = pathParts(url);
    const start = startRef(parseStartTime(/(?:^|&)t=([^&]*)/.exec(url.hash.slice(1))?.[1]));
    const make = (id: string | undefined, hash: string | null | undefined): EmbedRef | null => {
      if (!fits(id, vimeoId)) return null;
      if (hash !== null && hash !== undefined && !fits(hash, vimeoHash)) return null;
      return { id, ...(hash ? { hash: hash.toLowerCase() } : {}), ...start };
    };
    if (host === 'player.vimeo.com') {
      return parts[0] === 'video' && parts.length === 2 ? make(parts[1], url.searchParams.get('h')) : null;
    }
    if (!vimeoHosts.has(host)) return null;
    if (fits(parts[0], vimeoId) && parts.length <= 2) return make(parts[0], parts[1] ?? url.searchParams.get('h'));
    if (['channels', 'groups', 'showcase'].includes(parts[0] ?? '')) {
      const last = parts.at(-1);
      return parts.length >= 3 && parts.length <= 4 ? make(last, url.searchParams.get('h')) : null;
    }
    return null;
  },
  frame(ref) {
    const start = refStart(ref);
    return {
      src: `https://player.vimeo.com/video/${ref.id}?dnt=1${ref.hash ? `&h=${ref.hash}` : ''}${start ? `#t=${start}s` : ''}`,
      title: 'Vimeo video',
      allow: videoAllow,
      sandbox: videoSandbox,
      aspectRatio: 16 / 9,
      height: null,
    };
  },
  canonicalUrl(ref) {
    const start = refStart(ref);
    return `https://vimeo.com/${ref.id}${ref.hash ? `/${ref.hash}` : ''}${start ? `#t=${start}s` : ''}`;
  },
  oembed(ref) {
    const page = `https://vimeo.com/${ref.id}${ref.hash ? `/${ref.hash}` : ''}`;
    return `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(page)}&width=1280&dnt=1`;
  },
};

/** The two video providers, by name. */
export const videoProviders: Record<VideoProvider, EmbedProvider> = { youtube, vimeo };

/** Turns a provider ref into the `video` node's fields. */
export function videoRefFromEmbedRef(provider: VideoProvider, ref: EmbedRef): VideoRef {
  return {
    provider,
    videoId: ref.id ?? '',
    hash: provider === 'vimeo' && ref.hash ? ref.hash : null,
    vertical: provider === 'youtube' && ref.vertical === '1',
    start: refStart(ref),
  };
}

/** Turns the `video` node's fields into a provider ref. */
export function embedRefFromVideoRef(video: Omit<VideoRef, 'provider'> & { provider: string }): EmbedRef {
  return {
    id: video.videoId,
    ...(video.provider === 'vimeo' && video.hash ? { hash: video.hash } : {}),
    ...(video.provider === 'youtube' && video.vertical ? { vertical: '1' } : {}),
    ...startRef(video.start),
  };
}

/**
 * Reads a YouTube or Vimeo link, or returns `null`. Lookalike hosts (`youtube.com.evil.com`), user-name tricks
 * (`https://youtube.com@evil.com`), other protocols and malformed ids are all `null`. Shorts come back vertical, and an
 * unlisted Vimeo link keeps its hash.
 */
export function parseVideoUrl(input: string): VideoRef | null {
  const url = parseEmbedUrl(input);
  if (!url) return null;
  for (const name of ['youtube', 'vimeo'] as const) {
    const ref = videoProviders[name].match(url);
    if (ref) return videoRefFromEmbedRef(name, ref);
  }
  return null;
}

/**
 * Adds `autoplay=1` to a player URL, for a player that loads after the reader clicked play, so one click is enough.
 * Only for http(s) URLs built by a provider; anything else comes back unchanged.
 */
export function withAutoplay(src: string): string {
  try {
    const url = new URL(src);
    if (url.protocol !== 'https:') return src;
    url.searchParams.set('autoplay', '1');
    return url.href;
  } catch {
    return src;
  }
}

/** The player for a video, loaded only after a click. */
export function videoFrame(video: VideoRef): EmbedFrame {
  return videoProviders[video.provider].frame(embedRefFromVideoRef(video));
}

/** The video's own page: what oEmbed is asked about and what "Watch on…" links to. */
export function canonicalVideoUrl(video: VideoRef): string {
  return videoProviders[video.provider].canonicalUrl(embedRefFromVideoRef(video));
}

/** The default thumbnail for a video that has no stored one: YouTube's, built from the id. Vimeo has none. */
export function defaultVideoThumbnail(video: Pick<VideoRef, 'provider' | 'videoId'>): string | null {
  return video.provider === 'youtube' ? (youtube.thumbnail?.({ id: video.videoId }) ?? null) : null;
}

/** True for a thumbnail URL the `video` node may keep: YouTube's or Vimeo's own image hosts, over https. */
export function isVideoThumbnail(provider: VideoProvider, url: unknown): url is string {
  if (typeof url !== 'string' || url.length > 1024) return false;
  if (provider === 'youtube') return /^https:\/\/i\.ytimg\.com\/vi\/[A-Za-z0-9_-]{11}\/[a-z0-9_]{1,40}\.(?:jpg|webp)$/.test(url);
  return /^https:\/\/i\.vimeocdn\.com\/[A-Za-z0-9/_.,=-]{1,400}$/.test(url) && !url.includes('..');
}
