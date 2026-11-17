import { describe, expect, it } from 'vitest';
import { defaultFeatures } from '../core/features';
import type { JSONContent } from '../core/types';
import { sanitizeDocument } from '../output/sanitize';
import { validateDocument } from './validate';

const paragraph = (text: string): JSONContent => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const clean = (doc: JSONContent) => sanitizeDocument(doc).doc;

describe('validateDocument', () => {
  it('accepts a clean document', () => {
    const doc = clean({
      type: 'doc',
      content: [paragraph('Hello'), { type: 'video', attrs: { id: 'v1', provider: 'youtube', videoId: 'dQw4w9WgXcQ' } }],
    });
    expect(validateDocument(doc)).toEqual({ ok: true, errors: [] });
  });

  it('refuses the paste-a-link field', () => {
    const result = validateDocument({ type: 'doc', content: [paragraph('a'), { type: 'embedInput', attrs: { value: '' } }] });
    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({ code: 'transient', type: 'embedInput' }));
  });

  it('refuses upload keys and blob sources anywhere in the attributes', () => {
    const doc = clean({ type: 'doc', content: [paragraph('a')] });
    const withKey = { ...doc, content: [...(doc.content ?? []), { type: 'mystery', attrs: { photos: [{ uploadKey: 'u1' }] } }] };
    expect(validateDocument(withKey).errors.some((error) => error.code === 'transient')).toBe(true);
    const withBlob = { ...doc, content: [{ type: 'paragraph', attrs: { src: 'blob:https://example.com/1' }, content: [] }] };
    expect(validateDocument(withBlob).errors.some((error) => error.code === 'transient')).toBe(true);
  });

  it('enforces the caps', () => {
    const big = { type: 'doc', content: Array.from({ length: 30 }, (_, i) => paragraph(`p${i}`)) };
    expect(validateDocument(big, { limits: { maxNodes: 20 } }).errors).toContainEqual(
      expect.objectContaining({ code: 'limit-nodes' }),
    );
    expect(validateDocument({ type: 'doc', content: [paragraph('x'.repeat(200))] }, { limits: { maxTextLength: 100 } }).ok).toBe(false);
    let nested: JSONContent = paragraph('deep');
    for (let i = 0; i < 20; i++) nested = { type: 'blockquote', content: [nested] };
    expect(validateDocument({ type: 'doc', content: [nested] }, { limits: { maxDepth: 5 } }).errors).toContainEqual(
      expect.objectContaining({ code: 'limit-depth' }),
    );
  });

  it('refuses unknown nodes, unsafe links and tampered embeds', () => {
    expect(validateDocument({ type: 'doc', content: [{ type: 'script', content: [] }] }).ok).toBe(false);
    const link = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }] }] };
    expect(validateDocument(link).ok).toBe(false);
    const embed = clean({ type: 'doc', content: [{ type: 'embed', attrs: { provider: 'x', ref: { user: 'jack', id: '20' } } }] });
    expect(validateDocument(embed).ok).toBe(true);
    const tampered = JSON.parse(JSON.stringify(embed).replace('https://x.com/jack/status/20', 'https://evil.com/')) as JSONContent;
    expect(validateDocument(tampered).errors).toContainEqual(expect.objectContaining({ code: 'changed' }));
  });

  it('refuses features that are off', () => {
    const doc = clean({ type: 'doc', content: [{ type: 'video', attrs: { provider: 'youtube', videoId: 'dQw4w9WgXcQ' } }] });
    expect(validateDocument(doc, { features: { ...defaultFeatures, video: false } }).ok).toBe(false);
  });

  it('returns errors instead of throwing on malformed input', () => {
    let deep: JSONContent = paragraph('x');
    for (let i = 0; i < 20_000; i++) deep = { type: 'blockquote', content: [deep] };
    for (const input of [{ type: 'doc', content: {} }, { type: 'doc', content: 5 }, { type: 'doc', content: [null] }, { type: 'doc', content: [deep] }]) {
      expect(() => validateDocument(input)).not.toThrow();
      expect(validateDocument(input).ok).toBe(false);
    }
  });

  it('refuses things that are not documents', () => {
    expect(validateDocument('hello').errors[0]?.code).toBe('not-a-document');
  });
});
