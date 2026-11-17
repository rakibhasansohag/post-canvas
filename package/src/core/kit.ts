import type { AnyExtension } from '@tiptap/core';
import UniqueID from '@tiptap/extension-unique-id';
import { embedsKit, type EmbedsKitOptions } from '../embeds/kit';
import { mediaKit } from '../media/kit';
import { textKit } from '../text/kit';
import { PostCanvasCore, type PostCanvasCoreOptions } from './extension';
import { defaultFeatures } from './features';
import { createId } from './ids';
import type { Features } from './types';

/** The node types that carry a unique `id`. */
export const idNodeTypes: readonly string[] = ['image', 'gallery', 'file', 'video', 'embed', 'linkCard'];

/** Options of `postCanvasKit()`: the core extension's options, plus the embed kit's. */
export type PostCanvasKitOptions = Partial<Omit<PostCanvasCoreOptions, 'features'>> & EmbedsKitOptions;

/**
 * Every editor extension for a feature set: the core, unique ids, and the text, media and embed kits with their node
 * views, commands, shortcuts, insert items and problems. `options.embedConsent` sets whether players load before a
 * click (default `click`).
 */
export function postCanvasKit(
  features: Features = defaultFeatures,
  options: PostCanvasKitOptions = {},
): AnyExtension[] {
  const { embedConsent, ...core } = options;
  return [
    PostCanvasCore.configure({ ...core, features }),
    UniqueID.configure({ types: [...idNodeTypes], generateID: () => createId() }),
    ...textKit(features),
    ...mediaKit(features),
    ...embedsKit(features, embedConsent ? { embedConsent } : {}),
  ];
}
