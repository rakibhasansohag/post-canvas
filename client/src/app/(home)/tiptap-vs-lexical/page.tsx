import { ServerCodeBlock } from 'fumadocs-ui/components/codeblock.rsc';
import { Check } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { LiveDemo } from '@/components/docs/live-demo';
import { seoMetadata } from '@/components/seo/metadata';
import { seoPage } from '@/components/seo/pages';
import {
  CompareTable,
  FaqSection,
  RelatedPages,
  SeoCta,
  SeoHero,
  SeoJsonLd,
  SeoSection,
  type CompareRow,
  type Faq,
  type Source,
} from '@/components/seo/sections';
import { FolderTabs } from '@/components/site/folder-tabs';
import { LiveNote } from '@/components/site/live-note';

const slug = 'tiptap-vs-lexical';
export const metadata: Metadata = seoMetadata(slug);

const sources: Source[] = [
  { label: 'Tiptap repository (ueberdosis/tiptap)', href: 'https://github.com/ueberdosis/tiptap' },
  { label: 'Lexical licence: MIT, Meta Platforms', href: 'https://github.com/meta/lexical/blob/main/LICENSE' },
  {
    label: 'Tiptap pricing: the editor is open source (MIT); paid plans from $49 a month',
    href: 'https://tiptap.dev/pricing',
  },
  { label: 'Tiptap Comments: a paid feature', href: 'https://tiptap.dev/docs/comments/getting-started/overview' },
  { label: 'Tiptap Conversion: a Pro package', href: 'https://tiptap.dev/docs/conversion/getting-started/overview' },
  { label: 'lexical on npm: 0.53.0, MIT', href: 'https://www.npmjs.com/package/lexical' },
  { label: '@tiptap/core on npm: 3.34.0', href: 'https://www.npmjs.com/package/@tiptap/core' },
  { label: '@tiptap/react on npm', href: 'https://www.npmjs.com/package/@tiptap/react' },
  { label: '@lexical/react on npm', href: 'https://www.npmjs.com/package/@lexical/react' },
  {
    label: 'Tiptap overview: built on top of ProseMirror',
    href: 'https://tiptap.dev/docs/editor/getting-started/overview',
  },
  { label: 'Lexical introduction: a framework-agnostic core', href: 'https://lexical.dev/docs/intro' },
  { label: 'Tiptap docs: the schema', href: 'https://tiptap.dev/docs/editor/core-concepts/schema' },
  { label: 'Lexical docs: editor state', href: 'https://lexical.dev/docs/concepts/editor-state' },
  { label: 'Lexical docs: nodes', href: 'https://lexical.dev/docs/concepts/nodes' },
  {
    label: 'Tiptap collaboration: Yjs, on your premises or Tiptap Cloud',
    href: 'https://tiptap.dev/docs/collaboration/getting-started/overview',
  },
  { label: 'Hocuspocus repository (MIT)', href: 'https://github.com/ueberdosis/hocuspocus' },
  { label: 'Lexical docs: collaboration with Yjs', href: 'https://lexical.dev/docs/collaboration/react' },
  { label: 'Lexical repository (meta/lexical)', href: 'https://github.com/meta/lexical' },
  {
    label: 'Google Trends: tiptap, lexical editor, tinymce, ckeditor, quill editor, worldwide, past five years',
    href: 'https://trends.google.com/trends/explore?date=today%205-y&q=tiptap,lexical%20editor,tinymce,ckeditor,quill%20editor',
  },
  { label: 'ProseMirror', href: 'https://prosemirror.net/' },
];

const rows: CompareRow[] = [
  {
    feature: 'Maintainer',
    cells: [
      { text: 'The Tiptap company (ueberdosis on GitHub)', src: [1] },
      { text: 'Meta', src: [2] },
    ],
  },
  {
    feature: 'Licence',
    cells: [
      { text: 'MIT for the editor', src: [3] },
      { text: 'MIT', src: [2] },
    ],
  },
  {
    feature: 'Paid add-ons',
    cells: [
      { text: 'Comments, Conversion, AI and cloud collaboration in plans from $49 a month', src: [3, 4, 5] },
      { text: 'None; every package is MIT on npm', src: [6] },
    ],
  },
  {
    feature: 'Version',
    cells: [
      { text: '3.34.0', src: [7] },
      { text: '0.53.0, no 1.0 yet', src: [6] },
    ],
  },
  {
    feature: 'React bindings',
    cells: [
      { text: '@tiptap/react, React 17 to 19', src: [8] },
      { text: '@lexical/react, React 18 and later', src: [9] },
    ],
  },
  {
    feature: 'Built on',
    cells: [
      { text: 'ProseMirror', src: [10, 20] },
      { text: 'Its own framework-agnostic core', src: [11] },
    ],
  },
  {
    feature: 'Document model',
    cells: [
      { text: 'A schema of nodes and marks; the document is JSON', src: [12] },
      { text: 'An editor state of node classes; toJSON() saves the tree', src: [13, 14] },
    ],
  },
  {
    feature: 'Collaboration',
    cells: [
      { text: 'Yjs, self-hosted with Hocuspocus (MIT) or on Tiptap Cloud', src: [15, 16] },
      { text: 'Yjs through @lexical/yjs', src: [17] },
    ],
  },
  {
    feature: 'GitHub stars (November 19, 2026)',
    cells: [
      { text: 'About 39,000', src: [1] },
      { text: 'About 24,000', src: [18] },
    ],
  },
];

const faqs: Faq[] = [
  {
    question: 'Is Tiptap or Lexical better for React?',
    answer:
      'Both have official React bindings and MIT-licensed cores. Tiptap is at 3.x on top of ProseMirror, with paid cloud features if you want them. Lexical is Meta’s own framework, all MIT, still before 1.0. Pick Tiptap for its mature schema and extension ecosystem, Lexical for a single licence and no paid tier.',
  },
  {
    question: 'Is Tiptap free?',
    answer:
      'The Tiptap editor is open source under MIT. Comments, document conversion, AI features and Tiptap Cloud collaboration are paid, in plans that start at $49 a month billed annually. Self-hosted collaboration with Hocuspocus is MIT.',
  },
  {
    question: 'Is Lexical production ready?',
    answer:
      'Meta maintains it and publishes it on npm, but it is at version 0.53.0 with no 1.0 release, so expect API changes between minor versions. Read its changelog before you upgrade.',
  },
  {
    question: 'Why is Post Canvas built on Tiptap?',
    answer:
      'ProseMirror’s schema lets one definition drive the editor, the server sanitizer and the HTML renderer, and Tiptap’s extension API makes custom blocks such as galleries and embeds practical. Your own Tiptap extensions still work: pass them in the extensions prop.',
  },
];

const extensionCode = `import { Mark } from '@tiptap/core';
import { PostCanvas } from 'post-canvas';
import 'post-canvas/styles.css';

// Any Tiptap extension works next to the Post Canvas kit.
const Spoiler = Mark.create({
  name: 'spoiler',
  parseHTML: () => [{ tag: 'span[data-spoiler]' }],
  renderHTML: () => ['span', { 'data-spoiler': '' }, 0],
});

const extensions = [Spoiler];

export function Editor() {
  return <PostCanvas preset="article" extensions={extensions} />;
}`;

const rawTiptapCode = `// Raw Tiptap: you build the toolbar, menus, uploads and galleries.
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

export function Editor() {
  const editor = useEditor({ extensions: [StarterKit], content: '<p>Hello</p>' });
  return <EditorContent editor={editor} />;
}

// Post Canvas: the same Tiptap underneath, with the UI and media blocks done.
import { PostCanvas } from 'post-canvas';

export function Composer() {
  return <PostCanvas preset="social" />;
}`;

const choices: { title: string; points: string[] }[] = [
  {
    title: 'Pick Tiptap if',
    points: [
      'You want ProseMirror’s schema and a stable 3.x API.',
      'You want a large set of ready extensions.',
      'Paid cloud features such as comments are useful to you later.',
    ],
  },
  {
    title: 'Pick Lexical if',
    points: [
      'You want one MIT licence for everything, with no paid tier.',
      'You are happy to follow a pre-1.0 API between releases.',
      'You prefer node classes to a declared schema.',
    ],
  },
  {
    title: 'Pick Post Canvas if',
    points: [
      'You want Tiptap with the toolbar, menus and media blocks done.',
      'Your content is posts and articles with photos and video.',
      'You want a sanitizer and renderer that match the editor.',
    ],
  },
];

export default function TiptapVsLexicalPage() {
  const page = seoPage(slug);
  return (
    <div className="site-sections flex-1">
      <SeoJsonLd page={page} faqs={faqs} />
      <SeoHero
        label="Tiptap vs Lexical"
        title="Tiptap vs Lexical for a React editor"
        lead={
          <p>
            Two MIT-licensed frameworks for building a rich text editor. Tiptap sits on ProseMirror and has paid cloud
            features; Lexical is Meta’s own engine, all MIT, before 1.0. Post Canvas is built on Tiptap, and this page
            says where Lexical is the better pick.
          </p>
        }
        facts={[
          ['Tiptap', '3.34.0'],
          ['Lexical', '0.53.0'],
          ['Both', 'MIT core'],
          ['Checked', 'Nov 19, 2026'],
        ]}
        primary={{ label: 'Try Tiptap with a UI', href: '#demo' }}
        secondary={{ label: 'Compare the details', href: '#compare' }}
      />

      <section aria-labelledby="short" className="site-col pt-20 md:pt-28">
        <h2 id="short" className="site-h2 mb-8 max-w-[22ch]" data-reveal>
          The short answer
        </h2>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {choices.map((choice) => (
            <li key={choice.title} className="site-card p-5 sm:p-6" data-reveal>
              <h3 className="site-h3 mb-4">{choice.title}</h3>
              <ul className="flex flex-col gap-3">
                {choice.points.map((point) => (
                  <li key={point} className="flex gap-3">
                    <Check size={18} className="mt-1 shrink-0 text-site-ok" aria-hidden="true" />
                    <span className="text-site-muted">{point}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <CompareTable
        title="Tiptap and Lexical, from their own docs"
        intro="Facts only, each linked to the project's own page or package."
        columns={['Tiptap', 'Lexical']}
        rows={rows}
        sources={sources}
      />

      <SeoSection
        id="trend"
        label="Search interest"
        title="Tiptap passed TinyMCE and CKEditor in 2025"
        intro={
          <>
            On Google Trends, worldwide yearly averages went from 5 in 2021 to 44 in 2026 for &quot;tiptap&quot;, and
            from 0 to 5 for &quot;lexical editor&quot;, in one query with TinyMCE, CKEditor and Quill.
            <a
              href="#source-19"
              className="ms-1 align-super text-[0.72rem] font-semibold text-site-accent hover:underline"
              aria-label="Source 19"
            >
              [19]
            </a>{' '}
            That is search interest, not usage, and &quot;lexical&quot; alone is mostly the English word.
          </>
        }
      >
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            ['tiptap, 2021', '5'],
            ['tiptap, 2026', '44'],
            ['lexical editor, 2021', '0'],
            ['lexical editor, 2026', '5'],
          ].map(([term, value]) => (
            <div key={term} className="site-card p-5" data-reveal>
              <dt className="font-mono text-[0.72rem] tracking-[0.14em] text-site-muted uppercase">{term}</dt>
              <dd className="mt-2 font-display text-[2rem] font-bold tracking-[-0.02em] tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </SeoSection>

      <SeoSection
        id="demo-title"
        anchor="demo"
        label="On Tiptap"
        title="What Post Canvas adds on top of Tiptap"
        intro={
          <>
            Galleries in four layouts, click-to-load embeds, mentions, a slash menu, presets, and a{' '}
            <Link href="/docs/concepts/security" className="text-site-accent underline-offset-4 hover:underline">
              server sanitizer
            </Link>{' '}
            that uses the same schema. This is the full preset.
          </>
        }
        boxed="panel"
      >
        <LiveNote className="mb-4">Type, drag a photo in the collage, or paste a YouTube link.</LiveNote>
        <LiveDemo sample="collage" minHeight="34rem" />
      </SeoSection>

      <SeoSection
        id="code"
        label="Code"
        title="Raw Tiptap, or Tiptap with the work done"
        intro="Post Canvas is a Tiptap editor, so your own Tiptap extensions still plug in."
      >
        <FolderTabs
          label="Tiptap code"
          className="site-code min-w-0"
          tabs={[
            { label: 'Raw Tiptap vs Post Canvas', content: <ServerCodeBlock lang="tsx" code={rawTiptapCode} /> },
            { label: 'Add your own extension', content: <ServerCodeBlock lang="tsx" code={extensionCode} /> },
          ]}
        />
      </SeoSection>

      <FaqSection faqs={faqs} />
      <RelatedPages current={slug} />
      <SeoCta
        title="Want Tiptap with a media canvas already built?"
        body="Install Post Canvas and get the editor, the galleries and the sanitizer in one package."
      />
    </div>
  );
}
