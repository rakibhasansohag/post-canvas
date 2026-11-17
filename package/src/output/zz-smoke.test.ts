import { it } from 'vitest';
import { renderToHTML } from './html';
import { sanitizeDocument } from './sanitize';
import { toMarkdown, fromMarkdown } from './markdown';
import { toPlainText, excerpt, getCover } from './text';
const doc = { type: 'doc', content: [
  { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Hi <there>' }] },
  { type: 'paragraph', content: [{ type: 'text', text: 'bold', marks: [{ type: 'bold' }] }, { type: 'text', text: ' and ' }, { type: 'text', text: 'link', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }] },
  { type: 'video', attrs: { id: 'v1', provider: 'youtube', videoId: 'dQw4w9WgXcQ', title: 'Song', vertical: false } },
  { type: 'embed', attrs: { provider: 'spotify', ref: { type: 'track', id: '4uLU6hMCjMI75M1A2tKUQC' }, url: 'x' } },
  { type: 'linkCard', attrs: { url: 'https://example.com/a', title: 'Ex', description: 'desc' } },
  { type: 'embedInput', attrs: { value: 'x' } },
  { type: 'weird', content: [{ type: 'text', text: 'kept text' }] },
]};
it('smoke', () => {
  const r = sanitizeDocument(doc);
  console.log(JSON.stringify(r.removed), JSON.stringify(r.doc).slice(0, 1500));
  console.log(renderToHTML(doc));
  console.log(toMarkdown(r.doc));
  console.log(toPlainText(r.doc), '|', excerpt(r.doc, 10), getCover(r.doc));
  console.log(JSON.stringify(fromMarkdown('# Title\n\n**b** _i_ [l](https://x.com)\n\n- a\n- b')));
});
