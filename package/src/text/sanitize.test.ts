// @vitest-environment happy-dom
import { getSchema } from '@tiptap/core';
import { DOMParser as PmDOMParser } from '@tiptap/pm/model';
import { describe, expect, it } from 'vitest';
import { defaultFeatures } from '../core/features';
import { sanitizersFor } from '../core/registry';
import { textSchema } from './schema';
import {
  linkRel,
  sanitizeCodeBlock,
  sanitizeHeading,
  sanitizeHighlight,
  sanitizeLink,
  sanitizeMention,
  sanitizeOrderedList,
  sanitizeTableCell,
  sanitizeTextStyle,
} from './sanitize';

describe('link sanitizer', () => {
  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    ' \tjavascript:alert(1)',
    'java\nscript:alert(1)',
    'java\u0000script:alert(1)',
    'javascript&colon;alert(1)',
    '&#106;avascript:alert(1)',
    '&#x6A;avascript:alert(1)',
    'javascript%3Aalert(1)',
    '%6Aavascript:alert(1)',
    'vbscript:msgbox(1)',
    'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
    'file:///etc/passwd',
    '//evil.example/path',
  ])('drops %j', (href) => {
    expect(sanitizeLink({ href, target: null, rel: null })).toBeNull();
  });

  it('keeps http, https, mailto, tel and relative links', () => {
    for (const href of [
      'https://example.com/a?b=c',
      'http://example.com',
      'mailto:a@b.co',
      'tel:+123',
      '/docs',
      '#top',
    ]) {
      expect(sanitizeLink({ href })?.href).toBe(href);
    }
  });

  it('always gives target="_blank" noopener', () => {
    expect(sanitizeLink({ href: 'https://example.com', target: '_blank', rel: null })?.rel).toBe(
      'noopener noreferrer nofollow',
    );
    expect(sanitizeLink({ href: 'https://example.com', target: '_blank', rel: 'nofollow' })?.rel).toBe(
      'nofollow noopener',
    );
    expect(sanitizeLink({ href: 'https://example.com', target: '_blank', rel: 'opener evil' })?.rel).toBe(
      'noopener noreferrer nofollow',
    );
    expect(linkRel('noreferrer', '_blank')).toContain('noopener');
  });

  it('only allows _blank as a target', () => {
    expect(sanitizeLink({ href: 'https://example.com', target: '_parent' })?.target).toBeNull();
  });

  it('renders _blank links with noopener even when the attrs leave rel out', () => {
    const schema = getSchema(textSchema(defaultFeatures));
    const doc = schema.nodeFromJSON({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'x', marks: [{ type: 'link', attrs: { href: 'https://a.co', target: '_blank' } }] },
          ],
        },
      ],
    });
    const link = doc.firstChild!.firstChild!.marks[0]!;
    const spec = link.type.spec.toDOM!(link, true) as [string, Record<string, string>];
    expect(spec[1].rel).toContain('noopener');
  });

  it('drops a javascript: link when parsing HTML', () => {
    const schema = getSchema(textSchema(defaultFeatures));
    const element = document.createElement('div');
    element.innerHTML = '<p><a href="java&#x09;script:alert(1)">bad</a> <a href="https://ok.example">good</a></p>';
    const doc = PmDOMParser.fromSchema(schema).parse(element);
    const hrefs: string[] = [];
    doc.descendants((node) => {
      for (const mark of node.marks) if (mark.type.name === 'link') hrefs.push(mark.attrs.href as string);
    });
    expect(hrefs).toEqual(['https://ok.example']);
  });
});

describe('colour sanitizers', () => {
  it('drops anything that is not a palette name', () => {
    expect(sanitizeTextStyle({ color: 'red; background:url(https://evil.example/x)' })).toBeNull();
    expect(sanitizeTextStyle({ color: '#ff0000' })).toBeNull();
    expect(sanitizeTextStyle({ color: 'expression(alert(1))' })).toBeNull();
    expect(sanitizeHighlight({ color: 'red; background:url(x)' })).toEqual({ color: null });
  });

  it('keeps palette names', () => {
    expect(sanitizeTextStyle({ color: 'red' })).toEqual({ color: 'red' });
    expect(sanitizeHighlight({ color: 'yellow' })).toEqual({ color: 'yellow' });
  });
});

describe('code language', () => {
  it('drops a bad language', () => {
    expect(sanitizeCodeBlock({ language: 'js" onmouseover="alert(1)' })).toEqual({ language: null });
    expect(sanitizeCodeBlock({ language: 'a'.repeat(21) })).toEqual({ language: null });
    expect(sanitizeCodeBlock({ language: '<script>' })).toEqual({ language: null });
  });

  it('keeps a good one, lower-cased', () => {
    expect(sanitizeCodeBlock({ language: 'TypeScript' })).toEqual({ language: 'typescript' });
    expect(sanitizeCodeBlock({ language: 'c++' })).toEqual({ language: 'c++' });
  });
});

describe('structure sanitizers', () => {
  it('clamps heading levels', () => {
    expect(sanitizeHeading({ level: 9 }).level).toBe(4);
    expect(sanitizeHeading({ level: 'x' }).level).toBe(2);
  });

  it('cleans list starts and table spans', () => {
    expect(sanitizeOrderedList({ start: -5, type: 'disc' })).toEqual({ start: 0, type: null });
    expect(sanitizeTableCell({ colspan: 1e9, rowspan: 'x', colwidth: [100, 200] })).toEqual({
      colspan: 100,
      rowspan: 1,
      colwidth: null,
    });
    expect(sanitizeTableCell({ colspan: 2, rowspan: 1, colwidth: [100, 200] }).colwidth).toEqual([100, 200]);
  });

  it('cleans mentions', () => {
    expect(sanitizeMention({ id: '', label: 'x' })).toBeNull();
    expect(sanitizeMention({ id: 'ada', label: 'Ada', mentionSuggestionChar: '!' })).toEqual({
      id: 'ada',
      label: 'Ada',
      mentionSuggestionChar: '@',
    });
  });

  it('are registered for every text node and mark with attributes', () => {
    const names = Object.keys(sanitizersFor(textSchema(defaultFeatures))).sort();
    expect(names).toEqual(
      [
        'codeBlock',
        'heading',
        'highlight',
        'link',
        'mention',
        'orderedList',
        'paragraph',
        'tableCell',
        'tableHeader',
        'taskItem',
        'textStyle',
      ].sort(),
    );
  });
});
