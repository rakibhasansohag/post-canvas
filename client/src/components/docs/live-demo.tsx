'use client';

import { PostCanvas, type GalleryLayout, type JSONContent, type PostFields, type PresetName } from 'post-canvas';
import 'post-canvas/styles.css';
import { useMemo } from 'react';
import { useOrigin } from '@/components/demos/demo-utils';
import { LazyStage, StageFallback } from '@/components/site/lazy-stage';
import { useSiteTheme } from '@/components/site/use-site-theme';
import { createFakeAdapters } from '@/lib/fake-adapters';
import {
  articleSample,
  createSampleContent,
  galleryContent,
  richTextContent,
  socialSample,
} from '@/lib/sample-content';
import './docs.css';

export type LiveDemoSample =
  'collage' | 'rich-text' | 'embeds' | 'social' | 'article' | 'comment' | `gallery-${GalleryLayout}`;

const text = (value: string): JSONContent => ({ type: 'text', text: value });
const paragraph = (value?: string): JSONContent =>
  value ? { type: 'paragraph', content: [text(value)] } : { type: 'paragraph' };

const embeds: JSONContent = {
  type: 'doc',
  content: [
    paragraph('A YouTube link becomes a player that loads after a click. Paste another link below to try it.'),
    {
      type: 'video',
      attrs: {
        provider: 'youtube',
        videoId: 'aqz-KE-bpKQ',
        hash: null,
        vertical: false,
        start: null,
        title: 'Big Buck Bunny',
        description: 'The Blender Foundation’s open movie from 2008.',
        thumbnailUrl: null,
      },
    },
    paragraph(),
  ],
};

function contentFor(sample: LiveDemoSample, origin: string): { content: JSONContent; fields?: PostFields } {
  if (sample.startsWith('gallery-')) {
    const gallery = galleryContent(origin, sample.slice('gallery-'.length) as GalleryLayout);
    return {
      content: {
        type: 'doc',
        content: [
          paragraph('Two days on the coast path, from the cliffs to the harbour.'),
          ...(gallery.content ?? []),
          paragraph(),
        ],
      },
    };
  }
  switch (sample) {
    case 'rich-text':
      return { content: richTextContent() };
    case 'embeds':
      return { content: embeds };
    case 'social':
      return { content: socialSample(origin) };
    case 'article': {
      const article = articleSample(origin);
      return { content: article.content, fields: article.fields };
    }
    case 'comment':
      return { content: { type: 'doc', content: [paragraph('Going on Saturday. Is the gallery stair open?')] } };
    default:
      return { content: createSampleContent(origin, { closing: false, layout: 'collage' }) };
  }
}

/**
 * A live editor in a docs page, mounted when it scrolls near. Uploads, mentions and link previews use the site's fake
 * adapters, so nothing leaves the browser.
 *
 * `<LiveDemo sample="gallery-collage" />`, `<LiveDemo preset="article" sample="article" />`
 */
export function LiveDemo({
  sample = 'collage',
  preset = 'full',
  minHeight = '24rem',
}: {
  sample?: LiveDemoSample;
  preset?: PresetName;
  /** The space reserved before the editor mounts, so the page doesn't move. */
  minHeight?: string;
}) {
  const adapters = useMemo(() => createFakeAdapters(), []);
  const origin = useOrigin();
  const theme = useSiteTheme();
  const start = useMemo(() => (origin ? contentFor(sample, origin) : null), [origin, sample]);

  return (
    <div className="docs-live not-prose">
      <LazyStage minHeight={[minHeight]} className="site-stage overflow-hidden" fallback={<StageFallback />}>
        {start && (
          <PostCanvas
            defaultContent={start.content}
            defaultFields={start.fields}
            preset={preset}
            adapters={adapters}
            theme={theme}
          />
        )}
      </LazyStage>
      <p className="docs-live__note">
        Live editor. Uploads, mentions and link previews use demo adapters, and nothing you add leaves your browser.
      </p>
    </div>
  );
}
