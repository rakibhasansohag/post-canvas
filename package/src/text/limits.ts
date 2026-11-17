// Document limits: too many words, characters, media blocks or photos become problems, and media insert items turn
// disabled at the cap.
import type { InsertItem, Problem, Translator } from '../core/types';
import type { DocStats } from './stats';

/** Caps on a document. Every one is optional; leave one out for no cap. */
export interface Limits {
  maxWords?: number;
  maxCharacters?: number;
  /** Media blocks of any kind (photo, video, embed, link card, file). */
  maxMedia?: number;
  /** Photos across every image and gallery. */
  maxPhotos?: number;
}

/** At most this many mentions and hashtags together in one document. More stay plain text. */
export const maxMentions = 20;

const photoItems = new Set(['image', 'gallery']);

/** The problems a document's statistics break against `limits`. */
export function limitProblems(stats: DocStats, limits: Limits, t: Translator): Problem[] {
  const problems: Problem[] = [];
  if (limits.maxWords !== undefined && stats.words > limits.maxWords) {
    problems.push({
      code: 'limit.words',
      severity: 'error',
      message: t('text.limit.words', { count: stats.words, max: limits.maxWords }),
    });
  }
  if (limits.maxCharacters !== undefined && stats.characters > limits.maxCharacters) {
    problems.push({
      code: 'limit.characters',
      severity: 'error',
      message: t('text.limit.characters', { count: stats.characters, max: limits.maxCharacters }),
    });
  }
  if (limits.maxMedia !== undefined && stats.mediaBlocks > limits.maxMedia) {
    problems.push({
      code: 'limit.media',
      severity: 'error',
      message: t('text.limit.media', { count: stats.mediaBlocks, max: limits.maxMedia }),
    });
  }
  if (limits.maxPhotos !== undefined && stats.photos > limits.maxPhotos) {
    problems.push({
      code: 'limit.photos',
      severity: 'error',
      message: t('text.limit.photos', { count: stats.photos, max: limits.maxPhotos }),
    });
  }
  if (stats.mentions + stats.hashtags > maxMentions) {
    problems.push({
      code: 'limit.mentions',
      severity: 'error',
      message: t('text.limit.mentions', { max: maxMentions }),
    });
  }
  return problems;
}

/** True when `item` would break a cap: media at `maxMedia`, photos at `maxPhotos`. */
export function isInsertCapped(item: Pick<InsertItem, 'id' | 'group'>, stats: DocStats, limits: Limits): boolean {
  const media = item.group === 'media' || item.group === 'embeds';
  if (!media) return false;
  if (limits.maxMedia !== undefined && stats.mediaBlocks >= limits.maxMedia) return true;
  return photoItems.has(item.id) && limits.maxPhotos !== undefined && stats.photos >= limits.maxPhotos;
}
