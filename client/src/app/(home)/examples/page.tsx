import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ServerCodeBlock } from 'fumadocs-ui/components/codeblock.rsc';
import type { Metadata } from 'next';
import { shareMetadata } from '@/components/seo/metadata';
import Link from 'next/link';
import { ExampleStage, type ExampleName } from '@/components/examples/example-stage';
import { FolderTabs } from '@/components/site/folder-tabs';

const title = 'React Rich Text Editor Examples: Article, Social Post, Comment | Post Canvas';
const description =
  'Three live React rich text editor examples on Tiptap, with their source: a blog and article editor, a social post composer and a comment box.';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: './' },
  ...shareMetadata({ title, description }),
};

const examples: {
  name: ExampleName;
  file: string;
  title: string;
  body: string;
  points: string[];
  minHeight: [string, string?, string?];
  docs: { label: string; href: string };
}[] = [
  {
    name: 'social',
    file: 'social-composer.tsx',
    title: 'A social composer',
    body: 'Write a post, add photos or paste a link, and post it to the feed below. The Post button waits for uploads to finish.',
    points: [
      'preset="social"',
      'hasPendingUploads before posting',
      'sanitizeDocument, then PostCanvasView in the feed',
    ],
    minHeight: ['18rem', '17rem'],
    docs: { label: 'Saving and loading', href: '/docs/guides/saving-and-loading' },
  },
  {
    name: 'article',
    file: 'article-editor.tsx',
    title: 'An article editor',
    body: 'A title, a cover and the full set of blocks. Publish shows the article as a reader sees it, cover and all.',
    points: ['preset="article"', 'Controlled fields with onFieldsChange', 'A word count from getDocStats'],
    minHeight: ['34rem', '40rem'],
    docs: { label: 'Presets', href: '/docs/concepts/presets-and-features' },
  },
  {
    name: 'comment',
    file: 'comment-thread.tsx',
    title: 'A comment thread',
    body: 'A small box with no toolbar. Enter posts, Shift and Enter adds a line, and @ mentions people from your own list.',
    points: ['preset="comment" with submitOnEnter', 'onSubmit, then clear()', 'Each comment renders read-only'],
    minHeight: ['20rem', '19rem'],
    docs: { label: 'Mentions and hashtags', href: '/docs/guides/mentions-and-hashtags' },
  },
];

async function source(file: string) {
  return readFile(join(process.cwd(), 'src/components/examples', file), 'utf8');
}

export default async function ExamplesPage() {
  const sources = await Promise.all(examples.map((example) => source(example.file)));
  return (
    <div className="site-sections flex-1">
      <section className="site-col pt-12 sm:pt-16 lg:pt-20" aria-labelledby="examples-title">
        <p className="site-label mb-4">Examples</p>
        <h1 id="examples-title" className="site-display max-w-[16ch]">
          Three editors, with their code
        </h1>
        <p className="site-lead mt-5 max-w-[40rem]">
          Each one is live: type, upload a photo, paste a link. The source beside it is the file that runs, so you can
          copy it into your app and swap the fake adapters for your own.
        </p>
        <nav aria-label="On this page" className="mt-8 flex flex-wrap gap-2">
          {examples.map((example) => (
            <a key={example.name} href={`#${example.name}`} className="site-chip">
              {example.title}
            </a>
          ))}
        </nav>
      </section>

      {examples.map((example, index) => (
        <section
          key={example.name}
          id={example.name}
          aria-labelledby={`${example.name}-title`}
          className="site-col scroll-mt-20 pt-20 md:pt-28"
        >
          <div className={index % 2 === 1 ? 'site-panel site-bleed px-5 py-10 sm:px-10 md:py-14 lg:px-14' : ''}>
            <div className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end" data-reveal>
              <div>
                <p className="site-label mb-3" data-numbered="">
                  {example.file}
                </p>
                <h2 id={`${example.name}-title`} className="site-h2">
                  {example.title}
                </h2>
                <p className="site-lead mt-3 max-w-[38rem]">{example.body}</p>
              </div>
              <ul className="flex flex-wrap gap-2 lg:justify-end">
                {example.points.map((point) => (
                  <li
                    key={point}
                    className="rounded-full border border-site-border bg-site-bg px-3 py-1.5 font-mono text-[0.78rem]"
                  >
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
              <div className="site-stage site-dots p-3 sm:p-5">
                <ExampleStage name={example.name} minHeight={example.minHeight} />
              </div>
              <div className="flex min-w-0 flex-col gap-3">
                <FolderTabs
                  label={`${example.title} source`}
                  className="site-code"
                  bodyClassName="max-h-[34rem] overflow-auto"
                  tabs={[{ label: example.file, content: <ServerCodeBlock lang="tsx" code={sources[index] ?? ''} /> }]}
                />
                <p className="text-[0.92rem] text-site-muted">
                  Read more in{' '}
                  <Link href={example.docs.href} className="text-site-accent underline-offset-4 hover:underline">
                    {example.docs.label}
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
