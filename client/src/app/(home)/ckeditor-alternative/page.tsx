import { ServerCodeBlock } from 'fumadocs-ui/components/codeblock.rsc';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Figure } from '@/components/docs/figure';
import { HtmlImportDemo } from '@/components/seo/html-import-demo';
import { seoMetadata } from '@/components/seo/metadata';
import { seoPage } from '@/components/seo/pages';
import { ckeditorHtml } from '@/components/seo/samples';
import {
  CompareTable,
  FaqSection,
  GapList,
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

const slug = 'ckeditor-alternative';
export const metadata: Metadata = seoMetadata(slug);

const sources: Source[] = [
  { label: 'Post Canvas licence (MIT)', href: `${repoUrl}/blob/main/LICENSE` },
  {
    label: 'CKEditor 5 licence: GPL-2.0-or-later, or commercial',
    href: 'https://github.com/ckeditor/ckeditor5/blob/master/packages/ckeditor5/LICENSE.md',
  },
  {
    label: 'CKEditor 5 v44 update guide: licenseKey is required',
    href: 'https://ckeditor.com/docs/ckeditor5/latest/updating/guides/update-to-44.html',
  },
  {
    label: 'CKEditor 5 docs: licence key and activation',
    href: 'https://ckeditor.com/docs/ckeditor5/latest/getting-started/licensing/license-key-and-activation.html',
  },
  { label: 'CKEditor pricing', href: 'https://ckeditor.com/pricing/' },
  { label: 'Post Canvas package.json: React 18.2 or 19', href: `${repoUrl}/blob/main/package/package.json` },
  { label: '@ckeditor/ckeditor5-react on npm', href: 'https://www.npmjs.com/package/@ckeditor/ckeditor5-react' },
  { label: 'Post Canvas docs: document JSON', href: '/docs/concepts/document-json' },
  {
    label: 'CKEditor 5 API: editor.getData()',
    href: 'https://ckeditor.com/docs/ckeditor5/latest/api/module_core_editor_editor-Editor.html',
  },
  { label: 'Post Canvas docs: image galleries', href: '/docs/guides/galleries' },
  {
    label: 'CKEditor 5 docs: images',
    href: 'https://ckeditor.com/docs/ckeditor5/latest/features/images/images-overview.html',
  },
  { label: 'Post Canvas docs: embeds and link previews', href: '/docs/guides/embeds-and-link-previews' },
  {
    label: 'CKEditor 5 docs: media embed',
    href: 'https://ckeditor.com/docs/ckeditor5/latest/features/media-embed.html',
  },
  { label: 'Post Canvas docs: security model', href: '/docs/concepts/security' },
  { label: 'Post Canvas roadmap: not available yet', href: '/docs/roadmap' },
  { label: '@ckeditor/ckeditor5-vue on npm', href: 'https://www.npmjs.com/package/@ckeditor/ckeditor5-vue' },
  { label: '@ckeditor/ckeditor5-angular on npm', href: 'https://www.npmjs.com/package/@ckeditor/ckeditor5-angular' },
];

const rows: CompareRow[] = [
  {
    feature: 'Licence',
    cells: [
      { text: 'MIT', src: [1] },
      { text: 'GPL-2.0-or-later, or a commercial licence', src: [2] },
    ],
  },
  {
    feature: 'Licence key',
    cells: [
      { text: 'None', src: [1] },
      { text: 'Required since v44.0.0: "GPL" when self-hosted, a commercial key for the CDN', src: [3, 4] },
    ],
  },
  {
    feature: 'Price',
    cells: [
      { text: 'Free', src: [1] },
      { text: 'A free plan, paid plans from $144 a month billed annually', src: [5] },
    ],
  },
  {
    feature: 'React',
    cells: [
      { text: 'A React component, React 18.2 or 19', src: [6] },
      { text: 'The @ckeditor/ckeditor5-react wrapper', src: [7] },
    ],
  },
  {
    feature: 'Saved format',
    cells: [
      { text: 'Tiptap JSON, rendered to HTML, React, Markdown or text', src: [8] },
      { text: 'A string from getData(), HTML by default', src: [9] },
    ],
  },
  {
    feature: 'Photo galleries',
    cells: [
      { text: 'Carousel, grid, masonry and collage', src: [10] },
      { text: 'Single images with captions, styles and resizing', src: [11] },
    ],
  },
  {
    feature: 'Video and social embeds',
    cells: [
      { text: 'Click-to-load players built from validated ids', src: [12] },
      { text: 'Media embed, saved as an oembed element', src: [13] },
    ],
  },
  {
    feature: 'Sanitizer for saved content',
    cells: [
      { text: 'sanitizeDocument() on your server', src: [14] },
      { text: 'Bring your own for HTML that clients send', src: [9] },
    ],
  },
  {
    feature: 'Real-time collaboration, comments, track changes',
    cells: [
      { text: 'Not yet', src: [15] },
      { text: 'An add-on on the Professional plan, included in Custom', src: [5] },
    ],
  },
  {
    feature: 'Vue and Angular',
    cells: [
      { text: 'Not yet', src: [15] },
      { text: 'Official packages', src: [16, 17] },
    ],
  },
];

const faqs: Faq[] = [
  {
    question: 'Is there a CKEditor alternative without a licence key?',
    answer:
      'Post Canvas is MIT licensed and needs no key of any kind. Since CKEditor 5 v44.0.0, the editor needs a licenseKey in its configuration: "GPL" for a self-hosted copy under the GPL, or a key from a CKEditor plan.',
  },
  {
    question: 'How much does CKEditor cost compared with Post Canvas?',
    answer:
      'Post Canvas is free. CKEditor has a free plan, and its paid plans start at $144 a month billed annually, according to its pricing page on November 19, 2026.',
  },
  {
    question: 'Can I move my CKEditor 5 content to Post Canvas?',
    answer:
      'Yes. fromHTML() reads the HTML from getData(): headings, formatting, lists, tables, links, figures with captions, and oembed elements for YouTube, Vimeo and other known players. Run it once per post and save the JSON.',
  },
  {
    question: 'What does CKEditor do that Post Canvas does not?',
    answer:
      'Real-time collaboration, comments, track changes, export to PDF and Word, and Vue and Angular packages. Post Canvas has none of these yet. If you rely on them, stay on CKEditor.',
  },
];

const serverCode = `import { Window } from 'happy-dom';
import { fromHTML, resolveFeatures } from 'post-canvas/server';

const window = new Window();
const features = resolveFeatures('article');

// html is what editor.getData() returned when the post was saved.
const doc = fromHTML(html, { window, features });
// figure.image becomes an image with its caption, figure.media <oembed> a video block.`;

const swapCode = `// Before: CKEditor 5 in React
import { CKEditor } from '@ckeditor/ckeditor5-react';
import { ClassicEditor, Essentials, Paragraph, Bold } from 'ckeditor5';

<CKEditor
  editor={ClassicEditor}
  config={{ licenseKey: 'GPL', plugins: [Essentials, Paragraph, Bold], toolbar: ['bold'] }}
  data={html}
  onChange={(_, editor) => setHtml(editor.getData())}
/>

// After: Post Canvas
import { PostCanvas } from 'post-canvas';
import 'post-canvas/styles.css';

<PostCanvas preset="article" defaultContent={doc} onChange={({ json }) => setDoc(json)} />`;

export default function CkeditorAlternativePage() {
  const page = seoPage(slug);
  return (
    <div className="site-sections flex-1">
      <SeoJsonLd page={page} faqs={faqs} />
      <SeoHero
        label="CKEditor alternative"
        title="A CKEditor alternative for React, MIT licensed"
        lead={
          <p>
            Post Canvas is a React rich text editor built on Tiptap, for posts and articles. It needs no licence key and
            no plan: install it from npm, host it with your app, and get photo galleries, embeds and a server-side
            sanitizer in the box.
          </p>
        }
        facts={[
          ['Licence', 'MIT'],
          ['Licence key', 'None'],
          ['React', '18.2 and 19'],
          ['Price', 'Free'],
        ]}
      />

      <WhoFor
        title="React apps on CKEditor 5 that need less"
        points={[
          'You added licenseKey: "GPL" in v44 and want terms your legal team does not have to read twice.',
          'You use a fraction of CKEditor: text, images, video and links in posts or articles.',
          'You want photo galleries and click-to-load embeds without building plugins.',
          'You render posts on your server and want one schema for the editor and the sanitizer.',
        ]}
      >
        You use <code className="font-mono text-[0.92em]">@ckeditor/ckeditor5-react</code> for a CMS, a blog or user
        posts, and a smaller, MIT-licensed editor would cover what you use.
      </WhoFor>

      <CompareTable
        title="Post Canvas and CKEditor 5, side by side"
        intro="CKEditor is the bigger product, with collaboration and document features Post Canvas does not have."
        columns={['Post Canvas', 'CKEditor 5']}
        rows={rows}
        sources={sources}
      />

      <SeoSection
        id="demo-title"
        anchor="demo"
        label="Live demo"
        title="Paste CKEditor HTML, get a Post Canvas post"
        intro="The sample is getData() output: a figure with a caption, a marker highlight and an oembed element. Convert it and edit the result."
      >
        <HtmlImportDemo html={ckeditorHtml} source="CKEditor" />
      </SeoSection>

      <SeoSection
        id="migrate"
        label="Migrate"
        title="Move your CKEditor content over"
        intro={
          <>
            Convert each saved post once with <code className="font-mono text-[0.92em]">fromHTML()</code>. The{' '}
            <Link
              href="/docs/guides/migrating-from-tinymce-froala"
              className="text-site-accent underline-offset-4 hover:underline"
            >
              migration guide
            </Link>{' '}
            lists what is kept and dropped, and has a batch script you can adapt.
          </>
        }
      >
        <FolderTabs
          label="Migration code"
          className="site-code min-w-0"
          tabs={[
            { label: 'Swap the component', content: <ServerCodeBlock lang="tsx" code={swapCode} /> },
            { label: 'Convert on the server', content: <ServerCodeBlock lang="ts" code={serverCode} /> },
          ]}
        />
      </SeoSection>

      <SeoSection
        id="media"
        label="Built in"
        title="Galleries and embeds without a plugin"
        intro="One package, with four gallery layouts and players that load only after a click."
        boxed="panel"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Figure name="gallery-masonry" caption="A gallery in the masonry layout." maxWidth={620} />
          <Figure name="embed-social" caption="A post from X, loaded only after a click." maxWidth={620} />
        </div>
      </SeoSection>

      <SeoSection
        id="gaps"
        label="Honest gaps"
        title="What CKEditor does that Post Canvas doesn't (yet)"
        intro="These are real reasons to stay on CKEditor."
      >
        <GapList
          items={[
            {
              title: 'Real-time collaboration',
              body: 'CKEditor sells it as an add-on. Post Canvas stores a plain JSON document that you save and load yourself.',
            },
            {
              title: 'Comments and track changes',
              body: 'On the Post Canvas roadmap, not in the package today.',
            },
            {
              title: 'Export to PDF and Word',
              body: 'CKEditor plans include it, with a monthly conversion limit. Post Canvas renders HTML, React, Markdown and text only.',
            },
            {
              title: 'Vue and Angular packages',
              body: 'Post Canvas has a React component and a plain HTML build, nothing for Vue or Angular yet.',
            },
          ]}
        />
      </SeoSection>

      <FaqSection faqs={faqs} />
      <RelatedPages current={slug} />
      <SeoCta
        title="Try it with your own CKEditor content"
        body="Paste a post into the demo above, or install the package and convert one real post."
      />
    </div>
  );
}
