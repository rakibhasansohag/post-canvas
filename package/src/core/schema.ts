import type { AnyExtension } from '@tiptap/core';
import { embedsSchema } from '../embeds/schema';
import { mediaSchema } from '../media/schema';
import { textSchema } from '../text/schema';
import { defaultFeatures } from './features';
import type { Features } from './types';

/**
 * The render-safe schema extensions for a feature set: node and mark names, attributes, parseHTML, renderHTML and
 * sanitizers, with no React, DOM or node views. Use it on the server and for static rendering. For the same features it
 * yields the same schema as `postCanvasKit()`.
 */
export function postCanvasSchema(features: Features = defaultFeatures): AnyExtension[] {
  return [...textSchema(features), ...mediaSchema(features), ...embedsSchema(features)];
}
