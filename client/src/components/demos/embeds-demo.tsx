'use client';

import { Link2, MapPin, MessageSquareQuote, Music, Newspaper, Play, Video, type LucideIcon } from 'lucide-react';
import { PostCanvas, type FeatureOverrides, type JSONContent, type PostCanvasHandle } from 'post-canvas';
import 'post-canvas/styles.css';
import { useId, useMemo, useRef, useState } from 'react';
import { LazyStage, StageFallback } from '@/components/site/lazy-stage';
import { useSiteTheme } from '@/components/site/use-site-theme';
import { createFakeAdapters } from '@/lib/fake-adapters';
import { caretAtEmptyEnd, simulatePaste } from './demo-utils';

const samples: { label: string; kind: string; url: string; icon: LucideIcon }[] = [
  { label: 'YouTube', kind: 'Video', url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', icon: Play },
  { label: 'Vimeo', kind: 'Video', url: 'https://vimeo.com/76979871', icon: Video },
  { label: 'X post', kind: 'Social', url: 'https://x.com/jack/status/20', icon: MessageSquareQuote },
  { label: 'SoundCloud', kind: 'Audio', url: 'https://soundcloud.com/forss/flickermood', icon: Music },
  { label: 'Google Maps', kind: 'Map', url: 'https://www.google.com/maps/place/Eden+Project', icon: MapPin },
  { label: 'Any article', kind: 'Link card', url: 'https://tiptap.dev/docs/editor/getting-started/overview', icon: Newspaper },
];

const features: FeatureOverrides = { statusBar: false, insertButton: false };

// Starts with one player, so the stage shows what a pasted link becomes.
const start: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'video',
      attrs: {
        provider: 'youtube',
        videoId: 'aqz-KE-bpKQ',
        hash: null,
        vertical: false,
        start: null,
        title: 'Big Buck Bunny',
        description: '',
        thumbnailUrl: null,
      },
    },
    { type: 'paragraph' },
  ],
};

/** Pick a link, or paste your own: the editor turns it into a player, an embed or a link card. */
export function EmbedsDemo() {
  const handle = useRef<PostCanvasHandle>(null);
  const adapters = useMemo(() => createFakeAdapters(), []);
  const theme = useSiteTheme();
  const [own, setOwn] = useState('');
  const inputId = useId();

  const paste = (url: string) => {
    const editor = handle.current?.editor;
    if (!editor) return;
    caretAtEmptyEnd(editor);
    simulatePaste(editor, { text: url });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-8">
      <div className="flex flex-col gap-6">
        <ul className="grid grid-cols-2 gap-2.5" aria-label="Sample links">
          {samples.map((sample) => (
            <li key={sample.url}>
              <button
                type="button"
                onClick={() => paste(sample.url)}
                className="site-card group flex w-full items-center gap-3 p-3 text-left"
                aria-label={`Paste a ${sample.label} link`}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-site-accent-soft text-site-accent transition-transform duration-500 ease-(--ease-out) group-hover:scale-110">
                  <sample.icon size={17} strokeWidth={2} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{sample.label}</span>
                  <span className="block font-mono text-[0.72rem] tracking-[0.08em] text-site-muted uppercase">
                    {sample.kind}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!own.trim()) return;
            paste(own.trim());
            setOwn('');
          }}
        >
          <label htmlFor={inputId} className="font-semibold">
            Or paste your own link
          </label>
          <div className="flex gap-2">
            <span className="relative min-w-0 flex-1">
              <Link2
                size={17}
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-site-muted"
              />
              <input
                id={inputId}
                type="url"
                inputMode="url"
                placeholder="https://"
                value={own}
                onChange={(event) => setOwn(event.target.value)}
                className="h-12 w-full rounded-[14px] border border-site-border bg-site-bg ps-10 pe-3 transition-colors duration-200 outline-none focus:border-site-accent"
              />
            </span>
            <button type="submit" className="site-btn site-btn-primary px-5">
              Paste
            </button>
          </div>
          <p className="text-[0.9rem] text-site-muted">
            YouTube, Vimeo, X, Instagram, TikTok, Spotify, SoundCloud, CodePen, Loom, Figma and Google Maps become
            players. Other links become cards. Players load only after a click.
          </p>
        </form>
      </div>
      <LazyStage minHeight={['20rem', '28rem']} className="site-stage self-start" fallback={<StageFallback />}>
        <PostCanvas
          ref={handle}
          defaultContent={start}
          preset="full"
          features={features}
          classify={null}
          adapters={adapters}
          theme={theme}
        />
      </LazyStage>
    </div>
  );
}
