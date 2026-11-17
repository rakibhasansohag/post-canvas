import type { Metadata } from 'next';
import { PlaygroundEditor } from '@/components/playground-editor';

export const metadata: Metadata = {
  title: 'Playground',
  description: 'Try the Post Canvas editor in your browser.',
};

export default function PlaygroundPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">Playground</h1>
      <p className="mb-6 text-fd-muted-foreground">Try the editor. Nothing you type leaves your browser.</p>
      <PlaygroundEditor />
    </main>
  );
}
