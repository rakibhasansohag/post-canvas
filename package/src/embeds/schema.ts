// The render-safe embed nodes: names, attributes, parseHTML, renderHTML and sanitizers. No React, no DOM globals and no
// node views, so the server and the static renderers can use them. `embeds/kit.ts` extends these for the editor.
import { Node, type AnyExtension } from '@tiptap/core';
import { builtInEmbedProviderNames } from '../core/features';
import { createTranslator } from '../core/i18n';
import type { Features } from '../core/types';
import '../core/extension-fields';
import en from '../locales/en/index';
import {
  cleanId,
  cleanLine,
  cleanText,
  linkDescriptionMax,
  sanitizeEmbedAttrs,
  sanitizeLinkCardAttrs,
  sanitizeVideoAttrs,
  siteNameMax,
  titleMax,
  videoDescriptionMax,
} from './attrs';
import { matchEmbedUrl, parseVideoUrl } from './providers/index';
import { isVideoThumbnail } from './providers/video';
import { embedSpec, linkCardSpec, videoSpec, type EmbedRenderOptions } from './render-spec';

/** Options of the `video`, `embed` and `linkCard` nodes. */
export type EmbedNodeOptions = EmbedRenderOptions;

const english = createTranslator(en);

const defaultRenderOptions = (): EmbedNodeOptions => ({ render: 'facade', t: english });

/** An attribute that only the node's own rules read and write. */
function plain<T>(fallback: T) {
  return { default: fallback, rendered: false, parseHTML: () => null };
}

/** The `id` attribute, shared with UniqueID in the editor, so the editor and render schemas match. */
const idAttribute = {
  default: null,
  parseHTML: (element: HTMLElement) => cleanId(element.getAttribute('data-id')),
  renderHTML: (attrs: Record<string, unknown>) => (typeof attrs.id === 'string' && attrs.id ? { 'data-id': attrs.id } : {}),
};

function childText(element: HTMLElement, selector: string): string {
  return element.querySelector(selector)?.textContent ?? '';
}

function sourceOf(element: HTMLElement): string | null {
  return element.getAttribute('data-url') ?? element.getAttribute('src') ?? element.getAttribute('url') ?? element.getAttribute('data-oembed-url');
}

/** Parse rules for a pasted or imported player: our own figure, a bare iframe, and CKEditor-style oEmbed elements. */
function sourceRules(own: string, read: (element: HTMLElement) => Record<string, unknown> | false) {
  const getAttrs = (node: string | HTMLElement) => (typeof node === 'string' ? false : read(node));
  return [
    { tag: own, getAttrs },
    { tag: 'iframe[src]', getAttrs },
    { tag: 'oembed[url]', getAttrs },
    { tag: 'div[data-oembed-url]', getAttrs },
  ];
}

/** The `video` node: a YouTube or Vimeo video, stored as validated ids. */
export const Video = Node.create<EmbedNodeOptions>({
  name: 'video',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  isolating: true,

  addOptions: defaultRenderOptions,

  addAttributes() {
    return {
      id: idAttribute,
      provider: plain<'youtube' | 'vimeo'>('youtube'),
      videoId: plain(''),
      hash: plain<string | null>(null),
      vertical: plain(false),
      start: plain<number | null>(null),
      title: plain(''),
      description: plain(''),
      thumbnailUrl: plain<string | null>(null),
    };
  },

  parseHTML() {
    return sourceRules('figure[data-pc-video]', (element) => {
      const video = parseVideoUrl(sourceOf(element) ?? '');
      if (!video) return false;
      const thumb = element.querySelector('img.pc-embed-thumb')?.getAttribute('src');
      return {
        ...video,
        title: cleanLine(childText(element, '.pc-embed-title') || element.getAttribute('title'), titleMax),
        description: cleanText(childText(element, '.pc-embed-description'), videoDescriptionMax),
        thumbnailUrl: isVideoThumbnail(video.provider, thumb) ? thumb : null,
      };
    });
  },

  renderHTML({ node, HTMLAttributes }) {
    return videoSpec(node.attrs, this.options, HTMLAttributes);
  },

  postCanvasSanitize: sanitizeVideoAttrs,
});

/** Builds the `embed` node for a set of allowed providers. */
export function createEmbedNode(allowed: readonly string[]) {
  return Node.create<EmbedNodeOptions>({
    name: 'embed',
    group: 'block',
    atom: true,
    draggable: true,
    selectable: true,
    isolating: true,

    addOptions: defaultRenderOptions,

    addAttributes() {
      return {
        id: idAttribute,
        provider: plain(''),
        ref: plain<Record<string, string>>({}),
        url: plain(''),
        title: plain(''),
        aspectRatio: plain<number | null>(null),
      };
    },

    parseHTML() {
      return sourceRules('figure[data-pc-embed]', (element) => {
        const match = matchEmbedUrl(sourceOf(element) ?? '', allowed);
        if (!match) return false;
        return {
          provider: match.provider.name,
          ref: match.ref,
          url: match.url,
          title: cleanLine(childText(element, '.pc-embed-title') || element.getAttribute('title'), titleMax),
          aspectRatio: match.provider.aspectRatio,
        };
      });
    },

    renderHTML({ node, HTMLAttributes }) {
      return embedSpec(node.attrs, this.options, HTMLAttributes);
    },

    postCanvasSanitize: (attrs) => sanitizeEmbedAttrs(attrs, allowed),
  });
}

/** The `embed` node with every built-in provider allowed. Use `embedsSchema(features)` to follow the features. */
export const Embed = createEmbedNode(builtInEmbedProviderNames);

/** The `linkCard` node: a preview of a web page. */
export const LinkCard = Node.create<EmbedNodeOptions>({
  name: 'linkCard',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  isolating: true,

  addOptions: defaultRenderOptions,

  addAttributes() {
    return {
      id: idAttribute,
      url: plain(''),
      title: plain(''),
      description: plain(''),
      image: plain<string | null>(null),
      siteName: plain<string | null>(null),
      favicon: plain<string | null>(null),
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-pc-link-card]',
        getAttrs: (element: HTMLElement) =>
          sanitizeLinkCardAttrs({
            url: element.getAttribute('data-url') ?? element.querySelector('a')?.getAttribute('href'),
            title: childText(element, '.pc-link-card-title'),
            description: cleanText(childText(element, '.pc-link-card-description'), linkDescriptionMax),
            image: element.querySelector('img.pc-link-card-image')?.getAttribute('src') ?? null,
            siteName: cleanLine(element.querySelector('.pc-link-card-site')?.textContent, siteNameMax),
            favicon: element.querySelector('img.pc-link-card-favicon')?.getAttribute('src') ?? null,
          }) ?? false,
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return linkCardSpec(node.attrs, this.options, HTMLAttributes);
  },

  postCanvasSanitize: sanitizeLinkCardAttrs,
});

/**
 * The transient `embedInput` node: the inline "paste a link" field. It is never part of a saved document: it renders
 * to nothing visible, nothing parses into it, and the sanitizer drops it.
 */
export const EmbedInput = Node.create({
  name: 'embedInput',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      id: { default: null, rendered: false, parseHTML: () => null },
      value: plain(''),
      status: plain<'idle' | 'loading' | 'error'>('idle'),
      error: plain<string | null>(null),
      kind: plain<'any' | 'video' | 'embed' | 'link'>('any'),
    };
  },

  parseHTML() {
    return [];
  },

  renderHTML() {
    return ['div', { 'data-pc-embed-input': '', hidden: 'hidden' }];
  },

  postCanvasSanitize: () => null,
});

/** The embed providers the features allow. */
export function allowedEmbedProviders(features: Features): string[] {
  return features.embed ? [...features.embed.providers] : [];
}

/** The render-safe embed extensions for a feature set, optionally with render options for the static HTML. */
export function embedsSchema(features: Features, options: Partial<EmbedNodeOptions> = {}): AnyExtension[] {
  const configured = { ...defaultRenderOptions(), ...options };
  const extensions: AnyExtension[] = [];
  if (features.video) extensions.push(Video.configure(configured));
  if (features.embed) extensions.push(createEmbedNode(allowedEmbedProviders(features)).configure(configured));
  if (features.linkCard) extensions.push(LinkCard.configure(configured));
  if (features.video || features.embed || features.linkCard) extensions.push(EmbedInput);
  return extensions;
}
