'use client';

import { GalleryHorizontal, LayoutDashboard, LayoutGrid, Shapes, type LucideIcon } from 'lucide-react';
import { PostCanvas, type FeatureOverrides, type GalleryLayout, type PostCanvasHandle } from 'post-canvas';
import 'post-canvas/styles.css';
import { useMemo, useRef, useState } from 'react';
import { LazyStage, StageFallback } from '@/components/site/lazy-stage';
import { useSiteTheme } from '@/components/site/use-site-theme';
import { createFakeAdapters } from '@/lib/fake-adapters';
import { galleryContent } from '@/lib/sample-content';
import { firstNodeId, useOrigin } from './demo-utils';

const layouts: { id: GalleryLayout; label: string; body: string; icon: LucideIcon }[] = [
  {
    id: 'carousel',
    label: 'Carousel',
    body: 'One photo at a time. Swipe, drag or use the arrows; the dots show where you are.',
    icon: GalleryHorizontal,
  },
  {
    id: 'grid',
    label: 'Grid',
    body: 'Even tiles that fill the width, with the first photo larger when the count is odd.',
    icon: LayoutGrid,
  },
  {
    id: 'masonry',
    label: 'Masonry',
    body: 'Columns that keep every photo at its own shape, so nothing is cropped.',
    icon: LayoutDashboard,
  },
  {
    id: 'collage',
    label: 'Collage',
    body: 'Photos laid on top of the first. Choose Arrange the collage to drag, resize and turn them.',
    icon: Shapes,
  },
];

// Only the gallery and its own menus: no toolbar, slash menu or status bar around it.
const features: FeatureOverrides = {
  toolbar: false,
  statusBar: false,
  slashMenu: false,
  insertButton: false,
  blockHandle: false,
  bubbleMenu: false,
};

/** One gallery, four layouts: the switcher drives the live gallery, and the gallery's own menu drives the switcher. */
export function GalleryDemo() {
  const handle = useRef<PostCanvasHandle>(null);
  const adapters = useMemo(() => createFakeAdapters(), []);
  const origin = useOrigin();
  const theme = useSiteTheme();
  const [layout, setLayout] = useState<GalleryLayout>('carousel');
  // The starting document. Later layout changes go through the editor, so this is read once.
  const start = useMemo(() => (origin ? galleryContent(origin, 'carousel') : null), [origin]);

  const choose = (next: GalleryLayout) => {
    setLayout(next);
    const editor = handle.current?.editor;
    if (!editor) return;
    const id = firstNodeId(editor, 'gallery');
    if (id) editor.commands.setGalleryLayout(next, id);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-8">
      <div
        role="radiogroup"
        aria-label="Gallery layout"
        className="grid content-start gap-2.5 sm:grid-cols-2 lg:grid-cols-1"
      >
        {layouts.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={layout === item.id}
            onClick={() => choose(item.id)}
            className="site-card group flex items-start gap-4 p-4 text-left aria-checked:border-site-accent aria-checked:shadow-[0_0_0_1px_var(--site-accent)]"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-site-bg text-site-muted ring-1 ring-site-border transition-colors duration-300 group-aria-checked:bg-site-accent group-aria-checked:text-white group-aria-checked:ring-site-accent dark:group-aria-checked:text-[#0e1320]">
              <item.icon size={19} strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold">{item.label}</span>
              <span className="mt-1 block text-[0.94rem] leading-snug text-site-muted">{item.body}</span>
            </span>
          </button>
        ))}
      </div>
      <LazyStage
        minHeight={['17rem', '26rem', '30rem']}
        className="site-stage site-dots self-start p-2 sm:p-4"
        fallback={<StageFallback />}
      >
        {start && (
          <div className="overflow-hidden rounded-xl">
            <PostCanvas
              ref={handle}
              defaultContent={start}
              preset="full"
              features={features}
              adapters={adapters}
              theme={theme}
              onChange={({ json }) => {
                const gallery = json.content?.find((block) => block.type === 'gallery');
                const next = gallery?.attrs?.layout as GalleryLayout | undefined;
                if (next && next !== layout) setLayout(next);
              }}
            />
          </div>
        )}
      </LazyStage>
    </div>
  );
}
