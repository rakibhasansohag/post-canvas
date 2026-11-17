// @vitest-environment happy-dom
// The contract between the editor and the renderers: for every preset, the editor's schema is exactly the render
// schema, and a document holding every node and mark survives the trip through every output and back.
import { Editor, getSchema, type JSONContent } from '@tiptap/core';
import type { Schema } from '@tiptap/pm/model';
import { describe, expect, it } from 'vitest';
import { fromHTML } from '../output/from-html';
import { renderToHTML } from '../output/html';
import { fromMarkdown, toMarkdown } from '../output/markdown';
import { sanitizeDocument } from '../output/sanitize';
import { resolveFeatures } from './features';
import { postCanvasKit } from './kit';
import { postCanvasSchema } from './schema';
import type { PresetName } from './types';

const presetNames: PresetName[] = ['full', 'article', 'social', 'comment'];
const upload = { upload: () => Promise.resolve({ src: 'https://cdn.example/a.jpg' }) };

/** Node and mark names with their attributes and defaults: what the JSON format depends on. */
function shape(schema: Schema) {
  const attrs = (spec: Record<string, { default?: unknown }> | undefined) =>
    Object.fromEntries(Object.entries(spec ?? {}).map(([name, attr]) => [name, attr.default ?? null]));
  return {
    nodes: Object.fromEntries(Object.values(schema.nodes).map((type) => [type.name, attrs(type.spec.attrs)])),
    marks: Object.fromEntries(Object.values(schema.marks).map((type) => [type.name, attrs(type.spec.attrs)])),
  };
}

const photo = (key: string, place: unknown = null) => ({
  key,
  src: `https://cdn.example/${key}.jpg`,
  width: 800,
  height: 600,
  alt: `Photo ${key}`,
  srcset: null,
  placeholder: null,
  uploadId: null,
  uploadKey: null,
  place,
});

/** Every node and mark of the full preset. */
const everything: JSONContent = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2, textAlign: null }, content: [{ type: 'text', text: 'Title' }] },
    {
      type: 'paragraph',
      attrs: { textAlign: 'center' },
      content: [
        { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
        { type: 'text', text: ' ' },
        { type: 'text', text: 'italic', marks: [{ type: 'italic' }] },
        { type: 'text', text: ' ' },
        {
          type: 'text',
          text: 'link',
          marks: [{ type: 'link', attrs: { href: 'https://example.com', target: null, rel: null } }],
        },
        { type: 'text', text: ' ' },
        { type: 'text', text: 'code', marks: [{ type: 'code' }] },
        { type: 'text', text: ' ' },
        { type: 'text', text: 'strike', marks: [{ type: 'strike' }] },
        { type: 'hardBreak' },
        { type: 'mention', attrs: { id: 'ada', label: 'Ada', mentionSuggestionChar: '@' } },
        { type: 'text', text: ' ' },
        { type: 'mention', attrs: { id: 'design', label: 'design', mentionSuggestionChar: '#' } },
      ],
    },
    { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Quote' }] }] },
    {
      type: 'bulletList',
      content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'One' }] }] }],
    },
    {
      type: 'orderedList',
      attrs: { start: 3 },
      content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Three' }] }] }],
    },
    { type: 'codeBlock', attrs: { language: 'ts' }, content: [{ type: 'text', text: 'const a = 1;' }] },
    { type: 'horizontalRule' },
    {
      type: 'table',
      content: [
        {
          type: 'tableRow',
          content: [
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }] },
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B' }] }] },
          ],
        },
        {
          type: 'tableRow',
          content: [
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '1' }] }] },
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '2' }] }] },
          ],
        },
      ],
    },
    {
      type: 'image',
      attrs: { id: 'i1', ...photo('i'), caption: 'A caption', align: 'wide' },
    },
    {
      type: 'gallery',
      attrs: {
        id: 'g1',
        layout: 'collage',
        caption: '',
        photos: [photo('a'), photo('b', { x: 0.5, y: 0.5, w: 0.4, r: 10 })],
      },
    },
    {
      type: 'video',
      attrs: { id: 'v1', provider: 'youtube', videoId: 'dQw4w9WgXcQ', vertical: false, title: 'Video' },
    },
    {
      type: 'linkCard',
      attrs: { id: 'l1', url: 'https://example.com/post', title: 'A post', description: 'About it', image: null },
    },
  ],
};

describe('editor schema and render schema', () => {
  for (const preset of presetNames) {
    it(`match for the ${preset} preset`, () => {
      const features = resolveFeatures(preset, {}, { adapters: { upload } });
      const editor = new Editor({ extensions: postCanvasKit(features) });
      try {
        expect(shape(editor.schema)).toEqual(shape(getSchema(postCanvasSchema(features))));
      } finally {
        editor.destroy();
      }
    });
  }
});

describe('a document with every node and mark', () => {
  const features = resolveFeatures('full', {}, { adapters: { upload } });
  const clean = sanitizeDocument(everything, { features });

  it('is clean as it is', () => {
    expect(clean.removed).toEqual([]);
  });

  it('round-trips through the editor, renderToHTML and fromHTML', () => {
    const editor = new Editor({ extensions: postCanvasKit(features), content: clean.doc });
    try {
      const json = editor.getJSON();
      expect(sanitizeDocument(json, { features }).doc).toEqual(clean.doc);
      const html = renderToHTML(json, { features, wrapper: false });
      expect(fromHTML(html, { features })).toEqual(clean.doc);
      expect(editor.getHTML().length).toBeGreaterThan(0);
    } finally {
      editor.destroy();
    }
  });

  it('keeps its text, marks and mentions through Markdown', () => {
    const markdown = toMarkdown(clean.doc);
    expect(markdown).toContain('**bold**');
    expect(markdown).toContain('[link](https://example.com)');
    expect(markdown).toContain('@Ada');
    expect(markdown).toContain('| A | B |');
    const back = fromMarkdown(markdown, { features });
    expect(toMarkdown(back)).toContain('[link](https://example.com)');
  });
});
