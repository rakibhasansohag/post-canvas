// Post-or-article classification. The social classifier follows a simple rule: a post is at most one run of text plus
// at most one media block, up to 500 words; anything more is an article, which needs a title and may have a cover.
import type { GalleryLayout, JSONContent, Translator } from '../core/types';
import { getDocStats, mediaKind, type DocStats } from './stats';

/** What a classifier says about a document. */
export interface Classification {
  /** A short name for the kind, such as `text`, `photo`, `video`, `embed` or `article`. `null` when empty. */
  kind: string | null;
  /** The badge, already translated: "Photo post · 3 photos · Masonry", "Article · 612 words · 3 min read". */
  summary: string;
  /** Why it's this kind, already translated, or `null` when there's nothing to explain. */
  reason: string | null;
  /** Shows the title and cover fields. */
  showFields: boolean;
  /** Makes a missing title a problem. */
  requireTitle: boolean;
}

/** What a classifier gets. */
export interface ClassifyInput {
  json: JSONContent;
  stats: DocStats;
  t: Translator;
}

/** Decides what kind of post a document is. Pass one to `PostCanvas`'s `classify` prop. */
export type Classifier = (input: ClassifyInput) => Classification;

/** The kinds the social classifier knows. */
export type SocialKind = 'text' | 'photo' | 'video' | 'embed' | 'article';

/** A post holds at most this many words. One more and it becomes an article. */
export const postMaxWords = 500;

/** The social kind of a document, or `null` when there is nothing to publish yet. */
export function socialKind(stats: DocStats): SocialKind | null {
  if (stats.textRuns === 0 && stats.mediaBlocks === 0) return null;
  if (stats.words > postMaxWords || stats.textRuns > 1 || stats.mediaBlocks > 1) return 'article';
  if (stats.mediaBlocks === 0) return 'text';
  if (stats.media.photo > 0) return 'photo';
  if (stats.media.video > 0) return 'video';
  return 'embed';
}

/** Why the social rules made this an article, or `null` when it isn't one. */
export function articleReason(stats: DocStats, t: Translator): string | null {
  if (socialKind(stats) !== 'article') return null;
  if (stats.words > postMaxWords) return t('text.reason.words', { words: stats.words, max: postMaxWords });
  if (stats.mediaBlocks > 1) return t('text.reason.media');
  return t('text.reason.textAround');
}

function firstPhotoBlock(json: JSONContent): JSONContent | undefined {
  return json.content?.find((block) => mediaKind(block) === 'photo');
}

/** The social badge: "Text post", "Photo post · 3 photos · Masonry", "Article · 612 words · 3 min read". */
export function kindSummary(json: JSONContent, stats: DocStats, t: Translator): string {
  const kind = socialKind(stats);
  if (!kind) return t('text.summary.empty');
  if (kind === 'article') return t('text.summary.article', { words: stats.words, minutes: stats.readMinutes });
  if (kind === 'text') return t('text.summary.text');
  if (kind === 'video') return t('text.summary.video');
  if (kind === 'embed') return t('text.summary.embed');
  const block = firstPhotoBlock(json);
  if (block?.type === 'gallery') {
    const photos = Array.isArray(block.attrs?.photos) ? block.attrs.photos.length : 0;
    const layout = (block.attrs?.layout as GalleryLayout | undefined) ?? 'carousel';
    return t('text.summary.photos', { count: photos, layout: t(`text.layout.${layout}`) });
  }
  return t('text.summary.photos', { count: 1, layout: '' });
}

/** The social classifier: text, photo, video or embed post, or article. Articles show and need the title field. */
export const socialClassifier: Classifier = ({ json, stats, t }) => {
  const kind = socialKind(stats);
  const article = kind === 'article';
  return {
    kind,
    summary: kindSummary(json, stats, t),
    reason: articleReason(stats, t),
    showFields: article,
    requireTitle: article,
  };
};

/**
 * The article classifier: everything is an article, so the title and cover always show, and a document with content
 * needs a title. The `article` preset uses it.
 */
export const articleClassifier: Classifier = ({ stats, t }) => {
  const empty = stats.textRuns === 0 && stats.mediaBlocks === 0;
  return {
    kind: empty ? null : 'article',
    summary: empty
      ? t('text.summary.empty')
      : t('text.summary.article', { words: stats.words, minutes: stats.readMinutes }),
    reason: null,
    showFields: true,
    requireTitle: !empty,
  };
};

/** Classifies a document's JSON with the social rules. A shortcut for tests and servers. */
export function classifySocial(json: JSONContent, t: Translator): Classification {
  return socialClassifier({ json, stats: getDocStats(json), t });
}
