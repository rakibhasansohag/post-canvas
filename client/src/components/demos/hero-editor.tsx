'use client';

import {
  ArrowRight,
  AtSign,
  ImagePlus,
  LayoutGrid,
  MousePointerClick,
  Play,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { PostCanvas, type GalleryLayout, type JSONContent, type PostCanvasHandle } from 'post-canvas';
import 'post-canvas/styles.css';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useSiteTheme } from '@/components/site/use-site-theme';
import { createFakeAdapters } from '@/lib/fake-adapters';
import { photos, type PhotoName } from '@/lib/photos';
import { createSampleContent } from '@/lib/sample-content';
import { basePath } from '@/lib/shared';
import { caretAtEmptyEnd, firstNodeId, simulatePaste, useOrigin, type Editor } from './demo-utils';

const layoutOrder: GalleryLayout[] = ['collage', 'grid', 'masonry', 'carousel'];
const layoutNames: Record<GalleryLayout, string> = {
  collage: 'collage',
  grid: 'grid',
  masonry: 'masonry',
  carousel: 'carousel',
};
const nextLayout = (layout: GalleryLayout) =>
  layoutOrder[(layoutOrder.indexOf(layout) + 1) % layoutOrder.length] ?? 'grid';

// Photos the "Upload a photo" hint adds, in turn. They go through the upload adapter like a dropped file.
const extraPhotos: PhotoName[] = ['coast', 'lighthouse', 'beach', 'cafe', 'rooftops', 'garden'];

const video = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';

const start = (origin: string) => createSampleContent(origin, { closing: false, layout: 'collage' });

function galleryLayoutOf(json: JSONContent): GalleryLayout | null {
  const gallery = json.content?.find((node) => node.type === 'gallery');
  const layout = gallery?.attrs?.layout;
  return layoutOrder.includes(layout as GalleryLayout) ? (layout as GalleryLayout) : null;
}

/** Uploads a sample photo into the gallery, or at the end of the post if the gallery is gone. */
async function uploadSample(editor: Editor, origin: string, name: PhotoName): Promise<void> {
  const response = await fetch(`${origin}${basePath}/samples/${name}-1280.webp`);
  const file = new File([await response.blob()], `${name}.webp`, { type: 'image/webp' });
  if (editor.isDestroyed) return;
  const galleryId = firstNodeId(editor, 'gallery');
  if (galleryId) editor.commands.addGalleryPhotos([file], galleryId);
  else {
    caretAtEmptyEnd(editor);
    editor.commands.insertFiles([file]);
  }
}

interface Hint {
  id: string;
  title: string;
  /** The title on phones. */
  short: string;
  body: string;
  icon: LucideIcon;
}

/**
 * The home page's live editor: the social preset with a travel post and a collage, beside a rail that says it is live
 * and runs real editor commands on it.
 */
export function HeroEditor() {
  const handle = useRef<PostCanvasHandle>(null);
  const adapters = useMemo(() => createFakeAdapters(), []);
  const origin = useOrigin();
  const theme = useSiteTheme();
  const content = useMemo(() => (origin ? start(origin) : null), [origin]);
  const [layout, setLayout] = useState<GalleryLayout>('collage');
  const [status, setStatus] = useState('');
  const [last, setLast] = useState<string | null>(null);
  const added = useRef(0);

  const onChange = useCallback(({ json }: { json: JSONContent }) => {
    const current = galleryLayoutOf(json);
    if (current) setLayout(current);
  }, []);

  const following = nextLayout(layout);
  const hints: Hint[] = [
    {
      id: 'video',
      title: 'Paste a YouTube link',
      short: 'Add a video',
      body: 'It becomes a player that loads on click.',
      icon: Play,
    },
    {
      id: 'layout',
      title: `Show the photos as a ${layoutNames[following]}`,
      short: `Make it a ${layoutNames[following]}`,
      body: 'Four layouts for the same photos.',
      icon: LayoutGrid,
    },
    {
      id: 'mention',
      title: 'Mention someone',
      short: 'Mention someone',
      body: 'Type @ and pick a person.',
      icon: AtSign,
    },
    {
      id: 'photo',
      title: 'Upload a photo',
      short: 'Upload a photo',
      body: 'Watch it upload into the gallery.',
      icon: ImagePlus,
    },
  ];

  const run = (hint: Hint) => {
    const editor = handle.current?.editor;
    if (!editor || !origin) return;
    setLast(hint.id);
    switch (hint.id) {
      case 'video':
        caretAtEmptyEnd(editor);
        simulatePaste(editor, { text: video });
        setStatus('Pasted a YouTube link. It is now a player block.');
        break;
      case 'layout': {
        const id = firstNodeId(editor, 'gallery');
        if (!id) {
          setStatus('The gallery is gone. Reset to bring it back.');
          break;
        }
        editor.commands.setGalleryLayout(following, id);
        setLayout(following);
        setStatus(`The photos are now a ${layoutNames[following]}.`);
        break;
      }
      case 'mention':
        caretAtEmptyEnd(editor);
        editor.commands.insertContent('@');
        setStatus('Typed @. Pick a person from the list.');
        break;
      case 'photo': {
        const name = extraPhotos[added.current % extraPhotos.length] ?? 'coast';
        added.current += 1;
        uploadSample(editor, origin, name).catch(() => setStatus('The sample photo did not load. Try again.'));
        setStatus(`Uploading a photo: ${photos[name].alt}.`);
        break;
      }
    }
  };

  const reset = () => {
    if (!origin) return;
    handle.current?.setContent(start(origin));
    handle.current?.editor?.commands.blur();
    added.current = 0;
    setLayout('collage');
    setLast(null);
    setStatus('The sample post is back.');
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[19rem_minmax(0,1fr)] 2xl:grid-cols-[20rem_minmax(0,1fr)]">
      <aside
        id="try-it"
        aria-labelledby="try-title"
        className="flex scroll-mt-28 flex-col gap-4 border-b border-site-border bg-site-surface p-4 sm:p-5 xl:border-e xl:border-b-0 xl:p-6"
      >
        <div>
          <p className="site-label mb-3">Try it</p>
          <h2 id="try-title" className="font-display text-[1.35rem] leading-tight font-bold tracking-[-0.02em]">
            This is the real editor
          </h2>
          <p className="mt-2 text-[0.95rem] leading-snug text-site-muted">
            Type, paste a link or drop a photo. Or start with one of these.
          </p>
        </div>
        <ul className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-1" aria-label="Things to try">
          <li className="border-site-border-strong col-span-2 hidden items-start gap-3 rounded-[14px] border border-dashed px-3 py-2.5 text-[0.92rem] sm:flex md:col-span-4 xl:col-span-1">
            <MousePointerClick size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-site-accent" />
            <span>
              <span className="font-semibold">Click the post and type.</span>{' '}
              <span className="text-site-muted">Select words to format them.</span>
            </span>
          </li>
          {hints.map((hint) => (
            <li key={hint.id}>
              <button
                type="button"
                onClick={() => run(hint)}
                disabled={!content}
                aria-pressed={last === hint.id}
                className="site-card group flex h-full min-h-11 w-full items-start gap-3 p-2.5 text-left disabled:cursor-wait aria-pressed:border-site-accent xl:p-3"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-site-accent-soft text-site-accent transition-transform duration-500 ease-(--ease-out) group-hover:-rotate-6 xl:size-9">
                  <hint.icon size={17} strokeWidth={2} aria-hidden="true" />
                </span>
                <span className="min-w-0 self-center">
                  <span className="block text-[0.92rem] leading-snug font-semibold">
                    <span className="sm:hidden">{hint.short}</span>
                    <span className="hidden sm:inline">{hint.title}</span>
                  </span>
                  <span className="hidden text-[0.86rem] leading-snug text-site-muted xl:block">{hint.body}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 xl:mt-auto">
          <button
            type="button"
            onClick={reset}
            disabled={!content}
            className="site-btn site-btn-secondary min-h-11 gap-2 px-4 disabled:cursor-wait"
          >
            <RotateCcw size={16} aria-hidden="true" />
            Reset the post
          </button>
          <Link
            href="/playground"
            className="group inline-flex min-h-11 items-center gap-1.5 font-semibold text-site-accent"
          >
            Every control in the Playground
            <ArrowRight
              size={16}
              aria-hidden="true"
              className="transition-transform duration-300 ease-(--ease-out) group-hover:translate-x-0.5"
            />
          </Link>
        </div>
        <p className="sr-only" aria-live="polite">
          {status}
        </p>
      </aside>
      <div className="site-try">
        {content ? (
          <PostCanvas
            ref={handle}
            defaultContent={content}
            preset="social"
            adapters={adapters}
            theme={theme}
            onChange={onChange}
          />
        ) : (
          <div className="site-dots min-h-[inherit]" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
