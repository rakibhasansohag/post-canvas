import { presets } from '../text/presets';
import { warnOnce } from './dev';
import type { Adapters, FeatureOverrides, Features, PresetName } from './types';

/** The embed providers built in to the package. */
export const builtInEmbedProviderNames: readonly string[] = [
  'spotify',
  'soundcloud',
  'x',
  'instagram',
  'tiktok',
  'codepen',
  'loom',
  'figma',
  'google-maps',
];

/** Every feature on: the `full` preset. */
export const defaultFeatures: Features = {
  bold: true,
  italic: true,
  underline: true,
  strike: true,
  code: true,
  link: true,
  highlight: true,
  color: true,
  subscript: true,
  superscript: true,
  textAlign: true,
  heading: { levels: [1, 2, 3, 4] },
  bulletList: true,
  orderedList: true,
  taskList: true,
  blockquote: true,
  codeBlock: true,
  horizontalRule: true,
  table: true,
  mention: true,
  hashtag: true,
  image: true,
  gallery: { layouts: ['carousel', 'grid', 'masonry', 'collage'], maxPhotos: 10 },
  file: true,
  video: true,
  embed: { providers: [...builtInEmbedProviderNames] },
  linkCard: true,
  toolbar: true,
  bubbleMenu: true,
  slashMenu: true,
  insertButton: true,
  blockHandle: true,
  statusBar: true,
  title: false,
  cover: false,
};

// What each preset changes from `full`, from `text/presets.ts`.
const presetOverrides = (preset: PresetName): FeatureOverrides => presets[preset]?.features ?? {};

const uploadFeatures = ['image', 'gallery', 'file'] as const;

/**
 * Builds the complete feature set: `full`, then the preset's changes, then `overrides`. A key set to `undefined` in
 * `overrides` is ignored.
 *
 * Pass `context.adapters` to apply the upload rule: without an upload adapter, image, gallery and file are turned off
 * unless `overrides` sets them explicitly, with a dev-only console warning that says why.
 */
export function resolveFeatures(
  preset: PresetName = 'full',
  overrides: FeatureOverrides = {},
  context?: { adapters?: Adapters },
): Features {
  const resolved: Features = { ...defaultFeatures };
  const apply = (changes: FeatureOverrides) => {
    for (const key of Object.keys(changes) as (keyof Features)[]) {
      const value = changes[key];
      if (value !== undefined) (resolved as Record<keyof Features, unknown>)[key] = value;
    }
  };
  apply(presetOverrides(preset));
  apply(overrides);

  if (context && !context.adapters?.upload) {
    const hidden = uploadFeatures.filter((key) => overrides[key] === undefined && resolved[key] !== false);
    for (const key of hidden) resolved[key] = false;
    if (hidden.length > 0) {
      warnOnce(
        'no-upload-adapter',
        `No upload adapter, so ${hidden.join(', ')} ${hidden.length === 1 ? 'is' : 'are'} off. Pass adapters.upload, or set the feature explicitly.`,
      );
    }
  }
  return resolved;
}
