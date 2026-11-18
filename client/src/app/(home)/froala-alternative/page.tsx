import { ServerCodeBlock } from 'fumadocs-ui/components/codeblock.rsc';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Figure } from '@/components/docs/figure';
import { HtmlImportDemo } from '@/components/seo/html-import-demo';
import { seoMetadata } from '@/components/seo/metadata';
import { seoPage } from '@/components/seo/pages';
import { froalaHtml } from '@/components/seo/samples';
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

const slug = 'froala-alternative';
export const metadata: Metadata = seoMetadata(slug);

const sources: Source[] = [
  { label: 'Post Canvas licence (MIT)', href: `${repoUrl}/blob/main/LICENSE` },
  {
    label: 'froala-editor on npm: licence points to the pricing page',
    href: 'https://www.npmjs.com/package/froala-editor',
  },
  { label: 'Froala plans and prices', href: 'https://cart.froala.com/' },
  { label: 'Post Canvas package.json: React 18.2 or 19', href: `${repoUrl}/blob/main/package/package.json` },
  { label: 'react-froala-wysiwyg on npm', href: 'https://www.npmjs.com/package/react-froala-wysiwyg' },
  { label: 'Post Canvas docs: document JSON', href: '/docs/concepts/document-json' },
  { label: 'Froala methods: html.get() returns HTML', href: 'https://froala.com/wysiwyg-editor/docs/methods/' },
  { label: 'Post Canvas docs: image galleries', href: '/docs/guides/galleries' },
  { label: 'Post Canvas docs: security model', href: '/docs/concepts/security' },
  { label: 'Post Canvas roadmap: not available yet', href: '/docs/roadmap' },
  {
    label: 'Froala docs: Vue 3 integration',
    href: 'https://froala.com/wysiwyg-editor/docs/framework-plugins/vue-js-3/',
  },
  {
    label: 'Froala docs: Angular integration',
    href: 'https://froala.com/wysiwyg-editor/docs/framework-plugins/angular/',
  },
  {
    label: 'Froala plugins: Collaborative, Colors, Font Family, Font Size, Image Manager',
    href: 'https://froala.com/wysiwyg-editor/docs/plugins/',
  },
];

const rows: CompareRow[] = [
  {
    feature: 'Licence',
    cells: [
      { text: 'MIT, open source', src: [1] },
      { text: 'Commercial licence', src: [2, 3] },
    ],
  },
  {
    feature: 'Price',
    cells: [
      { text: 'Free', src: [1] },
      {
        text: 'No free plan, a 30-day trial. Professional lists at $899 a year or $2,699 perpetual; sale prices vary',
        src: [3],
      },
    ],
  },
  {
    feature: 'React',
    cells: [
      { text: 'A React component, React 18.2 or 19', src: [4] },
      { text: 'The react-froala-wysiwyg wrapper (MIT) around the licensed editor', src: [5] },
    ],
  },
  {
    feature: 'Saved format',
    cells: [
      { text: 'Tiptap JSON, rendered to HTML, React, Markdown or text', src: [6] },
      { text: 'HTML from html.get()', src: [7] },
    ],
  },
  {
    feature: 'Photo galleries and collage',
    cells: [
      { text: 'Carousel, grid, masonry and collage', src: [8] },
      { text: 'Single images and an Image Manager; no gallery plugin listed', src: [13] },
    ],
  },
  {
    feature: 'Sanitizer for saved content',
    cells: [
      { text: 'sanitizeDocument() on your server', src: [9] },
      { text: 'Bring your own for HTML that clients send', src: [7] },
    ],
  },
  {
    feature: 'Real-time collaboration and comments',
    cells: [
      { text: 'Not yet', src: [10] },
      { text: 'The Collaborative plugin', src: [13] },
    ],
  },
  {
    feature: 'Vue and Angular',
    cells: [
      { text: 'Not yet', src: [10] },
      { text: 'Official integrations', src: [11, 12] },
    ],
  },
];

const faqs: Faq[] = [
  {
    question: 'Is there a free Froala alternative?',
    answer:
      'Post Canvas is free and MIT licensed, including for commercial products. Froala has no free plan: it offers a 30-day trial, then an annual or perpetual licence.',
  },
  {
    question: 'How much does Froala cost?',
    answer:
      'On November 19, 2026, Froala listed its Professional plan at $899 a year or $2,699 perpetual, and Enterprise at $1,999 a year or $5,999 perpetual, with sale prices below those. Check its pricing page for today’s numbers.',
  },
  {
    question: 'Can I import my Froala content?',
    answer:
      'Yes. fromHTML() keeps headings, formatting, links, lists, tables, images with http or https addresses, and Froala video iframes, which become click-to-load video blocks. Scripts are removed and font sizes and families are dropped.',
  },
  {
    question: 'What does Froala do that Post Canvas does not?',
    answer:
      'Real-time collaboration and comments, Vue and Angular integrations, free-form font, size and colour pickers, and an image manager for browsing uploads. Post Canvas is React and plain HTML only for now.',
  },
];

const serverCode = `import { Window } from 'happy-dom';
import { fromHTML, resolveFeatures } from 'post-canvas/server';

const window = new Window();

// html is what editor.html.get() returned when the post was saved.
const doc = fromHTML(html, { window, features: resolveFeatures('article') });
// The fr-video wrapper is unwrapped and its YouTube iframe becomes a video block.`;

const swapCode = `// Before: Froala in React
import FroalaEditor from 'react-froala-wysiwyg';
import 'froala-editor/css/froala_editor.pkgd.min.css';

<FroalaEditor model={html} onModelChange={setHtml} config={{ key: 'your-licence-key' }} />

// After: Post Canvas
import { PostCanvas } from 'post-canvas';
import 'post-canvas/styles.css';

<PostCanvas preset="article" defaultContent={doc} onChange={({ json }) => setDoc(json)} />`;

export default function FroalaAlternativePage() {
  const page = seoPage(slug);
  return (
    <div className="site-sections flex-1">
      <SeoJsonLd page={page} faqs={faqs} />
      <SeoHero
        label="Froala alternative"
        title="A free Froala alternative for posts with photos and video"
        lead={
          <p>
            Post Canvas is an open-source React rich text editor built on Tiptap. It is MIT licensed, so there is no
            yearly licence to renew, and galleries, collages and click-to-load video are built in.
          </p>
        }
        facts={[
          ['Licence', 'MIT'],
          ['Licence fee', 'None'],
          ['React', '18.2 and 19'],
          ['Gallery layouts', '4'],
        ]}
      />

      <WhoFor
        title="Teams paying for Froala to publish posts"
        points={[
          'You renew a Froala licence each year, and most of what you publish is text, photos and video.',
          'You want photo galleries and collages in the post, not a single image at a time.',
          'You render posts on your server and want the sanitizer to come with the editor.',
          'Your app is React, or plain HTML pages you can load a script on.',
        ]}
      >
        You use <code className="font-mono text-[0.92em]">react-froala-wysiwyg</code> for a blog, a CMS or a social
        feature, and a free editor that covers posts with media would do.
      </WhoFor>

      <CompareTable
        title="Post Canvas and Froala, side by side"
        intro="Froala supports more frameworks and formatting. Post Canvas is free and built around media in posts."
        columns={['Post Canvas', 'Froala 5']}
        rows={rows}
        sources={sources}
      />

      <SeoSection
        id="demo-title"
        anchor="demo"
        label="Live demo"
        title="Paste Froala HTML, get a Post Canvas post"
        intro="The sample is Froala output: an fr-video wrapper, image classes, inline font styles and a script tag. Convert it and see what stays."
      >
        <HtmlImportDemo html={froalaHtml} source="Froala" />
      </SeoSection>

      <SeoSection
        id="migrate"
        label="Migrate"
        title="Move your Froala posts over"
        intro={
          <>
            Convert each post once with <code className="font-mono text-[0.92em]">fromHTML()</code> and save the JSON.
            The{' '}
            <Link
              href="/docs/guides/migrating-from-tinymce-froala"
              className="text-site-accent underline-offset-4 hover:underline"
            >
              migration guide
            </Link>{' '}
            covers relative image paths, base64 images and a batch script.
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
        title="Four layouts for the same photos"
        intro="Carousel, grid, masonry and collage, with alt text, captions, reordering and upload progress."
        boxed="panel"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Figure name="gallery-carousel" caption="The carousel layout." maxWidth={620} />
          <Figure name="gallery-grid" caption="The grid layout." maxWidth={620} />
        </div>
      </SeoSection>

      <SeoSection
        id="gaps"
        label="Honest gaps"
        title="What Froala does that Post Canvas doesn't (yet)"
        intro="If you need one of these, Froala still fits better."
      >
        <GapList
          items={[
            {
              title: 'Vue, Angular and other frameworks',
              body: 'Froala has official integrations. Post Canvas has a React component and a plain HTML build.',
            },
            {
              title: 'Free-form fonts and colours',
              body: 'Post Canvas has a nine-colour palette and no font menus, on purpose. Froala lets writers pick any.',
            },
            {
              title: 'An image manager',
              body: 'Froala has a plugin for browsing images already uploaded. In Post Canvas, your app owns storage and any library view.',
            },
            {
              title: 'Real-time collaboration',
              body: 'Froala lists a Collaborative plugin with real-time editing, comments and version history. Post Canvas has none of these yet.',
            },
          ]}
        />
      </SeoSection>

      <FaqSection faqs={faqs} />
      <RelatedPages current={slug} />
      <SeoCta
        title="Try it with your own Froala content"
        body="Paste a post into the demo above, or install the package and convert one real post."
      />
    </div>
  );
}
