'use client';

// TEMPORARY: a fixed frame for capturing the feature screenshots. Delete with app/docs/shot-studio.
import { PostCanvas, type GalleryLayout, type PresetName } from 'post-canvas';
import 'post-canvas/styles.css';
import { useEffect, useMemo, useState } from 'react';
import { useSiteTheme } from '@/components/site/use-site-theme';
import { createFakeAdapters } from '@/lib/fake-adapters';
import {
  articleSample,
  createSampleContent,
  galleryContent,
  outputContent,
  richTextContent,
  socialSample,
} from '@/lib/sample-content';

export function ShotStudio() {
  const adapters = useMemo(() => createFakeAdapters(), []);
  const theme = useSiteTheme();
  const [origin, setOrigin] = useState<string | null>(null);
  const [params, setParams] = useState<URLSearchParams | null>(null);
  useEffect(() => {
    setOrigin(window.location.origin);
    setParams(new URLSearchParams(window.location.search));
  }, []);
  if (!origin || !params || theme === 'auto') return null;
  const preset = (params.get('preset') ?? 'full') as PresetName;
  const width = Number(params.get('w') ?? 880);
  const sample = params.get('c') ?? 'collage';
  const article = articleSample(origin);
  const content =
    sample === 'rich'
      ? richTextContent()
      : sample === 'social'
        ? socialSample(origin)
        : sample === 'article'
          ? article.content
          : sample === 'output'
            ? outputContent(origin)
            : sample.startsWith('gallery-')
              ? {
                  type: 'doc',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'Two days on the coast path, from the cliffs to the harbour.' }],
                    },
                    ...(galleryContent(origin, sample.slice(8) as GalleryLayout).content ?? []),
                    { type: 'paragraph' },
                  ],
                }
              : sample === 'empty'
                ? { type: 'doc', content: [{ type: 'paragraph' }] }
                : createSampleContent(origin, { closing: false, layout: (sample as GalleryLayout) || 'collage' });
  return (
    <div id="shot" style={{ width, padding: 0 }}>
      <PostCanvas
        defaultContent={content}
        defaultFields={preset === 'article' ? article.fields : undefined}
        preset={preset}
        adapters={adapters}
        theme={theme}
      />
    </div>
  );
}
