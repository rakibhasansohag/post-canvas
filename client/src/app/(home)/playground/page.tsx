import type { Metadata } from 'next';
import { PlaygroundEditor } from '@/components/playground-editor';

export const metadata: Metadata = {
  title: 'Playground',
  description:
    'Try Post Canvas in your browser: switch presets, themes, languages and features, then read the document as JSON, HTML, Markdown and text.',
  alternates: { canonical: './' },
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
