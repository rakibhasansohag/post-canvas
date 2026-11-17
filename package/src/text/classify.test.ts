import { describe, expect, it } from 'vitest';
import { createTranslator } from '../core/i18n';
import type { JSONContent } from '../core/types';
import en from '../locales/en/index';
import { articleReason, classifySocial, kindSummary, socialKind } from './classify';
import { countWords, getDocStats } from './stats';

const t = createTranslator(en);
const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ');
const p = (text: string): JSONContent =>
  text ? { type: 'paragraph', content: [{ type: 'text', text }] } : { type: 'paragraph' };
const image = (): JSONContent => ({
  type: 'image',
  attrs: { id: 'i', src: 'https://a.co/x.jpg', width: 10, height: 10 },
});
const gallery = (count: number, layout = 'carousel'): JSONContent => ({
  type: 'gallery',
  attrs: { id: 'g', layout, photos: Array.from({ length: count }, (_, i) => ({ key: `k${i}` })) },
});
const video = (videoId = 'abc'): JSONContent => ({ type: 'video', attrs: { id: 'v', provider: 'vimeo', videoId } });
const embedInput = (): JSONContent => ({ type: 'embedInput', attrs: { id: 'e', value: '' } });
const doc = (...content: JSONContent[]): JSONContent => ({ type: 'doc', content });
const kind = (json: JSONContent) => socialKind(getDocStats(json));

describe('social kind', () => {
  it('is empty with nothing to post', () => {
    expect(kind(doc(p('')))).toBeNull();
    expect(kind(doc(p('  ')))).toBeNull();
  });

  it('is a text post for text alone, across several paragraphs', () => {
    expect(kind(doc(p('Hello')))).toBe('text');
    expect(kind(doc(p('Fog'), p(''), p('Rain')))).toBe('text');
  });

  it('counts photos that are still uploading', () => {
    expect(kind(doc({ type: 'image', attrs: { id: 'i', src: 'blob:https://a.co/1', uploadKey: 'u1' } }))).toBe('photo');
  });

  it('ignores an unfinished video between two runs, so the text stays one post', () => {
    expect(kind(doc(p('Fog'), embedInput(), p('Rain')))).toBe('text');
    expect(kind(doc(p('Fog'), video(''), p('Rain')))).toBe('text');
  });

  it('ignores a video box nobody has pasted a link into yet', () => {
    expect(kind(doc(p('Fog at the top'), gallery(1), embedInput()))).toBe('photo');
  });

  it('keeps the photos first when the caption comes after them', () => {
    expect(kind(doc(p(''), gallery(1), p('Caption')))).toBe('photo');
  });

  it('makes text before and after the media an article', () => {
    expect(kind(doc(p('Before'), image(), p('After')))).toBe('article');
  });

  it('makes a second media block an article', () => {
    expect(kind(doc(gallery(1), video()))).toBe('article');
  });

  it('makes more than 500 words an article', () => {
    expect(kind(doc(p(words(500))))).toBe('text');
    expect(kind(doc(p(words(501))))).toBe('article');
  });

  it('names video and embed posts', () => {
    expect(kind(doc(p('Look'), video()))).toBe('video');
    expect(kind(doc({ type: 'embed', attrs: { id: 'x', provider: 'spotify', ref: {}, url: 'https://x.co' } }))).toBe(
      'embed',
    );
  });
});

describe('summary and reason', () => {
  it.each([
    [doc(p('')), 'Nothing to post yet'],
    [doc(p('Hello')), 'Text post'],
    [doc(image()), 'Photo post · 1 photo'],
    [doc(gallery(3, 'masonry')), 'Photo post · 3 photos · Masonry'],
    [doc(video()), 'Video post'],
    [doc(p(words(501))), 'Article · 501 words · 3 min read'],
  ])('%# → %s', (json, want) => {
    expect(kindSummary(json, getDocStats(json), t)).toBe(want);
  });

  it('names the word count', () => {
    expect(articleReason(getDocStats(doc(p(words(501)))), t)).toBe('it has 501 words, and posts hold up to 500');
  });

  it('names a second media block', () => {
    expect(articleReason(getDocStats(doc(p(''), gallery(1), p(''), video(), p(''))), t)).toBe(
      'it has more than one media block',
    );
  });

  it('names text on both sides of the media', () => {
    expect(articleReason(getDocStats(doc(p('Before'), gallery(1), p('After'))), t)).toBe(
      'it has text before and after the media',
    );
  });

  it('is null for a post', () => {
    expect(articleReason(getDocStats(doc(p('Hello'), gallery(1), p(''))), t)).toBeNull();
  });

  it('shows and requires the title only for an article', () => {
    expect(classifySocial(doc(p('Short')), t)).toMatchObject({ showFields: false, requireTitle: false });
    expect(classifySocial(doc(p('A'), image(), p('B')), t)).toMatchObject({ showFields: true, requireTitle: true });
  });
});

describe('word count', () => {
  it('counts letters and digits in any script, not punctuation', () => {
    expect(countWords('Hello — world')).toBe(2);
    expect(countWords('Grüße aus München')).toBe(3);
    expect(countWords('Привет мир 2026')).toBe(3);
    expect(countWords('مرحبا بالعالم')).toBe(2);
    expect(countWords('… — !')).toBe(0);
  });

  it('counts mentions as words and graphemes as characters', () => {
    const stats = getDocStats(
      doc({
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Hi ' },
          { type: 'mention', attrs: { id: 'ada', label: 'Ada Lovelace', mentionSuggestionChar: '@' } },
          { type: 'text', text: ' 👋🏽' },
        ],
      }),
    );
    expect(stats.words).toBe(2);
    expect(stats.mentions).toBe(1);
    expect(stats.characters).toBe('Hi @Ada_Lovelace '.length + 1);
  });
});
