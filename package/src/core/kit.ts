import type { AnyExtension } from '@tiptap/core';
import UniqueID from '@tiptap/extension-unique-id';
import { embedsKit } from '../embeds/kit';
import { mediaKit } from '../media/kit';
import { textKit } from '../text/kit';
import { PostCanvasCore, type PostCanvasCoreOptions } from './extension';
import { defaultFeatures } from './features';
import { createId } from './ids';
import type { Features } from './types';

/** The node types that carry a unique `id`. */
export const idNodeTypes: readonly string[] = ['image', 'gallery', 'file', 'video', 'embed', 'linkCard'];

/**
 * Every editor extension for a feature set: the core, unique ids, and the text, media and embed kits with their node
 * views, commands, shortcuts, insert items and problems.
 */
export function postCanvasKit(
  features: Features = defaultFeatures,
  core: Partial<Omit<PostCanvasCoreOptions, 'features'>> = {},
): AnyExtension[] {
  return [
    PostCanvasCore.configure({ ...core, features }),
    UniqueID.configure({ types: [...idNodeTypes], generateID: () => createId() }),
    ...textKit(features),
    ...mediaKit(features),
    ...embedsKit(features),
  ];
}
