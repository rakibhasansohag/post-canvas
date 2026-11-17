'use client';

import { useMemo } from 'react';
import { useOrigin } from '@/components/demos/demo-utils';
import { LazyStage, StageFallback } from '@/components/site/lazy-stage';
import { useSiteTheme } from '@/components/site/use-site-theme';
import { photoSource } from '@/lib/sample-content';
import { ArticleEditor } from './article-editor';
import { CommentThread, type Comment } from './comment-thread';
import { SocialComposer } from './social-composer';

export type ExampleName = 'social' | 'article' | 'comment';

const say = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });

const comments: Comment[] = [
  { id: 'a', author: 'Amara Diallo', content: say('Lovely write-up. The tram at seven is the quiet one.') },
  { id: 'b', author: 'Tomas Novak', content: say('Took the 28 last spring. Sit on the left for the river views.') },
];

function Example({ name }: { name: ExampleName }) {
  const theme = useSiteTheme();
  const origin = useOrigin();
  const article = useMemo(() => {
    if (!origin) return null;
    const { uploadKey: _uploadKey, ...cover } = photoSource(origin, 'tram');
    return {
      fields: { title: 'Up the hill on the old tram', cover },
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'The yellow trams still climb the steepest streets in town, rattling past laundry lines and tiled doorways. Ride one end to end before nine, while the seats are still free.',
              },
            ],
          },
        ],
      },
    };
  }, [origin]);

  if (name === 'social') return <SocialComposer theme={theme} />;
  if (name === 'comment') return <CommentThread theme={theme} initial={comments} />;
  return article ? <ArticleEditor theme={theme} initial={article} /> : null;
}

/** Mounts an example when it scrolls into view, with its height reserved. */
export function ExampleStage({ name, minHeight }: { name: ExampleName; minHeight: [string, string?, string?] }) {
  return (
    <LazyStage minHeight={minHeight} fallback={<StageFallback />}>
      <Example name={name} />
    </LazyStage>
  );
}
