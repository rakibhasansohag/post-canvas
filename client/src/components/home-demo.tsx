'use client';

import { PostCanvas } from 'post-canvas';
import 'post-canvas/styles.css';
import { useMemo, useSyncExternalStore } from 'react';
import { createFakeAdapters } from '@/lib/fake-adapters';
import { createSampleContent } from '@/lib/sample-content';

const subscribe = () => () => undefined;
const getOrigin = () => window.location.origin;
const getServerOrigin = () => null;

/** The home page's live editor: the social preset, filled with a sample post. */
export function HomeDemo() {
  const adapters = useMemo(() => createFakeAdapters(), []);
  // The sample's photo URLs must be absolute, so the editor starts once the page knows its own origin.
  const origin = useSyncExternalStore(subscribe, getOrigin, getServerOrigin);
  const content = useMemo(() => (origin ? createSampleContent(origin, { closing: false }) : null), [origin]);

  return (
    <div className="min-h-[28rem] overflow-hidden rounded-xl border bg-fd-card">
      {content ? (
        <PostCanvas defaultContent={content} preset="social" adapters={adapters} theme="auto" />
      ) : (
        <p className="p-4 text-sm text-fd-muted-foreground">Loading the editor.</p>
      )}
    </div>
  );
}
