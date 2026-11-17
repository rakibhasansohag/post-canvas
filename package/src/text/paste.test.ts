// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getSchema } from '@tiptap/core';
import { Fragment, DOMParser as PmDOMParser, Slice, type Node as PmNode } from '@tiptap/pm/model';
import { describe, expect, it } from 'vitest';
import { defaultFeatures } from '../core/features';
import { sanitizersFor } from '../core/registry';
import { cleanOwnHTML, cleanPastedHTML, plainTextSlice, sanitizeSlice } from './paste';
import { textSchema } from './schema';

const fixture = (name: string) => readFileSync(resolve(import.meta.dirname, '../../playground/fixtures', name), 'utf8');
const schema = getSchema(textSchema(defaultFeatures));

function parse(html: string): PmNode {
  const element = document.createElement('div');
  element.innerHTML = html;
  return PmDOMParser.fromSchema(schema).parse(element);
}

function types(doc: PmNode): string[] {
  const out: string[] = [];
  doc.descendants((node) => {
    out.push(node.type.name);
    return true;
  });
  return out;
}

function noise(html: string) {
  const element = document.createElement('div');
  element.innerHTML = html;
  const all = Array.from(element.querySelectorAll('*'));
  return {
    style: all.filter((el) => el.hasAttribute('style')).length,
    class: all.filter((el) => el.hasAttribute('class')).length,
    handlers: all.filter((el) => Array.from(el.attributes).some((attr) => attr.name.startsWith('on'))).length,
    scripts: element.querySelectorAll('script, style, meta, xml').length,
    office: /o:p|mso-|<!--|MsoNormal|docs-internal-guid/i.test(html),
  };
}

describe('Word paste', () => {
  const clean = cleanPastedHTML(fixture('word.html'));
  const doc = parse(clean);
  const kinds = types(doc);

  it('loses styles, classes, handlers, scripts and Office markup', () => {
    expect(noise(clean)).toEqual({ style: 0, class: 0, handlers: 0, scripts: 0, office: false });
  });

  it('keeps headings, including the title style', () => {
    const headings: string[] = [];
    doc.descendants((node) => {
      if (node.type.name === 'heading') headings.push(`${node.attrs.level as number}:${node.textContent}`);
    });
    expect(headings).toEqual(['1:Quarterly field notes', '1:Summary', '2:Key points', '2:Next steps']);
  });

  it('rebuilds lists, nested and numbered, without the marker characters', () => {
    expect(kinds).toContain('bulletList');
    expect(kinds).toContain('orderedList');
    const items: string[] = [];
    doc.descendants((node) => {
      if (node.type.name === 'listItem') items.push(node.firstChild?.textContent ?? '');
    });
    expect(items).toEqual([
      'Costs fell by a tenth',
      'Two new regions opened',
      'North and east',
      'Hire two engineers',
      'Ship the new editor',
    ]);
    // The level-2 item sits inside the second bullet.
    expect(clean).toMatch(/<li><p>Two new regions opened<\/p><ul><li><p>North and east/);
  });

  it('keeps tables, links and inline marks, and drops the unsafe link', () => {
    expect(kinds).toContain('table');
    expect(kinds.filter((kind) => kind === 'tableCell' || kind === 'tableHeader').length).toBe(4);
    const marks = new Set<string>();
    const hrefs: string[] = [];
    doc.descendants((node) => {
      for (const mark of node.marks) {
        marks.add(mark.type.name);
        if (mark.type.name === 'link') hrefs.push(mark.attrs.href as string);
      }
    });
    expect(hrefs).toEqual(['https://example.com/report']);
    expect([...marks].sort()).toEqual(['bold', 'italic', 'link', 'underline']);
    expect(doc.textContent).toContain('A link that must not survive and plain text after it.');
  });

  it('drops the empty spacer paragraphs', () => {
    let empty = 0;
    doc.forEach((node) => {
      if (node.type.name === 'paragraph' && node.content.size === 0) empty++;
    });
    expect(empty).toBe(0);
  });
});

describe('Google Docs paste', () => {
  const clean = cleanPastedHTML(fixture('google-docs.html'));
  const doc = parse(clean);
  const kinds = types(doc);

  it('loses styles, classes, handlers, the guid wrapper and scripts', () => {
    expect(noise(clean)).toEqual({ style: 0, class: 0, handlers: 0, scripts: 0, office: false });
    expect(clean).not.toContain('onerror');
  });

  it('keeps headings and lists', () => {
    expect(kinds.filter((kind) => kind === 'heading').length).toBe(2);
    expect(kinds).toContain('orderedList');
    expect(kinds).toContain('bulletList');
    expect(doc.textContent).toContain('Invite waitlist');
  });

  it('turns styled spans into marks without making everything bold', () => {
    const bold: string[] = [];
    const marks = new Set<string>();
    doc.descendants((node) => {
      for (const mark of node.marks) {
        marks.add(mark.type.name);
        if (mark.type.name === 'bold' && node.isText) bold.push(node.text ?? '');
      }
    });
    expect(bold).toEqual(['three stages', 'Stage', 'Date']);
    for (const name of ['italic', 'link', 'superscript', 'strike']) expect(marks).toContain(name);
  });

  it('keeps the table and the link', () => {
    expect(kinds).toContain('table');
    expect(clean).toContain('href="https://www.example.com/launch"');
  });
});

describe('copied from the editor itself', () => {
  it('keeps the data attributes mentions and task lists need', () => {
    const html =
      '<p><span data-type="mention" data-id="ada" data-label="Ada" style="color:red" onclick="x()">@Ada</span></p>';
    const clean = cleanPastedHTML(html);
    expect(clean).toContain('data-id="ada"');
    expect(clean).not.toContain('onclick');
    expect(clean).not.toContain('style');
  });
});

describe('plain text paste', () => {
  it('splits paragraphs on blank lines and keeps single breaks', () => {
    const doc = schema.node('doc', null, [schema.node('paragraph')]);
    const slice = plainTextSlice('First line\nsecond line\n\nNext paragraph\r\n\r\n\r\nLast', schema, doc.resolve(1));
    const blocks: string[] = [];
    slice.content.forEach((node) => blocks.push(node.type.name));
    expect(blocks).toEqual(['paragraph', 'paragraph', 'paragraph']);
    expect(slice.content.firstChild?.childCount).toBe(3); // text, hard break, text
    expect(slice.content.lastChild?.textContent).toBe('Last');
  });

  it('keeps text as it is inside a code block', () => {
    const doc = schema.node('doc', null, [schema.node('codeBlock')]);
    const slice = plainTextSlice('a\n\nb', schema, doc.resolve(1));
    expect(slice.content.firstChild?.text).toBe('a\n\nb');
  });
});

describe('review fixes', () => {
  it('clamps pasted table spans so a paste cannot explode into a huge table', () => {
    const rows = '<tr><td>b</td></tr>'.repeat(50);
    const clean = cleanPastedHTML(`<table><tr><td colspan="1000" rowspan="-4">a</td></tr>${rows}</table>`);
    expect(clean).toContain('colspan="100"');
    expect(clean).toContain('rowspan="1"');
    const doc = parse('<table><tr><td colspan="100000">a</td></tr></table>');
    let span = 0;
    doc.descendants((node) => {
      if (node.type.name === 'tableCell') span = node.attrs.colspan as number;
    });
    expect(span).toBe(100);
  });

  it('runs every sanitizer over a pasted slice, context wrappers included', () => {
    const sanitizers = sanitizersFor(textSchema(defaultFeatures));
    const item = schema.nodes.taskItem!.create({ checked: '<img src=x onerror=alert(1)>' }, [
      schema.node('paragraph', null, [schema.text('a', [schema.marks.link!.create({ href: 'javascript:alert(1)' })])]),
    ]);
    const list = schema.nodes.orderedList!.create({ start: 'x', type: 'javascript' }, [
      schema.node('listItem', null, [schema.node('paragraph', null, [schema.text('b')])]),
    ]);
    const slice = sanitizeSlice(
      new Slice(Fragment.from([schema.nodes.taskList!.create(null, [item]), list]), 2, 0),
      sanitizers,
    );
    const json = JSON.stringify(slice.content.toJSON());
    expect(json).not.toContain('onerror');
    expect(json).not.toContain('javascript');
    expect(slice.openStart).toBe(2);
  });

  it('falls back to the full clean when the clipboard context is absurd', () => {
    const context = JSON.stringify(Array.from({ length: 200 }, () => 'blockquote'));
    const clean = cleanOwnHTML(`<p data-pm-slice='1 1 ${context}' style="color:red" class="x">a</p>`);
    expect(clean).not.toContain('data-pm-slice');
    expect(clean).not.toContain('style');
  });

  it('cleans the own-clipboard path with the same allowlist', () => {
    const clean = cleanOwnHTML(
      '<p data-pm-slice="1 1 []" id="x" class="y" title="t">a <img src="javascript:alert(1)"> <a href="https://a.co" target="_blank" ping="https://t.co">l</a><o:p>&nbsp;</o:p></p>',
    );
    expect(clean).toContain('data-pm-slice');
    for (const bad of ['id=', 'class=', 'title=', 'javascript', 'ping=', 'target=', 'o:p'])
      expect(clean).not.toContain(bad);
  });

  it('drops raw-text elements whose contents would come back unescaped', () => {
    const clean = cleanPastedHTML('<p>a</p><noembed><img src=x onerror=alert(1)></noembed><noframes>x</noframes>');
    expect(clean).not.toContain('onerror');
    expect(clean).not.toContain('noembed');
  });

  it('starts a new list when Word switches from bullets to numbers, and strips heading markers', () => {
    const marker = (text: string) => `<span style="mso-list:Ignore">${text}<span>&nbsp;</span></span>`;
    const clean = cleanPastedHTML(
      `<h1 style="mso-list:l2 level1 lfo3">${marker('1.')}Heading</h1>` +
        `<p style="mso-list:l0 level1 lfo1">${marker('·')}Bullet</p>` +
        `<p style="mso-list:l1 level1 lfo2">${marker('1.')}Number</p>`,
    );
    expect(clean).toContain('<h1>Heading</h1>');
    expect(clean).toMatch(/<ul><li><p>Bullet<\/p><\/li><\/ul><ol><li><p>Number<\/p><\/li><\/ol>/);
  });

  it('keeps a code language written as one of several classes, or on the pre', () => {
    expect(cleanPastedHTML('<pre><code class="hljs language-js">x</code></pre>')).toContain('class="language-js"');
    const doc = parse('<pre class="language-python"><code>x</code></pre>');
    expect(doc.firstChild?.attrs.language).toBe('python');
  });

  it('turns bold styles into marks only on text, never around table rows or list items', () => {
    const clean = cleanPastedHTML('<table style="font-weight:700"><tr style="font-weight:700"><td>a</td></tr></table>');
    expect(clean).not.toMatch(/<table><strong>|<tr><strong>/);
  });

  it('cleans the stored rel of a pasted link', () => {
    const doc = parse('<p><a href="https://a.co" target="_blank" rel="opener evil">x</a></p>');
    expect(doc.firstChild?.firstChild?.marks[0]?.attrs.rel).toBe('noopener noreferrer nofollow');
  });

  it('survives nesting as deep as a browser parses', () => {
    // Browsers stop nesting around 512 levels; the walk is iterative, so its own depth is unbounded.
    const html = `${'<div>'.repeat(500)}deep${'</div>'.repeat(500)}`;
    expect(cleanPastedHTML(html)).toContain('deep');
  });
});

describe('own clipboard photos', () => {
  it('keeps a photo placeholder style and the upload key, and nothing else in the style', () => {
    const lqip = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4';
    const clean = cleanOwnHTML(
      `<figure data-pm-slice="0 0 []" data-pc-image=""><img src="https://a.co/x.jpg" data-upload-key="u1" style="background-image: url(${lqip}); position: fixed; background: url(https://evil.example/x)"></figure><p style="color:red">t</p>`,
    );
    expect(clean).toContain(`style="background-image: url(${lqip})"`);
    expect(clean).toContain('data-upload-key="u1"');
    expect(clean).not.toContain('evil.example');
    expect(clean).not.toContain('position');
    expect(clean).not.toContain('color:red');
  });
});
