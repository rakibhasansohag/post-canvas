import { ServerCodeBlock } from 'fumadocs-ui/components/codeblock.rsc';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Figure } from '@/components/docs/figure';
import { HtmlImportDemo } from '@/components/seo/html-import-demo';
import { seoMetadata } from '@/components/seo/metadata';
import { seoPage } from '@/components/seo/pages';
import { tinymceHtml } from '@/components/seo/samples';
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

const slug = 'tinymce-alternative';
export const metadata: Metadata = seoMetadata(slug);

const sources: Source[] = [
  { label: 'Post Canvas licence (MIT)', href: `${repoUrl}/blob/main/LICENSE` },
  {
    label: 'TinyMCE licence: GPL-2.0-or-later, or commercial terms',
    href: 'https://github.com/tinymce/tinymce/blob/main/LICENSE.md',
  },
  { label: 'TinyMCE docs: API key and licence key', href: 'https://www.tiny.cloud/docs/tinymce/latest/license-key/' },
  { label: 'TinyMCE pricing', href: 'https://www.tiny.cloud/pricing/' },
  { label: 'Post Canvas package.json: React 18.2 or 19', href: `${repoUrl}/blob/main/package/package.json` },
  { label: '@tinymce/tinymce-react on npm', href: 'https://www.npmjs.com/package/@tinymce/tinymce-react' },
  { label: 'Post Canvas docs: document JSON', href: '/docs/concepts/document-json' },
  {
    label: 'TinyMCE API: getContent() returns an HTML string',
    href: 'https://www.tiny.cloud/docs/tinymce/latest/apis/tinymce.editor/',
  },
  { label: 'Post Canvas docs: image galleries', href: '/docs/guides/galleries' },
  { label: 'Post Canvas docs: security model', href: '/docs/concepts/security' },
  { label: 'TinyMCE premium plugins', href: 'https://www.tiny.cloud/docs/tinymce/latest/plugins/' },
  { label: 'Post Canvas roadmap: not available yet', href: '/docs/roadmap' },
  { label: 'TinyMCE docs: Vue integration', href: 'https://www.tiny.cloud/docs/tinymce/latest/vue-cloud/' },
  { label: 'TinyMCE docs: Angular integration', href: 'https://www.tiny.cloud/docs/tinymce/latest/angular-cloud/' },
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
    feature: 'API key or licence key',
    cells: [
      { text: 'None. One npm package you host yourself', src: [1] },
      { text: 'An API key to load from Tiny Cloud; a license_key ("gpl" or a paid key) when self-hosted', src: [3] },
    ],
  },
  {
    feature: 'Price',
    cells: [
      { text: 'Free', src: [1] },
      { text: 'Cloud: free up to 1,000 editor loads a month, paid plans from $79 a month billed annually', src: [4] },
    ],
  },
  {
    feature: 'React',
    cells: [
      { text: 'A React component, React 18.2 or 19', src: [5] },
      { text: 'The @tinymce/tinymce-react wrapper', src: [6] },
    ],
  },
  {
    feature: 'Saved format',
    cells: [
      { text: 'Tiptap JSON, rendered to HTML, React, Markdown or text', src: [7] },
      { text: 'An HTML string', src: [8] },
    ],
  },
  {
    feature: 'Photo galleries',
    cells: [
      { text: 'Carousel, grid, masonry and collage, with upload progress', src: [9] },
      { text: 'Image and Image Editing plugins; no gallery plugin listed', src: [11] },
    ],
  },
  {
    feature: 'Sanitizer for saved content',
    cells: [
      { text: 'sanitizeDocument() on your server, the same schema as the editor', src: [10] },
      { text: 'Bring your own for HTML that clients send', src: [8] },
    ],
  },
  {
    feature: 'Comments, revision history, suggested edits',
    cells: [
      { text: 'Not yet', src: [12] },
      { text: 'Premium plugins', src: [11] },
    ],
  },
  {
    feature: 'Vue and Angular',
    cells: [
      { text: 'Not yet', src: [12] },
      { text: 'Official integrations', src: [13, 14] },
    ],
  },
];

const faqs: Faq[] = [
  {
    question: 'Is there a free TinyMCE alternative for React?',
    answer:
      'Post Canvas is one. It is MIT licensed, free for commercial use, and installs from npm as post-canvas. You host it with your app, so there is no editor-load limit and no API key.',
  },
  {
    question: 'Do I need an API key or licence key to use Post Canvas?',
    answer:
      'No. Nothing is loaded from a cloud and nothing checks a key. TinyMCE needs an API key when it loads from Tiny Cloud, and since TinyMCE 7 a self-hosted copy needs a license_key, which can be "gpl" if you accept the GPL.',
  },
  {
    question: 'Can I import my existing TinyMCE content?',
    answer:
      'Yes. fromHTML() reads TinyMCE HTML into a Post Canvas document: headings, alignment, formatting, links, lists, tables, images with http or https addresses and YouTube or Vimeo iframes. Run it once per post and save the JSON.',
  },
  {
    question: 'What is lost when I move from TinyMCE?',
    answer:
      'Text and background colours, font families, font sizes, line heights, indentation, and table widths and borders. Images with relative or data: addresses are dropped, so make them absolute or upload them first. Check a sample of posts before you switch.',
  },
  {
    question: 'Does Post Canvas have TinyMCE features such as comments and revision history?',
    answer:
      'Not yet. Comments, real-time collaboration and track changes are on the Post Canvas roadmap. If your team depends on them today, TinyMCE or CKEditor is the better fit.',
  },
];

const browserCode = `import { PostCanvas } from 'post-canvas';
import { fromHTML } from 'post-canvas/render';
import 'post-canvas/styles.css';

// The HTML TinyMCE saved, converted in the browser.
export function EditPost({ html }: { html: string }) {
  return <PostCanvas preset="article" defaultContent={fromHTML(html)} />;
}`;

const serverCode = `// scripts/migrate.ts: run once over every saved post
import { Window } from 'happy-dom';
import { fromHTML, resolveFeatures } from 'post-canvas/server';

const window = new Window();
const features = resolveFeatures('article');

for (const post of await db.posts.all()) {
  const doc = fromHTML(post.html, {
    window,
    features,
    onRemoved: (removed) => {
      if (removed.length) console.warn(post.id, removed.map((r) => r.type ?? r.reason));
    },
  });
  await db.posts.update(post.id, { content: doc }); // keep post.html until you have checked
}`;

const beforeCode = `// Before: TinyMCE from Tiny Cloud
import { Editor } from '@tinymce/tinymce-react';

<Editor apiKey="your-api-key" initialValue={html} onEditorChange={setHtml} />

// After: Post Canvas, no key
import { PostCanvas } from 'post-canvas';

<PostCanvas preset="article" defaultContent={doc} onChange={({ json }) => setDoc(json)} />`;

export default function TinymceAlternativePage() {
  const page = seoPage(slug);
  return (
    <div className="site-sections flex-1">
      <SeoJsonLd page={page} faqs={faqs} />
      <SeoHero
        label="TinyMCE alternative"
        title="A TinyMCE alternative for React, with no API key"
        lead={
          <p>
            Post Canvas is an MIT-licensed React rich text editor built on Tiptap. Install it from npm and host it with
            your app: no API key, licence key or cloud account. Photo galleries, video embeds and a server-side
            sanitizer are built in.
          </p>
        }
        facts={[
          ['Licence', 'MIT'],
          ['API key', 'None'],
          ['React', '18.2 and 19'],
          ['Price', 'Free'],
        ]}
      />

      <WhoFor
        title="React teams moving off TinyMCE"
        points={[
          'You load TinyMCE from Tiny Cloud and would rather not tie an API key and an editor-load limit to your app.',
          'You self-host TinyMCE and want MIT terms instead of the GPL or a commercial licence.',
          'Your posts are text, photos, video and links, not documents that need tracked changes.',
          'You render saved posts on your server and want the sanitizer to match the editor.',
        ]}
      >
        You use TinyMCE through <code className="font-mono text-[0.92em]">@tinymce/tinymce-react</code>, and the editor
        holds blog posts, articles, announcements or user posts.
      </WhoFor>

      <CompareTable
        title="Post Canvas and TinyMCE, side by side"
        intro="TinyMCE does more, and the table says where Post Canvas is behind."
        columns={['Post Canvas', 'TinyMCE 8']}
        rows={rows}
        sources={sources}
      />

      <SeoSection
        id="demo-title"
        anchor="demo"
        label="Live demo"
        title="Paste TinyMCE HTML, get a Post Canvas post"
        intro="The sample is HTML the way TinyMCE saves it: inline styles, a relative image path and an iframe. Convert it and edit the result. It all runs in your browser."
      >
        <HtmlImportDemo html={tinymceHtml} source="TinyMCE" />
      </SeoSection>

      <SeoSection
        id="migrate"
        label="Migrate"
        title="Move your saved posts over"
        intro={
          <>
            Convert each post once with <code className="font-mono text-[0.92em]">fromHTML()</code>, check what it left
            out, and save the JSON. The{' '}
            <Link
              href="/docs/guides/migrating-from-tinymce-froala"
              className="text-site-accent underline-offset-4 hover:underline"
            >
              migration guide
            </Link>{' '}
            has a full batch script and the list of what is kept and dropped.
          </>
        }
      >
        <FolderTabs
          label="Migration code"
          className="site-code min-w-0"
          tabs={[
            { label: 'Swap the component', content: <ServerCodeBlock lang="tsx" code={beforeCode} /> },
            { label: 'Convert in the browser', content: <ServerCodeBlock lang="tsx" code={browserCode} /> },
            { label: 'Batch on the server', content: <ServerCodeBlock lang="ts" code={serverCode} /> },
          ]}
        />
      </SeoSection>

      <SeoSection
        id="media"
        label="Built in"
        title="What you get without a plugin"
        intro="Galleries in four layouts, click-to-load video and social embeds, mentions and a slash menu come in the one package."
        boxed="panel"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Figure name="gallery-collage" caption="A gallery in the collage layout." maxWidth={620} />
          <Figure
            name="embed-youtube"
            caption="A YouTube link becomes a player that loads after a click."
            maxWidth={620}
          />
        </div>
      </SeoSection>

      <SeoSection
        id="gaps"
        label="Honest gaps"
        title="What TinyMCE does that Post Canvas doesn't (yet)"
        intro="If one of these is a must, stay on TinyMCE for now."
      >
        <GapList
          items={[
            {
              title: 'Comments, revision history and suggested edits',
              body: 'TinyMCE sells these as premium plugins. Post Canvas has none of them yet; they are on the roadmap.',
            },
            {
              title: 'Vue, Angular and other wrappers',
              body: 'Post Canvas ships a React component and a plain HTML build. There is no Vue or Angular package.',
            },
            {
              title: 'Right-to-left languages',
              body: 'The interface and the content are left to right only for now.',
            },
            {
              title: 'Free-form fonts and colours',
              body: 'Post Canvas has a nine-colour palette and no font family or size menus, so posts stay consistent. TinyMCE lets writers pick any of them.',
            },
          ]}
        />
      </SeoSection>

      <FaqSection faqs={faqs} />
      <RelatedPages current={slug} />
      <SeoCta
        title="Try it with your own TinyMCE content"
        body="Paste a post into the demo above, or install the package and convert one real post."
      />
    </div>
  );
}
