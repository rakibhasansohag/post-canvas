import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col justify-center px-4 text-center">
      <h1 className="mb-4 text-2xl font-bold">Post Canvas</h1>
      <p>
        A rich-text editor for posts and articles, with a media canvas. Read the{' '}
        <Link href="/docs" className="font-medium underline">
          docs
        </Link>{' '}
        or try the{' '}
        <Link href="/playground" className="font-medium underline">
          playground
        </Link>
        .
      </p>
    </main>
  );
}
