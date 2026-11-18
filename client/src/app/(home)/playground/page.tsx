import type { Metadata } from 'next';
import { shareMetadata } from '@/components/seo/metadata';
import { PlaygroundEditor } from '@/components/playground-editor';

const title = 'Rich Text Editor Playground: Try Post Canvas Online | Post Canvas';
const description =
  'Try an online rich text editor in your browser: switch presets, themes, languages and features, then read the document as JSON, HTML, Markdown and text.';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: './' },
  ...shareMetadata({ title, description }),
};

export default function PlaygroundPage() {
  return (
    <div className="site-col flex-1 pt-10 sm:pt-14">
      <div className="mb-8 flex flex-col gap-3 md:mb-10">
        <p className="site-label">Playground</p>
        <h1 className="site-h2">Try every switch</h1>
        <p className="site-lead max-w-[42rem]">
          Pick a preset, a theme, a language and the features you want, then write. The document updates below as JSON,
          HTML, Markdown, text and the read-only view.
        </p>
      </div>
      <PlaygroundEditor />
    </div>
  );
}
