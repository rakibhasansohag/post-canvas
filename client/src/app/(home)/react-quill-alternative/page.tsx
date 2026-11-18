import { ServerCodeBlock } from 'fumadocs-ui/components/codeblock.rsc';
import type { Metadata } from 'next';
import Link from 'next/link';
import { HtmlImportDemo } from '@/components/seo/html-import-demo';
import { seoMetadata } from '@/components/seo/metadata';
import { seoPage } from '@/components/seo/pages';
import { quillHtml } from '@/components/seo/samples';
import {
  CompareTable,
  FaqSection,
  RelatedPages,
  SeoCta,
  SeoHero,
  SeoJsonLd,
  SeoSection,
  WhoFor,
  type CompareRow,
  type Faq,
  type Source,
} from '@/components/seo/sections';
import { FolderTabs } from '@/components/site/folder-tabs';
import { repoUrl } from '@/lib/shared';

const slug = 'react-quill-alternative';
export const metadata: Metadata = seoMetadata(slug);

const sources: Source[] = [
  { label: 'react-quill on npm: 2.0.0, published August 3, 2022', href: 'https://www.npmjs.com/package/react-quill' },
  {
    label: 'react-quill 2.0.0 manifest: quill ^1.3.7, React ^16, ^17 or ^18',
    href: 'https://www.npmjs.com/package/react-quill/v/2.0.0',
  },
  {
    label: 'React 19 upgrade guide: ReactDOM.findDOMNode is removed',
    href: 'https://react.dev/blog/2024/04/25/react-19-upgrade-guide',
  },
  {
    label: 'react-quill issue 1039: findDOMNode is not a function with React 19',
    href: 'https://github.com/zenoamaro/react-quill/issues/1039',
  },
  { label: 'Draft.js repository, archived, pointing to Lexical', href: 'https://github.com/facebookarchive/draft-js' },
  { label: 'Post Canvas licence (MIT)', href: `${repoUrl}/blob/main/LICENSE` },
  { label: 'Post Canvas package.json: React 18.2 or 19', href: `${repoUrl}/blob/main/package/package.json` },
  { label: 'Tiptap pricing: the editor is open source (MIT)', href: 'https://tiptap.dev/pricing' },
  { label: '@tiptap/react on npm: React 17, 18 or 19', href: 'https://www.npmjs.com/package/@tiptap/react' },
  { label: 'Lexical licence (MIT, Meta)', href: 'https://github.com/meta/lexical/blob/main/LICENSE' },
  { label: '@lexical/react on npm: React 18 or later', href: 'https://www.npmjs.com/package/@lexical/react' },
  { label: 'Quill repository: BSD-3-Clause', href: 'https://github.com/slab/quill' },
  {
    label: 'TinyMCE licence: GPL-2.0-or-later, or commercial',
    href: 'https://github.com/tinymce/tinymce/blob/main/LICENSE.md',
  },
  {
    label: '@tinymce/tinymce-react on npm: React 16.7 to 19',
    href: 'https://www.npmjs.com/package/@tinymce/tinymce-react',
  },
  { label: 'Post Canvas docs: document JSON and output formats', href: '/docs/concepts/rendering' },
  { label: 'Tiptap docs: JSON and HTML output', href: 'https://tiptap.dev/docs/guides/output-json-html' },
  { label: 'Lexical docs: editor state and JSON', href: 'https://lexical.dev/docs/concepts/editor-state' },
  { label: 'Quill API: getContents() and getSemanticHTML()', href: 'https://quilljs.com/docs/api' },
  {
    label: 'TinyMCE API: getContent() returns HTML',
    href: 'https://www.tiny.cloud/docs/tinymce/latest/apis/tinymce.editor/',
  },
  { label: 'Post Canvas docs: galleries and embeds', href: '/docs/features' },
  {
    label: 'Tiptap docs: Image extension, no upload built in',
    href: 'https://tiptap.dev/docs/editor/extensions/nodes/image',
  },
  { label: 'Quill 1 source: alignment and indent as ql- classes', href: 'https://unpkg.com/quill@1.3.7/dist/quill.js' },
  {
    label: 'Quill 2 list format: bullet lists as ol with data-list',
    href: 'https://github.com/slab/quill/blob/main/packages/quill/src/formats/list.ts',
  },
  {
    label: 'Google Trends: "react quill" against four editor terms, worldwide, past five years',
    href: 'https://trends.google.com/trends/explore?date=today%205-y&q=react%20rich%20text%20editor,rich%20text%20editor,wysiwyg%20editor,react%20quill,froala',
  },
  { label: 'Quill docs: themes', href: 'https://quilljs.com/docs/themes' },
  { label: 'Quill docs: formats, including image and video', href: 'https://quilljs.com/docs/formats' },
  {
    label: 'TinyMCE docs: toolbar options',
    href: 'https://www.tiny.cloud/docs/tinymce/latest/toolbar-configuration-options/',
  },
  { label: 'TinyMCE plugins, including image and media', href: 'https://www.tiny.cloud/docs/tinymce/latest/plugins/' },
  { label: 'react-draft-wysiwyg on npm: 1.15.0, July 2022', href: 'https://www.npmjs.com/package/react-draft-wysiwyg' },
];

const rows: CompareRow[] = [
  {
    feature: 'Licence',
    cells: [
      { text: 'MIT', src: [6] },
      { text: 'MIT core, paid Pro features', src: [8] },
      { text: 'MIT', src: [10] },
      { text: 'BSD-3-Clause; react-quill MIT', src: [12, 1] },
      { text: 'GPL-2.0-or-later, or commercial', src: [13] },
    ],
  },
  {
    feature: 'React versions',
    cells: [
      { text: '18.2 and 19', src: [7] },
      { text: '17, 18 and 19', src: [9] },
      { text: '18 and later', src: [11] },
      { text: 'react-quill: 16 to 18, breaks on 19', src: [2, 3, 4] },
      { text: '16.7 to 19', src: [14] },
    ],
  },
  {
    feature: 'Saved format',
    cells: [
      { text: 'Tiptap JSON; renders HTML, React, Markdown, text', src: [15] },
      { text: 'JSON or HTML', src: [16] },
      { text: 'Editor state JSON', src: [17] },
      { text: 'Delta JSON or HTML', src: [18] },
      { text: 'HTML', src: [19] },
    ],
  },
  {
    feature: 'Ready-made UI',
    cells: [
      { text: 'Toolbar, menus, slash menu, block handle', src: [20] },
      { text: 'No, you build it', src: [16] },
      { text: 'No, you build it', src: [17] },
      { text: 'Toolbar themes', src: [25] },
      { text: 'Toolbar and menus', src: [27] },
    ],
  },
  {
    feature: 'Galleries, uploads, embeds',
    cells: [
      { text: 'Built in: four gallery layouts, upload adapter, click-to-load embeds', src: [20] },
      { text: 'Image node; upload and galleries are yours to build', src: [21] },
      { text: 'You build them', src: [17] },
      { text: 'Image and video formats', src: [26] },
      { text: 'Image and media plugins', src: [28] },
    ],
  },
];

const faqs: Faq[] = [
  {
    question: 'Does react-quill work with React 19?',
    answer:
      'Not as published. react-quill 2.0.0, from August 2022, calls ReactDOM.findDOMNode, which React 19 removed, and its peer dependencies stop at React 18. The GitHub issue reporting the error is still open.',
  },
  {
    question: 'What is the best React Quill alternative?',
    answer:
      'It depends on what you need. Post Canvas fits posts and articles with photos and video, with a ready-made UI. Tiptap or Lexical fit if you want to build your own editor UI. TinyMCE fits if you need its plugins and accept its licence.',
  },
  {
    question: 'Can I keep my Quill content?',
    answer:
      'Yes, if you saved HTML. fromHTML() keeps headings, bold, italic, links, lists, images with absolute addresses and Quill video iframes. Quill 1 writes alignment and indent as classes, which fromHTML drops, so map ql-align classes to text-align first. From Quill 2, export with getSemanticHTML().',
  },
  {
    question: 'What about react-draft-wysiwyg and Draft.js?',
    answer:
      'Draft.js is archived, and its README points to Lexical. react-draft-wysiwyg has had no release since 1.15.0 in July 2022. Convert Draft content to HTML with your existing exporter, then run fromHTML() on it.',
  },
];

const prepassCode = `import { fromHTML } from 'post-canvas/render';

/** Quill 1 (react-quill) writes alignment as classes. fromHTML reads text-align styles, so copy them over. */
function quillAlignToStyles(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const el of doc.querySelectorAll<HTMLElement>('[class*="ql-align-"]')) {
    const align = [...el.classList].find((name) => name.startsWith('ql-align-'));
    if (align) el.style.textAlign = align.slice('ql-align-'.length);
  }
  return doc.body.innerHTML;
}

const doc = fromHTML(quillAlignToStyles(savedHtml));`;

const swapCode = `// Before: react-quill
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

<ReactQuill theme="snow" value={html} onChange={setHtml} />

// After: Post Canvas, on React 18.2 or 19
import { PostCanvas } from 'post-canvas';
import 'post-canvas/styles.css';

<PostCanvas preset="article" defaultContent={doc} onChange={({ json }) => setDoc(json)} />`;

const quill2Code = `// From Quill 2, export semantic HTML instead of root.innerHTML:
// Quill 2's own markup writes bullet lists as <ol><li data-list="bullet">.
const html = quill.getSemanticHTML();
const doc = fromHTML(html);`;

export default function ReactQuillAlternativePage() {
  const page = seoPage(slug);
  return (
    <div className="site-sections flex-1">
      <SeoJsonLd page={page} faqs={faqs} />
      <SeoHero
        label="React Quill alternative"
        title="A React Quill alternative that runs on React 19"
        lead={
          <p>
            react-quill has not had a release since August 2022 and breaks on React 19. Post Canvas is a maintained,
            MIT-licensed React rich text editor built on Tiptap, and it reads your saved Quill HTML.
          </p>
        }
        facts={[
          ['Licence', 'MIT'],
          ['React', '18.2 and 19'],
          ['Imports', 'Quill HTML'],
          ['Price', 'Free'],
        ]}
      />

      <WhoFor
        title="Apps stuck on react-quill or Draft.js"
        points={[
          'You are upgrading to React 19 and react-quill throws "findDOMNode is not a function".',
          'You use react-draft-wysiwyg or Draft.js, which is archived.',
          'You want an editor with a toolbar and menus ready, not a framework to build one on.',
          'You have years of posts saved as Quill HTML and need them to keep working.',
        ]}
      >
        Your app has a rich text field on react-quill or react-draft-wysiwyg, and the next React upgrade is blocked by
        it.
      </WhoFor>

      <SeoSection
        id="status"
        label="The signal"
        title="Where react-quill stands"
        intro="Facts from npm, GitHub and React's own upgrade guide. The numbers link to the sources in the table below."
      >
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Last release', '2.0.0, August 3, 2022', [1]],
            ['Peer React', '16, 17 or 18', [2]],
            ['On React 19', 'findDOMNode was removed; the issue is open', [3, 4]],
            ['Search interest', '36 in 2024, 10 in 2026 on Google Trends', [24]],
          ].map(([term, value, refs]) => (
            <div key={term as string} className="site-card p-5" data-reveal>
              <dt className="font-mono text-[0.72rem] tracking-[0.14em] text-site-muted uppercase">{term as string}</dt>
              <dd className="mt-2 font-display text-[1.2rem] leading-snug font-semibold tracking-[-0.015em]">
                {value as string}
                {(refs as number[]).map((ref) => (
                  <a
                    key={ref}
                    href={`#source-${ref}`}
                    className="ms-1 align-super font-sans text-[0.72rem] font-semibold text-site-accent hover:underline"
                    aria-label={`Source ${ref}`}
                  >
                    [{ref}]
                  </a>
                ))}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 max-w-[44rem] text-[0.92rem] text-site-muted">
          Google Trends shows relative search interest (yearly averages of weekly values, 0 to 100, worldwide), not
          usage.
        </p>
      </SeoSection>

      <CompareTable
        title="React rich text editors, side by side"
        intro="Five maintained choices for a React app leaving Quill. Tiptap and Lexical are frameworks; the others come with a UI."
        columns={['Post Canvas', 'Tiptap', 'Lexical', 'Quill', 'TinyMCE']}
        rows={rows}
        sources={sources}
      />

      <SeoSection
        id="demo-title"
        anchor="demo"
        label="Live demo"
        title="Paste react-quill HTML, get a Post Canvas post"
        intro="The sample is what react-quill saves: Quill 1 markup with ql-align and ql-indent classes and a ql-video iframe. Convert it and see what needs the pre-pass below."
      >
        <HtmlImportDemo html={quillHtml} source="react-quill" />
      </SeoSection>

      <SeoSection
        id="migrate"
        label="Migrate"
        title="Move off react-quill in three steps"
        intro={
          <>
            Swap the component, convert saved HTML once with <code className="font-mono text-[0.92em]">fromHTML()</code>
            , and keep the old column until you have checked a sample. The{' '}
            <Link
              href="/docs/guides/migrating-from-tinymce-froala"
              className="text-site-accent underline-offset-4 hover:underline"
            >
              migration guide
            </Link>{' '}
            lists what is kept and dropped.
          </>
        }
      >
        <FolderTabs
          label="Migration code"
          className="site-code min-w-0"
          tabs={[
            { label: 'Swap the component', content: <ServerCodeBlock lang="tsx" code={swapCode} /> },
            { label: 'Quill 1 alignment', content: <ServerCodeBlock lang="ts" code={prepassCode} /> },
            { label: 'From Quill 2', content: <ServerCodeBlock lang="ts" code={quill2Code} /> },
          ]}
        />
      </SeoSection>

      <FaqSection faqs={faqs} />
      <RelatedPages current={slug} />
      <SeoCta
        title="Unblock your React 19 upgrade"
        body="Install Post Canvas, convert one saved Quill post, and compare it side by side with the original."
      />
    </div>
  );
}
