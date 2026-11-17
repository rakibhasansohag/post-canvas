'use client';

import { PostCanvas } from 'post-canvas';
import 'post-canvas/styles.css';
import { useMemo } from 'react';
import { useSiteTheme } from '@/components/site/use-site-theme';
import { createFakeAdapters } from '@/lib/fake-adapters';
import { createSampleContent } from '@/lib/sample-content';
import { useOrigin } from './demo-utils';

/** The home page's live editor: the social preset with a travel post and a collage. */
export function HeroEditor() {
  const adapters = useMemo(() => createFakeAdapters(), []);
  const origin = useOrigin();
  const theme = useSiteTheme();
  const content = useMemo(
    () => (origin ? createSampleContent(origin, { closing: false, layout: 'collage' }) : null),
    [origin],
  );

  if (!content) return <div className="site-dots min-h-[inherit]" aria-hidden="true" />;
  return <PostCanvas defaultContent={content} preset="social" adapters={adapters} theme={theme} />;
}
