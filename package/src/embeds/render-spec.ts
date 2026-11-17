// Static HTML for the embed nodes, as ProseMirror DOMOutputSpecs. Pure: it runs on the server through the static
// renderer and in the browser through the DOM serializer. Every URL is rebuilt from the node's validated ids here, so a
// tampered document can't smuggle in a player or link.
import type { DOMOutputSpec } from '@tiptap/pm/model';
import type { Translator } from '../core/types';
import { getEmbedProvider, verifyEmbedRef } from './providers/index';
import type { EmbedFrame, EmbedProvider } from './providers/types';
import {
  defaultVideoThumbnail,
  embedRefFromVideoRef,
  isVideoThumbnail,
  videoProviders,
  withAutoplay,
  type VideoRef,
} from './providers/video';
import { safeHttpUrl, safeMediaSrc } from '../core/url';

/**
 * How the static HTML shows videos and embeds:
 * - `facade`: a thumbnail or placeholder that links to the provider. No third-party request until a reader clicks, and
 *   `activateEmbeds()` turns a click into the player.
 * - `iframe`: the provider's player straight away.
 * - `link`: a plain link, for feeds and email.
 */
export type EmbedRenderMode = 'facade' | 'iframe' | 'link';

/** Options shared by the embed nodes' static rendering. */
export interface EmbedRenderOptions {
  render: EmbedRenderMode;
  t: Translator;
}

/** The `rel` every outgoing embed and card link carries. */
export const externalRel = 'noopener noreferrer nofollow';

type Attrs = Record<string, unknown>;
type Spec = DOMOutputSpec;

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function frameStyle(frame: Pick<EmbedFrame, 'aspectRatio' | 'height'>): string {
  if (frame.height !== null && Number.isFinite(frame.height) && frame.height > 0 && frame.height <= 2000) {
    return `--pc-embed-height: ${Math.round(frame.height)}px`;
  }
  const ratio = frame.aspectRatio !== null && frame.aspectRatio >= 0.2 && frame.aspectRatio <= 5 ? frame.aspectRatio : 16 / 9;
  return `--pc-embed-ratio: ${Math.round(ratio * 10000) / 10000}`;
}

/** A child in a spec: a nested spec or text. */
type Child = Spec | string;

function compact(children: (Child | null | false | '')[]): Child[] {
  return children.filter((child): child is Child => Boolean(child));
}

/** An empty, hidden placeholder for a node that can't be rebuilt, so rendering never throws on bad data. */
function invalid(extra: Attrs): Spec {
  return ['div', { ...extra, class: 'pc-embed pc-embed-invalid', hidden: 'hidden' }];
}

/** The `video` node's attributes as a checked ref, or `null`. */
export function videoRefOf(attrs: Attrs): VideoRef | null {
  const provider = attrs.provider;
  if (provider !== 'youtube' && provider !== 'vimeo' || typeof attrs.videoId !== 'string') return null;
  const video: VideoRef = {
    provider,
    videoId: attrs.videoId,
    hash: typeof attrs.hash === 'string' && attrs.hash ? attrs.hash : null,
    vertical: attrs.vertical === true,
    start: typeof attrs.start === 'number' ? attrs.start : null,
  };
  return verifyEmbedRef(videoProviders[provider], embedRefFromVideoRef(video)) ? video : null;
}

/** Everything a renderer needs to show a video, rebuilt from its ids. `null` when the ids don't check out. */
export interface VideoRender {
  video: VideoRef;
  provider: EmbedProvider;
  frame: EmbedFrame;
  canonical: string;
  thumbnail: string | null;
  title: string;
  description: string;
}

/** Rebuilds a `video` node for rendering. */
export function videoRender(attrs: Attrs): VideoRender | null {
  const video = videoRefOf(attrs);
  if (!video) return null;
  const provider = videoProviders[video.provider];
  const ref = embedRefFromVideoRef(video);
  return {
    video,
    provider,
    frame: provider.frame(ref),
    canonical: provider.canonicalUrl(ref),
    thumbnail: isVideoThumbnail(video.provider, attrs.thumbnailUrl) ? attrs.thumbnailUrl : defaultVideoThumbnail(video),
    title: text(attrs.title),
    description: text(attrs.description),
  };
}

/** Everything a renderer needs to show an embed, rebuilt from its ref. */
export interface EmbedRender {
  provider: EmbedProvider;
  frame: EmbedFrame;
  canonical: string;
  thumbnail: string | null;
  title: string;
}

/** Rebuilds an `embed` node for rendering. `null` when the provider is unknown or the ref doesn't round-trip. */
export function embedRender(attrs: Attrs): EmbedRender | null {
  const provider = getEmbedProvider(attrs.provider);
  if (!provider) return null;
  const checked = verifyEmbedRef(provider, attrs.ref);
  if (!checked) return null;
  const frame = provider.frame(checked.ref);
  const stored = typeof attrs.aspectRatio === 'number' && attrs.aspectRatio >= 0.2 && attrs.aspectRatio <= 5 ? attrs.aspectRatio : null;
  return {
    provider,
    frame: frame.height === null && stored !== null ? { ...frame, aspectRatio: stored } : frame,
    canonical: checked.url,
    thumbnail: safeMediaSrc(provider.thumbnail?.(checked.ref) ?? null),
    title: text(attrs.title),
  };
}

function iframeSpec(frame: EmbedFrame, title: string): Spec {
  return [
    'div',
    { class: 'pc-embed-frame', style: frameStyle(frame) },
    [
      'iframe',
      {
        src: frame.src,
        title,
        allow: frame.allow,
        sandbox: frame.sandbox,
        referrerpolicy: 'strict-origin-when-cross-origin',
        loading: 'lazy',
        allowfullscreen: 'true',
      },
    ],
  ];
}

function facadeSpec(frame: EmbedFrame, options: {
  canonical: string;
  playerTitle: string;
  label: string;
  badge: string;
  thumbnail: string | null;
  note: string | null;
  play: boolean;
}): Spec {
  return [
    'div',
    {
      class: 'pc-embed-frame',
      style: frameStyle(frame),
      'data-pc-player': options.play ? withAutoplay(frame.src) : frame.src,
      'data-pc-player-title': options.playerTitle,
      'data-pc-allow': frame.allow,
      'data-pc-sandbox': frame.sandbox,
    },
    [
      'a',
      {
        class: options.thumbnail ? 'pc-embed-facade' : 'pc-embed-facade pc-embed-facade-plain',
        href: options.canonical,
        target: '_blank',
        rel: externalRel,
        'aria-label': options.label,
      },
      ...compact([
        options.thumbnail && [
          'img',
          { class: 'pc-embed-thumb', src: options.thumbnail, alt: '', loading: 'lazy', decoding: 'async' },
        ],
        ['span', { class: options.play ? 'pc-embed-play' : 'pc-embed-play pc-embed-load', 'aria-hidden': 'true' }],
        ['span', { class: 'pc-embed-badge' }, options.badge],
        options.note && ['span', { class: 'pc-embed-note' }, options.note],
      ]),
    ],
  ];
}

function linkSpec(extra: Attrs, href: string, label: string): Spec {
  return ['p', { ...extra, class: 'pc-embed-link' }, ['a', { href, target: '_blank', rel: externalRel }, label]];
}

/** The static HTML of a `video` node. */
export function videoSpec(attrs: Attrs, options: EmbedRenderOptions, extra: Attrs = {}): Spec {
  const video = videoRender(attrs);
  if (!video) return invalid(extra);
  const { t } = options;
  const providerLabel = video.provider.label;
  const watchOn = t('embeds.video.watchOn', { provider: providerLabel });
  if (options.render === 'link') return linkSpec(extra, video.canonical, video.title || watchOn);

  const playerTitle = video.title || t('embeds.video.frameTitle', { provider: providerLabel });
  const player =
    options.render === 'iframe'
      ? iframeSpec(video.frame, playerTitle)
      : facadeSpec(video.frame, {
          canonical: video.canonical,
          playerTitle,
          label: video.title
            ? t('embeds.video.playTitled', { title: video.title, provider: providerLabel })
            : t('embeds.video.play', { provider: providerLabel }),
          badge: providerLabel,
          thumbnail: video.thumbnail,
          note: null,
          play: true,
        });

  return [
    'figure',
    {
      ...extra,
      class: video.video.vertical ? 'pc-embed pc-video pc-embed-vertical' : 'pc-embed pc-video',
      'data-pc-video': '',
      'data-provider': video.video.provider,
      'data-url': video.canonical,
    },
    player,
    [
      'figcaption',
      { class: 'pc-embed-caption' },
      ...compact([
        video.title && ['span', { class: 'pc-embed-title' }, video.title],
        video.description && ['span', { class: 'pc-embed-description' }, video.description],
        ['a', { class: 'pc-embed-source', href: video.canonical, target: '_blank', rel: externalRel }, watchOn],
      ]),
    ],
  ];
}

/** The static HTML of an `embed` node. */
export function embedSpec(attrs: Attrs, options: EmbedRenderOptions, extra: Attrs = {}): Spec {
  const embed = embedRender(attrs);
  if (!embed) return invalid(extra);
  const { t } = options;
  const providerLabel = embed.provider.label;
  const openOn = t('embeds.embed.openOn', { provider: providerLabel });
  if (options.render === 'link') return linkSpec(extra, embed.canonical, embed.title || openOn);

  const playerTitle = embed.title || t('embeds.embed.frameTitle', { provider: providerLabel });
  const player =
    options.render === 'iframe'
      ? iframeSpec(embed.frame, playerTitle)
      : facadeSpec(embed.frame, {
          canonical: embed.canonical,
          playerTitle,
          label: t('embeds.embed.load', { provider: providerLabel }),
          badge: providerLabel,
          thumbnail: embed.thumbnail,
          note: t('embeds.embed.consent', { provider: providerLabel }),
          play: false,
        });

  return [
    'figure',
    {
      ...extra,
      class: `pc-embed pc-embed-${embed.provider.name}`,
      'data-pc-embed': '',
      'data-provider': embed.provider.name,
      'data-url': embed.canonical,
    },
    player,
    [
      'figcaption',
      { class: 'pc-embed-caption' },
      ...compact([
        embed.title && ['span', { class: 'pc-embed-title' }, embed.title],
        ['a', { class: 'pc-embed-source', href: embed.canonical, target: '_blank', rel: externalRel }, openOn],
      ]),
    ],
  ];
}

/** A link card's attributes, checked for rendering. */
export interface LinkCardRender {
  url: string;
  title: string;
  description: string;
  image: string | null;
  site: string;
  favicon: string | null;
}

/** Rebuilds a `linkCard` node for rendering. `null` when its URL isn't a safe http(s) link. */
export function linkCardRender(attrs: Attrs): LinkCardRender | null {
  const url = safeHttpUrl(attrs.url);
  if (!url) return null;
  const host = new URL(url).hostname.replace(/^www\./, '');
  return {
    url,
    title: text(attrs.title) || host,
    description: text(attrs.description),
    image: safeMediaSrc(attrs.image),
    site: text(attrs.siteName) || host,
    favicon: safeMediaSrc(attrs.favicon),
  };
}

/** The static HTML of a `linkCard` node. */
export function linkCardSpec(attrs: Attrs, options: EmbedRenderOptions, extra: Attrs = {}): Spec {
  const card = linkCardRender(attrs);
  if (!card) return invalid(extra);
  if (options.render === 'link') return linkSpec(extra, card.url, card.title);
  return [
    'div',
    { ...extra, class: card.image ? 'pc-link-card' : 'pc-link-card pc-link-card-text', 'data-pc-link-card': '', 'data-url': card.url },
    [
      'a',
      { class: 'pc-link-card-anchor', href: card.url, target: '_blank', rel: externalRel },
      ...compact([
        card.image && ['img', { class: 'pc-link-card-image', src: card.image, alt: '', loading: 'lazy', decoding: 'async' }],
        [
          'span',
          { class: 'pc-link-card-body' },
          [
            'span',
            { class: 'pc-link-card-site' },
            ...compact([
              card.favicon && [
                'img',
                { class: 'pc-link-card-favicon', src: card.favicon, alt: '', width: '16', height: '16', loading: 'lazy' },
              ],
              card.site,
            ]),
          ],
          ['span', { class: 'pc-link-card-title' }, card.title],
          ...compact([card.description && ['span', { class: 'pc-link-card-description' }, card.description]]),
        ],
      ]),
    ],
  ];
}
