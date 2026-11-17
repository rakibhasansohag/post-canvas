import { describe, expect, it } from 'vitest';
import { createTranslator } from './i18n';

const en = {
  code: 'en',
  messages: {
    'core.test.name': 'Hello, {name}!',
    'core.test.count': '{n, number} items',
    'core.test.plural': '{n, plural, =0 {No photos} one {# photo} other {# photos}}',
    'core.test.select': '{kind, select, image {Picture} file {Attachment} other {Block}}',
    'core.test.nested': '{who} added {n, plural, one {a photo} other {{n, number} photos}}',
    'core.test.only-en': 'English only',
    'core.test.broken': 'Oops {n, plural, one {x}',
  },
};

describe('createTranslator', () => {
  const t = createTranslator(en, en);

  it('fills placeholders, numbers, plurals and selects', () => {
    expect(t('core.test.name', { name: 'Ada' })).toBe('Hello, Ada!');
    expect(t('core.test.count', { n: 1234 })).toBe('1,234 items');
    expect(t('core.test.plural', { n: 0 })).toBe('No photos');
    expect(t('core.test.plural', { n: 1 })).toBe('1 photo');
    expect(t('core.test.plural', { n: 2500 })).toBe('2,500 photos');
    expect(t('core.test.select', { kind: 'file' })).toBe('Attachment');
    expect(t('core.test.select', { kind: 'video' })).toBe('Block');
    expect(t('core.test.nested', { who: 'Ada', n: 3 })).toBe('Ada added 3 photos');
  });

  it('falls back to English, then to the key', () => {
    const de = createTranslator({ code: 'de', messages: { 'core.test.count': '{n, number} Einträge' } }, en);
    expect(de('core.test.count', { n: 1234 })).toBe('1.234 Einträge');
    expect(de('core.test.only-en')).toBe('English only');
    expect(de('core.test.missing')).toBe('core.test.missing');
  });

  it('keeps a malformed message as text instead of throwing', () => {
    expect(t('core.test.broken', { n: 1 })).toBe('Oops {n, plural, one {x}');
  });
});
