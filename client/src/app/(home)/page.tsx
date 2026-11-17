import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import type { Metadata } from 'next';
import Link from 'next/link';
import { HomeDemo } from '@/components/home-demo';
import { appDescription, gitConfig } from '@/lib/shared';

export const metadata: Metadata = {
  title: { absolute: 'Post Canvas: an open-source React editor with a media canvas' },
  description: appDescription,
  alternates: { canonical: './' },
};

const repoUrl = `https://github.com/${gitConfig.user}/${gitConfig.repo}`;

const features = [
  {
    title: 'A media canvas',
    body: 'Photo galleries as a carousel, grid, masonry or collage. Drag to reorder, add alt text, place photos freely in a collage. Video and social embeds, link cards and files sit in the same flow, with uploads you control.',
  },
  {
    title: 'Rich text that holds up',
    body: 'Headings, lists, tables, code blocks, links, colours, mentions and hashtags, a toolbar, a selection menu, a slash menu and a block handle. Pasting from Word and Google Docs comes out clean. Four presets, from a comment box to a long article.',
  },
  {
    title: 'Safe output',
    body: 'One sanitizer runs in the editor, on your server and when you render. Every URL is checked, every player is built from validated ids, and nothing needs a DOM on the server. Read documents back as HTML, React, Markdown or text.',
  },
];

const comparison: { feature: string; values: [string, string, string, string, string] }[] = [
  {
    feature: 'Licence',
    values: ['MIT', 'GPL-2.0 or later, or commercial', 'Commercial', 'MIT core, paid Pro extensions', 'MIT'],
  },
  {
    feature: 'Ready-made editor UI',
    values: ['Yes', 'Yes', 'Yes', 'No, you build it', 'No, you build it'],
  },
  {
    feature: 'Photo galleries and collage',
    values: ['Built in', 'Not built in', 'Not built in', 'You build it', 'You build it'],
  },
  {
    feature: 'Video and social embeds',
    values: ['Built in, click to load', 'Media plugin', 'Video insert', 'YouTube extension', 'You build it'],
  },
  {
    feature: 'Sanitizer for saved content on your server',
    values: [
      'Yes, the same schema as the editor',
      'Bring your own',
      'Bring your own',
      'Bring your own',
      'Bring your own',
    ],
  },
  {
    feature: 'Real-time collaboration',
    values: ['Not yet', 'Paid plans', 'Collaboration plugin in the licence', 'Yjs and Hocuspocus', 'Yjs binding'],
  },
  {
    feature: 'Comments and track changes',
    values: ['Not yet', 'Paid plugins', 'In the collaboration plugin', 'Tiptap Cloud product', 'You build it'],
  },
  {
    feature: 'Frameworks',
    values: [
      'React and plain HTML',
      'React, Vue, Angular and more',
      'React, Vue, Angular and more',
      'Any, with React and Vue packages',
      'Any, with React bindings',
    ],
  },
];

const quickStart = `import { PostCanvas } from 'post-canvas';
import 'post-canvas/styles.css';

export function Composer() {
  return (
    <PostCanvas
      preset="social"
      onChange={({ json }) => console.log(json)}
    />
  );
}`;

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:py-14">
      <section className="mb-10 max-w-3xl">
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">Post Canvas</h1>
        <p className="mb-6 text-lg text-fd-muted-foreground">
          An open-source React editor for posts and articles. Rich text, photo galleries, video and social embeds, and
          output you can render safely anywhere. Built on Tiptap.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/docs/getting-started"
            className="rounded-md bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground"
          >
            Get started
          </Link>
          <Link href="/playground" className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-fd-accent">
            Open the playground
          </Link>
          <a href={repoUrl} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-fd-accent">
            GitHub
          </a>
        </div>
      </section>

      <section aria-label="Live demo" className="mb-16">
        <HomeDemo />
        <p className="mt-2 text-sm text-fd-muted-foreground">
          This is the real editor with the social preset. Type, paste a link, press / or drag a photo block.
        </p>
      </section>

      <section aria-label="Features" className="mb-16 grid gap-8 md:grid-cols-3">
        {features.map((feature) => (
          <div key={feature.title}>
            <h2 className="mb-2 text-xl font-semibold">{feature.title}</h2>
            <p className="text-fd-muted-foreground">{feature.body}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="install" className="mb-16">
        <h2 id="install" className="mb-3 text-2xl font-semibold">
          Install
        </h2>
        <DynamicCodeBlock lang="bash" code="npm install post-canvas" />
        <div className="mt-4">
          <DynamicCodeBlock lang="tsx" code={quickStart} />
        </div>
        <p className="mt-3 text-fd-muted-foreground">
          Next.js, Vite and plain HTML are covered in{' '}
          <Link href="/docs/getting-started" className="underline">
            Getting started
          </Link>
          . Post Canvas needs React 18.2 or newer.
        </p>
      </section>

      <section aria-labelledby="compare" className="mb-16">
        <h2 id="compare" className="mb-3 text-2xl font-semibold">
          How it compares
        </h2>
        <p className="mb-4 text-fd-muted-foreground">
          Post Canvas is young, and the table says where it is behind. The other columns summarise each project&apos;s
          public documentation as of November 2026. Their plans and licences change, so check them before you decide.
        </p>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="bg-fd-card">
              <tr>
                <th scope="col" className="p-3 font-medium">
                  &nbsp;
                </th>
                {['Post Canvas', 'TinyMCE', 'Froala', 'Tiptap', 'Lexical'].map((name) => (
                  <th key={name} scope="col" className="p-3 font-medium">
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparison.map((row) => (
                <tr key={row.feature} className="border-t">
                  <th scope="row" className="p-3 font-medium">
                    {row.feature}
                  </th>
                  {row.values.map((value, index) => (
                    <td key={index} className="p-3 align-top text-fd-muted-foreground">
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="links">
        <h2 id="links" className="mb-3 text-2xl font-semibold">
          Keep reading
        </h2>
        <ul className="grid gap-2 text-fd-muted-foreground sm:grid-cols-2">
          <li>
            <Link href="/docs/concepts/document-json" className="underline">
              The document format
            </Link>
          </li>
          <li>
            <Link href="/docs/guides/uploads" className="underline">
              Uploads to S3, Cloudinary or your own route
            </Link>
          </li>
          <li>
            <Link href="/docs/concepts/security" className="underline">
              The security model
            </Link>
          </li>
          <li>
            <Link href="/docs/roadmap" className="underline">
              Roadmap
            </Link>
          </li>
        </ul>
      </section>
    </main>
  );
}
