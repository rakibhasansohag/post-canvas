import { ServerCodeBlock } from 'fumadocs-ui/components/codeblock.rsc';
import type { Metadata } from 'next';
import Link from 'next/link';
import { GalleryDemo } from '@/components/demos/gallery-demo';
import { Figure } from '@/components/docs/figure';
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

const slug = 'tiptap-image-gallery';
export const metadata: Metadata = seoMetadata(slug);

const sources: Source[] = [
  {
    label: 'Tiptap docs: Image extension, which does not upload',
    href: 'https://tiptap.dev/docs/editor/extensions/nodes/image',
  },
  {
    label: 'Tiptap docs: FileHandler, drops and pastes but no server upload',
    href: 'https://tiptap.dev/docs/editor/extensions/functionality/filehandler',
  },
  {
    label: 'Tiptap Image changelog: the resize option, added in 3.10.0',
    href: 'https://github.com/ueberdosis/tiptap/blob/main/packages/extension-image/CHANGELOG.md',
  },
  {
    label: 'Tiptap packages in the open-source repository',
    href: 'https://github.com/ueberdosis/tiptap/tree/main/packages',
  },
  { label: 'Post Canvas docs: image uploads', href: '/docs/guides/uploads' },
  { label: 'Post Canvas docs: image galleries', href: '/docs/guides/galleries' },
  { label: 'Post Canvas docs: image alignment', href: '/docs/guides/galleries#image-alignment' },
  { label: 'Post Canvas docs: rendering documents', href: '/docs/concepts/rendering' },
  { label: 'Tiptap docs: JSON and HTML output', href: 'https://tiptap.dev/docs/guides/output-json-html' },
  { label: 'Post Canvas docs: security model', href: '/docs/concepts/security' },
];

const rows: CompareRow[] = [
  {
    feature: 'Upload to your storage',
    cells: [
      { text: 'An upload adapter: one upload() function for S3, Cloudinary or your route', src: [5] },
      { text: 'Not included; the Image extension takes a URL', src: [1] },
    ],
  },
  {
    feature: 'Paste and drop files',
    cells: [
      { text: 'Built in, with type and size checks', src: [5] },
      { text: 'FileHandler catches the events; you write the upload', src: [2] },
    ],
  },
  {
    feature: 'Progress, cancel and retry',
    cells: [
      { text: 'Built in, from onProgress and an AbortSignal', src: [5] },
      { text: 'Yours to build', src: [2] },
    ],
  },
  {
    feature: 'Resize',
    cells: [
      {
        text: 'Five widths for an image (centre, wide, full, left, right); collage photos resize by drag or pinch',
        src: [7, 6],
      },
      { text: 'A resize option on the Image extension since 3.10.0', src: [3] },
    ],
  },
  {
    feature: 'Galleries',
    cells: [
      { text: 'Carousel, grid, masonry and collage, with reordering, alt text and captions', src: [6] },
      { text: 'No gallery extension among the open-source packages', src: [4] },
    ],
  },
  {
    feature: 'HTML on the server',
    cells: [
      { text: 'renderToHTML() sanitizes first and needs no DOM', src: [8, 10] },
      { text: 'getHTML() in the editor, or a static renderer', src: [9] },
    ],
  },
];

const faqs: Faq[] = [
  {
    question: 'Does Tiptap have image upload built in?',
    answer:
      'No. Tiptap’s Image extension inserts an image from a URL and does not upload files. Its FileHandler extension catches pasted and dropped files, and you write the upload yourself. Post Canvas adds an upload adapter with progress, cancel and retry on top of Tiptap.',
  },
  {
    question: 'How do I resize images in Tiptap?',
    answer:
      'Tiptap’s Image extension has had a resize option since 3.10.0. In Post Canvas, a single image has five widths (centre, wide, full, left and right), and photos in a collage resize with a handle, a drag or a pinch.',
  },
  {
    question: 'Is there a Tiptap image gallery extension?',
    answer:
      'We found none among Tiptap’s open-source packages. Post Canvas ships a gallery node with four layouts (carousel, grid, masonry and collage), a gallery manager for reordering, and alt text and captions on each photo.',
  },
  {
    question: 'Can I use the galleries without the rest of Post Canvas?',
    answer:
      'Yes, with usePostCanvasEditor and the post-canvas/extensions entry you can build your own interface around the same nodes. Turn off what you do not need with the features prop, as the demo on this page does.',
  },
];

const adapterCode = `import { PostCanvas, type UploadAdapter } from 'post-canvas';
import 'post-canvas/styles.css';
import { xhrUpload } from './xhr-upload'; // progress and abort, from the uploads guide

const upload: UploadAdapter = {
  async upload(file, { signal, onProgress }) {
    // 1. Ask your server for a presigned S3 URL.
    const res = await fetch('/api/uploads', {
      method: 'POST',
      body: JSON.stringify({ name: file.name, type: file.type }),
      signal,
    });
    const { uploadUrl, publicUrl, key } = await res.json();

    // 2. Send the file straight to the bucket, reporting progress.
    await xhrUpload({ method: 'PUT', url: uploadUrl, body: file, signal, onProgress,
      headers: { 'Content-Type': file.type } });

    // 3. Return the public https URL. Width and height are measured for you.
    return { src: publicUrl, id: key };
  },
  maxBytes: { image: 10 * 1024 * 1024 },
};

export function Editor() {
  return (
    <PostCanvas
      adapters={{ upload }}
      features={{ gallery: { layouts: ['carousel', 'grid', 'masonry', 'collage'], maxPhotos: 10 } }}
    />
  );
}`;

const renderCode = `// app/posts/[id]/page.tsx: a Server Component
import { renderToHTML } from 'post-canvas/server';

export default async function Post({ params }: PageProps<'/posts/[id]'>) {
  const post = await getPost((await params).id); // your storage
  // Sanitizes first, then renders the gallery in its saved layout.
  const html = renderToHTML(post.content);
  return <article dangerouslySetInnerHTML={{ __html: html }} />;
}`;

export default function TiptapImageGalleryPage() {
  const page = seoPage(slug);
  return (
    <div className="site-sections flex-1">
      <SeoJsonLd page={page} faqs={faqs} />
      <SeoHero
        label="Tiptap images"
        title="Tiptap image upload, resize and galleries for React"
        lead={
          <p>
            Tiptap’s Image extension shows an image from a URL. Post Canvas, built on Tiptap, adds the rest: an upload
            adapter with progress, paste and drop, image widths, and galleries in four layouts that render to safe HTML
            on your server.
          </p>
        }
        facts={[
          ['Layouts', '4'],
          ['Upload', 'Your storage'],
          ['Licence', 'MIT'],
          ['React', '18.2 and 19'],
        ]}
      />

      <CompareTable
        title="Tiptap’s image extensions and Post Canvas"
        intro="What Tiptap’s own open-source extensions cover, and what Post Canvas adds."
        columns={['Post Canvas', 'Tiptap Image and FileHandler']}
        rows={rows}
        sources={sources}
      />

      <SeoSection
        id="demo-title"
        anchor="demo"
        label="Live demo"
        title="One gallery, four layouts"
        intro="Switch the layout here, or select the gallery and use its own menu. Photos you add go to a demo adapter and stay in your browser."
      >
        <GalleryDemo />
      </SeoSection>

      <SeoSection
        id="layouts"
        label="Layouts"
        title="Carousel, grid, masonry and collage"
        intro="The same photos in each layout. Readers see the layout the writer picked."
        boxed="panel"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Figure
            name="gallery-carousel"
            caption="Carousel: one photo at a time, with arrows and dots."
            maxWidth={620}
          />
          <Figure name="gallery-grid" caption="Grid: even square tiles." maxWidth={620} />
          <Figure name="gallery-masonry" caption="Masonry: columns that keep each photo's shape." maxWidth={620} />
          <Figure name="collage-arrange" caption="Collage: drag, resize and turn each photo." maxWidth={620} />
        </div>
      </SeoSection>

      <SeoSection
        id="upload"
        label="Upload"
        title="An upload adapter with progress, cancel and retry"
        intro={
          <>
            One <code className="font-mono text-[0.92em]">upload()</code> function sends the file to your storage and
            returns its URL. The{' '}
            <Link href="/docs/guides/uploads" className="text-site-accent underline-offset-4 hover:underline">
              uploads guide
            </Link>{' '}
            has recipes for S3, Cloudinary and your own route, and the progress helper this uses.
          </>
        }
      >
        <FolderTabs
          label="Gallery code"
          className="site-code min-w-0"
          tabs={[
            { label: 'Upload adapter', content: <ServerCodeBlock lang="tsx" code={adapterCode} /> },
            { label: 'Render on the server', content: <ServerCodeBlock lang="tsx" code={renderCode} /> },
          ]}
        />
      </SeoSection>

      <FaqSection faqs={faqs} />
      <RelatedPages
        current={slug}
        extra={[
          {
            label: 'Galleries guide',
            href: '/docs/guides/galleries',
            blurb: 'Layouts, limits, the manager and the collage editor.',
          },
        ]}
      />
      <SeoCta
        title="Add galleries to your Tiptap editor"
        body="Install Post Canvas, pass an upload adapter, and your writers get all four layouts."
      />
    </div>
  );
}
