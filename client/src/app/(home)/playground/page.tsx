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
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">Playground</h1>
      <p className="mb-6 text-fd-muted-foreground">
        Try the editor with a preset, a language and a feature set of your choice. Nothing you type leaves your browser.
      </p>
      <PlaygroundEditor />
    </main>
  );
}
