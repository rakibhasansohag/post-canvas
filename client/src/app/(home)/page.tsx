import { ServerCodeBlock } from 'fumadocs-ui/components/codeblock.rsc';
import { BookOpen, Plus, SlidersHorizontal } from 'lucide-react';
import type { Metadata } from 'next';
import { EmbedsDemo } from '@/components/demos/embeds-demo';
import { GalleryDemo } from '@/components/demos/gallery-demo';
import { HeroEditor } from '@/components/demos/hero-editor';
import { FormatsDemo, SanitizerDemo } from '@/components/demos/output-demo';
import { PresetsDemo } from '@/components/demos/presets-demo';
import { RichTextDemo } from '@/components/demos/rich-text-demo';
import { ButtonLink } from '@/components/site/button';
import { FolderTabs } from '@/components/site/folder-tabs';
import { InstallCommand } from '@/components/site/install-command';
import { SectionHead } from '@/components/site/section-head';
import { appDescription, appName, facts, npmUrl, repoUrl, siteUrl } from '@/lib/shared';

export const metadata: Metadata = {
  title: { absolute: 'Post Canvas: an open-source React editor with a media canvas' },
  description: appDescription,
  alternates: { canonical: './' },
};

const comparisonColumns = ['Post Canvas', 'TinyMCE', 'Froala', 'Tiptap', 'Lexical'] as const;

const comparison: { feature: string; values: [string, string, string, string, string] }[] = [
  {
    feature: 'Licence',
    values: ['MIT', 'GPL-2.0 or later, or commercial', 'Commercial', 'MIT core, paid Pro extensions', 'MIT'],
  },
  { feature: 'Ready-made editor UI', values: ['Yes', 'Yes', 'Yes', 'No, you build it', 'No, you build it'] },
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

const reactStart = `import { PostCanvas } from 'post-canvas';
import 'post-canvas/styles.css';

export function Composer() {
  return (
    <PostCanvas
      preset="social"
      onChange={({ json }) => console.log(json)}
    />
  );
}`;

const nextStart = `// app/write/post-editor.tsx: the editor is a Client Component
'use client';
import { PostCanvas } from 'post-canvas';

export function PostEditor({ onSave }: { onSave: (json: object) => void }) {
  return <PostCanvas preset="article" onChange={({ json }) => onSave(json)} />;
}

// app/posts/[id]/page.tsx: the saved post renders on the server
import { PostCanvasView } from 'post-canvas/render';

export default async function PostPage({ params }: PageProps<'/posts/[id]'>) {
  const post = await getPost((await params).id); // your own storage
  return <PostCanvasView content={post.content} />;
}`;

const cdnStart = `<link rel="stylesheet" href="https://unpkg.com/post-canvas@0.1.0/dist/cdn/post-canvas.css" />
<script src="https://unpkg.com/post-canvas@0.1.0/dist/cdn/post-canvas.iife.js"></script>

<div id="editor"></div>
<script>
  const canvas = PostCanvas.create(document.getElementById('editor'), {
    preset: 'article',
    defaultContent: '<h2>Hello</h2><p>Start writing here.</p>',
  });
  canvas.on('change', (json) => console.log(json));
</script>`;

const faqs: { question: string; answer: string }[] = [
  {
    question: 'Is Post Canvas free to use?',
    answer:
      'Yes. It is released under the MIT licence, so you can use it in commercial and closed-source products. The optional HEIC photo conversion uses heic-to, which is LGPL and which you install yourself if you want it.',
  },
  {
    question: 'Does it work with Next.js and React Server Components?',
    answer:
      'Yes. The editor is a Client Component. renderToHTML, PostCanvasView and sanitizeDocument run in Server Components and on any server, with no DOM, so saved posts render without shipping the editor to readers.',
  },
  {
    question: 'Can I use it without React?',
    answer:
      'Yes. The CDN build is one script and one stylesheet with React inside: call PostCanvas.create(element, options) on any page. With a bundler but no React, import post-canvas/vanilla.',
  },
  {
    question: 'Where do uploaded photos go?',
    answer:
      'Wherever your upload adapter sends them: S3, Cloudinary or your own route. The editor handles the picker, drag and drop, paste, progress, retry and cancel. Nothing is uploaded without your adapter.',
  },
  {
    question: 'Is it safe to show what people write?',
    answer:
      'Run sanitizeDocument on your server for any document a client sends. It keeps only what the schema allows, checks every URL and drops editor-only state. Players are built from validated ids at render time, never from stored HTML or iframe sources.',
  },
  {
    question: 'Does it support real-time collaboration?',
    answer:
      'Not yet. Collaboration, comments and track changes are on the roadmap. Today a document is plain Tiptap JSON that you save and load yourself.',
  },
  {
    question: 'How big is it?',
    answer: `About 282 kB gzipped for the editor with React external, and about ${facts.renderKb} kB for renderToHTML on its own. The CDN file is about 389 kB with React inside. Code highlighting languages load only when a code block needs them.`,
  },
  {
    question: 'Which languages does the interface speak?',
    answer:
      'English, German, Spanish, French, Italian and Portuguese. English ships in the main entry, the others are separate imports, and you can pass your own Locale object for any other language.',
  },
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareSourceCode',
      name: appName,
      description: appDescription,
      url: siteUrl,
      codeRepository: repoUrl,
      programmingLanguage: ['TypeScript', 'React'],
      license: 'https://opensource.org/licenses/MIT',
      sameAs: [npmUrl],
    },
    {
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    },
  ],
};

const callouts = [
  { label: 'Toolbar', side: 'left', top: '4.6rem' },
  { label: 'Mentions', side: 'right', top: '7.4rem' },
  { label: 'Collage', side: 'left', top: '11.5rem' },
] as const;

function Hero() {
  return (
    <section aria-labelledby="hero-title" className="site-col pt-3 sm:pt-4">
      <div className="site-deep site-dots site-bleed px-6 pt-12 pb-[13rem] sm:px-10 sm:pt-16 md:pb-[17rem] lg:px-14 lg:pt-20">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end lg:gap-12">
          <div>
            <p className="site-label site-rise mb-6 [--i:0]">Open-source React editor</p>
            <h1 id="hero-title" className="site-display site-rise max-w-[13ch] [--i:1]">
              Posts with <span className="site-hero-mark">photos</span>, video and links in one editor
            </h1>
          </div>
          <div className="site-rise flex flex-col gap-6 [--i:2]">
            <p className="text-[1.125rem] leading-relaxed text-site-deep-muted sm:text-[1.2rem]">
              Post Canvas is a rich-text editor with galleries, collages, video and social embeds built in, and output
              you can sanitize and render on your server. Built on Tiptap.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/docs/getting-started">Get started</ButtonLink>
              <ButtonLink href="/playground" variant="secondary" icon={SlidersHorizontal}>
                Playground
              </ButtonLink>
            </div>
            <InstallCommand className="w-full max-w-[24rem] text-white" />
          </div>
        </div>
        <dl className="site-rise mt-12 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-white/12 pt-6 [--i:3] sm:grid-cols-4">
          {[
            ['Licence', 'MIT'],
            ['React', '18.2 and 19'],
            ['Languages', String(facts.languages)],
            ['Tests', String(facts.tests)],
          ].map(([term, value]) => (
            <div key={term}>
              <dt className="font-mono text-[0.72rem] tracking-[0.14em] text-site-deep-muted uppercase">{term}</dt>
              <dd className="mt-1 font-display text-[1.5rem] font-bold tracking-[-0.02em] tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="relative z-[1] mx-auto -mt-[11rem] max-w-[60rem] px-2 sm:px-6 md:-mt-[15rem] 2xl:max-w-[54rem]">
        <div className="site-window site-rise [--i:4]">
          <div className="site-window-bar">
            <span className="site-window-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span className="truncate">preset=&quot;social&quot;</span>
            <span className="ms-auto inline-flex items-center gap-1.5 text-site-ok">
              <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
              Live
            </span>
          </div>
          <div className="min-h-[33rem] sm:min-h-[38rem] md:min-h-[41rem] lg:min-h-[51.5rem] 2xl:min-h-[47rem] min-[160rem]:min-h-[43.75rem] min-[215rem]:min-h-[40.5rem] min-[240rem]:min-h-[38rem]">
            <HeroEditor />
          </div>
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden 2xl:block">
          {callouts.map((callout, index) => (
            <div
              key={callout.label}
              className="site-fade absolute flex items-center gap-3"
              style={{
                top: callout.top,
                ...(callout.side === 'left' ? { right: 'calc(100% - 1.5rem)' } : { left: 'calc(100% - 1.5rem)' }),
                flexDirection: callout.side === 'left' ? 'row' : 'row-reverse',
                ['--i' as string]: index,
              }}
            >
              <span className="font-mono text-[0.75rem] tracking-[0.14em] whitespace-nowrap text-white uppercase">
                {callout.label}
              </span>
              <svg width="56" height="10" viewBox="0 0 72 10" className="overflow-visible text-[#7aa2f7]">
                <path
                  d={callout.side === 'left' ? 'M0 5H66' : 'M72 5H6'}
                  pathLength={1}
                  className="site-draw"
                  style={{ ['--i' as string]: index }}
                  stroke="currentColor"
                  strokeWidth="1"
                  fill="none"
                />
                <circle cx={callout.side === 'left' ? 68 : 4} cy="5" r="3.5" fill="currentColor" />
              </svg>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="site-sections flex-1">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <Hero />

      <section aria-labelledby="rich-text" className="site-col pt-24 md:pt-32">
        <SectionHead id="rich-text" label="Rich text" numbered title="Writing tools people already know">
          A toolbar, a selection menu, a slash menu and a block handle, with mentions, tables and task lists. Try each
          one in the editor beside it.
        </SectionHead>
        <RichTextDemo />
      </section>

      <section aria-labelledby="galleries" className="site-col pt-24 md:pt-32">
        <div className="site-panel site-bleed px-5 py-12 sm:px-10 md:py-16 lg:px-14">
          <SectionHead id="galleries" label="Galleries" numbered title="Four layouts for the same photos">
            Upload a few photos and choose how they sit. Alt text, captions, reordering and upload progress are built
            in, and the reader sees the same layout.
          </SectionHead>
          <GalleryDemo />
        </div>
      </section>

      <section aria-labelledby="embeds" className="site-col pt-24 md:pt-32">
        <SectionHead id="embeds" label="Embeds" numbered title="Paste a link, get a block">
          Video, posts, music and maps become click-to-load players built from validated ids. Other links become cards
          from your own preview service.
        </SectionHead>
        <EmbedsDemo />
      </section>

      <section aria-labelledby="presets" className="site-col pt-24 md:pt-32">
        <div className="site-deep site-dots site-bleed px-5 py-12 sm:px-10 md:py-16 lg:px-14">
          <SectionHead id="presets" label="Presets" numbered title="One editor, shaped for the job">
            A preset sets the features, limits and checks for a social post, an article or a comment box. Override any
            of it with the features prop.
          </SectionHead>
          <PresetsDemo />
        </div>
      </section>

      <section aria-labelledby="output" className="site-col pt-24 md:pt-32">
        <SectionHead id="output" label="Safe output" numbered title="Output you can trust on your server">
          A document is JSON. Render it as HTML, React, Markdown or text, and run the same sanitizer on your server
          before anyone else sees it.
        </SectionHead>
        <FormatsDemo />
        <div className="mt-16 md:mt-20">
          <h3 className="site-h3 mb-2">The sanitizer, on a hostile document</h3>
          <p className="mb-6 max-w-[42rem] text-site-muted">
            Edit the JSON on the left. The right side updates as you type, with every removal listed.
          </p>
          <SanitizerDemo />
        </div>
      </section>

      <section aria-labelledby="compare" className="site-col pt-24 md:pt-32">
        <div className="site-panel site-bleed px-5 py-12 sm:px-10 md:py-16 lg:px-14">
          <SectionHead id="compare" label="Compare" title="How it compares">
            Post Canvas is young, and the table says where it is behind. The other columns summarise each project&apos;s
            public documentation as of November 2026; check them before you decide.
          </SectionHead>
          <div
            className="-mx-5 overflow-x-auto px-5 sm:-mx-10 sm:px-10 lg:mx-0 lg:px-0"
            role="region"
            aria-label="Comparison table, scrolls sideways"
            tabIndex={0}
          >
            <table className="site-table">
              <thead>
                <tr>
                  <th scope="col">
                    <span className="sr-only">Feature</span>
                  </th>
                  {comparisonColumns.map((name, index) => (
                    <th key={name} scope="col" data-ours={index === 0 ? '' : undefined}>
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={row.feature}>
                    <th scope="row">{row.feature}</th>
                    {row.values.map((value, index) => (
                      <td key={index} data-ours={index === 0 ? '' : undefined}>
                        {value === 'Not yet' ? (
                          <span className="inline-flex rounded-full bg-site-mark px-2.5 py-0.5 text-[0.85rem] font-semibold text-site-ink">
                            Not yet
                          </span>
                        ) : (
                          value
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section aria-labelledby="start" className="site-col pt-24 md:pt-32">
        <SectionHead id="start" label="Quick start" title="Up and running in a few lines">
          Install from npm, import the stylesheet and render the editor. Or add the CDN build to any page, with no build
          step.
        </SectionHead>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-10">
          <ol className="flex flex-col gap-6">
            {[
              ['Install', 'One package. React 18.2 or 19 is the only peer dependency.'],
              ['Render', 'Pick a preset, pass your adapters, keep the JSON from onChange.'],
              ['Save and show', 'Sanitize on your server, then render with PostCanvasView or renderToHTML.'],
            ].map(([title, body], index) => (
              <li key={title} className="flex gap-4" data-reveal>
                <span className="grid size-9 shrink-0 place-items-center rounded-full border border-site-border font-mono text-[0.85rem]">
                  {index + 1}
                </span>
                <span>
                  <span className="block font-semibold">{title}</span>
                  <span className="block text-site-muted">{body}</span>
                </span>
              </li>
            ))}
            <li className="ms-13">
              <InstallCommand className="w-full max-w-[22rem]" />
            </li>
          </ol>
          <FolderTabs
            label="Quick start"
            className="site-code min-w-0"
            tabs={[
              { label: 'React', content: <ServerCodeBlock lang="tsx" code={reactStart} /> },
              { label: 'Next.js', content: <ServerCodeBlock lang="tsx" code={nextStart} /> },
              { label: 'CDN', content: <ServerCodeBlock lang="html" code={cdnStart} /> },
            ]}
          />
        </div>
      </section>

      <section aria-labelledby="faq" className="site-col pt-24 md:pt-32">
        <div className="grid grid-cols-1 gap-8 border-t border-site-border pt-16 md:pt-20 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-10">
          <SectionHead id="faq" label="FAQ" title="Questions" className="lg:mb-0 lg:block">
            Something else?{' '}
            <a href={`${repoUrl}/issues`} className="text-site-accent underline-offset-4 hover:underline">
              Open an issue on GitHub
            </a>
            .
          </SectionHead>
          <div className="site-faq border-t border-site-border">
            {faqs.map((faq) => (
              <details key={faq.question}>
                <summary>
                  {faq.question}
                  <Plus size={20} aria-hidden="true" />
                </summary>
                <p className="max-w-[44rem] pb-5 text-site-muted">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="cta" className="site-col pt-24 md:pt-32">
        <div className="site-cta site-bleed flex flex-col gap-8 overflow-hidden px-6 py-12 sm:px-10 md:py-16 lg:flex-row lg:items-end lg:justify-between lg:px-14">
          <div className="max-w-[40rem]" data-reveal>
            <h2 id="cta" className="site-h2">
              Try it with your own content
            </h2>
            <p className="mt-4 text-[1.1rem] text-white/85">
              Switch presets, languages and features in the playground, then read the docs when you are ready to wire it
              up.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/playground" icon={SlidersHorizontal}>
              Open the playground
            </ButtonLink>
            <ButtonLink href="/docs" variant="secondary" icon={BookOpen}>
              Read the docs
            </ButtonLink>
          </div>
        </div>
      </section>
    </div>
  );
}
