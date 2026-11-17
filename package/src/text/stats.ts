// Document statistics: words, characters, read time, text runs and media counts. Pure, so it runs anywhere, on JSON.
import type { JSONContent } from '../core/types';

/** Words a reader gets through per minute, for the read time. */
export const wordsPerMinute = 220;

/** Media counts by kind. `image` and `gallery` count as `photo`, `linkCard` as `link`. */
export interface MediaCounts {
  photo: number;
  video: number;
  embed: number;
  link: number;
  file: number;
}

/** What `getDocStats` reports. */
export interface DocStats {
  /** Unicode-aware: tokens with a letter or digit. A mention or hashtag counts as one word. */
  words: number;
  /** Characters a reader sees (grapheme clusters where `Intl.Segmenter` exists), line breaks excluded. */
  characters: number;
  /** At least 1 when there are words; 0 for an empty document. */
  readMinutes: number;
  /** Top-level text blocks that hold words. */
  textBlocks: number;
  /** Groups of text blocks between media that hold words. Media that doesn't count (see `mediaBlocks`) splits nothing. */
  textRuns: number;
  /** Media blocks by kind. */
  media: MediaCounts;
  /** Media blocks that count: unfinished embed fields and videos without an id don't. */
  mediaBlocks: number;
  /** Every photo: one per image plus every gallery photo. */
  photos: number;
  /** `@` mentions. */
  mentions: number;
  /** `#` hashtags. */
  hashtags: number;
}

const wordChar = /[\p{L}\p{N}]/u;

/** Whitespace-separated tokens that contain a letter or a digit ("—" alone is not a word). */
export function countWords(text: string): number {
  let count = 0;
  for (const token of text.split(/\s+/)) if (wordChar.test(token)) count++;
  return count;
}

let segmenter: Intl.Segmenter | null | undefined;

/** Characters as a reader counts them: grapheme clusters, so an emoji or an accented letter counts once. */
export function countCharacters(text: string): number {
  if (segmenter === undefined) {
    segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  }
  if (!segmenter) return Array.from(text).length;
  let count = 0;
  for (const _ of segmenter.segment(text)) count++;
  return count;
}

/** Minutes to read `words`, rounded up, at least 1 (0 for no words). */
export function readMinutes(words: number): number {
  return words > 0 ? Math.max(1, Math.ceil(words / wordsPerMinute)) : 0;
}

/** The kind a media node counts as, `null` for text, or `'skip'` for transient nodes that count as nothing. */
export function mediaKind(node: JSONContent): keyof MediaCounts | 'skip' | null {
  switch (node.type) {
    case 'image':
    case 'gallery':
      return 'photo';
    case 'video':
      return typeof node.attrs?.videoId === 'string' && node.attrs.videoId ? 'video' : 'skip';
    case 'embed':
      return 'embed';
    case 'linkCard':
      return 'link';
    case 'file':
      return 'file';
    case 'embedInput':
      return 'skip';
    default:
      return null;
  }
}

/** The text of a node, with blocks separated by line breaks and mentions as their label. */
function collectText(node: JSONContent, out: { text: string; mentions: number; hashtags: number }): void {
  if (node.type === 'text') {
    out.text += node.text ?? '';
    return;
  }
  if (node.type === 'mention') {
    const hashtag = node.attrs?.mentionSuggestionChar === '#';
    if (hashtag) out.hashtags++;
    else out.mentions++;
    const label = node.attrs?.label ?? node.attrs?.id ?? '';
    out.text += `${hashtag ? '#' : '@'}${String(label).replace(/\s+/g, '_')}`;
    return;
  }
  if (node.type === 'hardBreak') {
    out.text += '\n';
    return;
  }
  for (const child of node.content ?? []) {
    collectText(child, out);
    if (child.type !== 'text' && child.type !== 'mention' && child.type !== 'hardBreak') out.text += '\n';
  }
}

/** Every statistic for a document, from its JSON. */
export function getDocStats(json: JSONContent | null | undefined): DocStats {
  const stats: DocStats = {
    words: 0,
    characters: 0,
    readMinutes: 0,
    textBlocks: 0,
    textRuns: 0,
    media: { photo: 0, video: 0, embed: 0, link: 0, file: 0 },
    mediaBlocks: 0,
    photos: 0,
    mentions: 0,
    hashtags: 0,
  };
  let runHasWords = false;
  const closeRun = () => {
    if (runHasWords) stats.textRuns++;
    runHasWords = false;
  };

  for (const block of json?.content ?? []) {
    const kind = mediaKind(block);
    if (kind === 'skip') continue;
    if (kind) {
      closeRun();
      stats.media[kind]++;
      stats.mediaBlocks++;
      if (block.type === 'image') stats.photos += 1;
      if (block.type === 'gallery') stats.photos += Array.isArray(block.attrs?.photos) ? block.attrs.photos.length : 0;
      continue;
    }
    const out = { text: '', mentions: 0, hashtags: 0 };
    collectText(block, out);
    const words = countWords(out.text);
    stats.words += words;
    stats.characters += countCharacters(out.text.replace(/\n/g, ''));
    stats.mentions += out.mentions;
    stats.hashtags += out.hashtags;
    if (words > 0) {
      stats.textBlocks++;
      runHasWords = true;
    }
  }
  closeRun();
  stats.readMinutes = readMinutes(stats.words);
  return stats;
}
