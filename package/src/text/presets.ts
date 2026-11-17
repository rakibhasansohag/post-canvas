// The four presets: which features each turns on, its default limits and its classifier. `core/features.ts` reads the
// feature changes from here.
import type { FeatureOverrides, PresetName } from '../core/types';
import { articleClassifier, socialClassifier, type Classifier } from './classify';
import type { Limits } from './limits';

/** One preset: its changes from `full`, its default limits and its classifier. */
export interface PresetDefinition {
  /** What it changes from the `full` feature set. */
  features: FeatureOverrides;
  /** Default limits. The `limits` prop replaces them. */
  limits: Limits;
  /** Default classifier, or `null` for none. The `classify` prop replaces it. */
  classifier: Classifier | null;
}

/** Text-only switches the social and comment presets turn off. */
const plainText: FeatureOverrides = {
  underline: false,
  strike: false,
  code: false,
  highlight: false,
  color: false,
  subscript: false,
  superscript: false,
  textAlign: false,
  heading: false,
  blockquote: false,
  codeBlock: false,
  horizontalRule: false,
  table: false,
  taskList: false,
};

/**
 * The presets:
 * - `full`: everything on.
 * - `article`: everything, plus the title and cover fields. A document with content needs a title.
 * - `social`: a social composer. Bold, italic, links, lists, mentions, hashtags, photos, galleries, video, embeds and
 *   link cards; no headings, tables, code or task lists. The status bar shows the post kind, and the title and cover
 *   appear once the document becomes an article.
 * - `comment`: paragraphs, bold, italic, links and mentions, with no chrome but the selection menu.
 */
export const presets: Readonly<Record<PresetName, PresetDefinition>> = {
  full: { features: {}, limits: {}, classifier: null },
  article: { features: { title: true, cover: true }, limits: {}, classifier: articleClassifier },
  social: {
    features: { ...plainText, file: false, title: true, cover: true },
    limits: {},
    classifier: socialClassifier,
  },
  comment: {
    features: {
      ...plainText,
      bulletList: false,
      orderedList: false,
      hashtag: false,
      image: false,
      gallery: false,
      file: false,
      video: false,
      embed: false,
      linkCard: false,
      toolbar: false,
      slashMenu: false,
      insertButton: false,
      blockHandle: false,
      statusBar: false,
      title: false,
      cover: false,
    },
    limits: { maxCharacters: 2000 },
    classifier: null,
  },
};
