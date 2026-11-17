'use client';

import {
  PostCanvas,
  getDocStats,
  hasPendingUploads,
  type JSONContent,
  type PostCanvasTheme,
  type PostFields,
} from 'post-canvas';
import { PostCanvasView, sanitizeDocument } from 'post-canvas/render';
import 'post-canvas/styles.css';
import { useState } from 'react';
// The site's fake adapters: swap in your own upload, mentions, hashtags and link previews.
import { createFakeAdapters } from '@/lib/fake-adapters';

const adapters = createFakeAdapters();

interface Article {
  fields: PostFields;
  content: JSONContent;
}

/** An article editor with a title and a cover. Publish shows the article as a reader would see it. */
export function ArticleEditor({ theme = 'auto', initial }: { theme?: PostCanvasTheme; initial: Article }) {
  const [fields, setFields] = useState<PostFields>(initial.fields);
  const [content, setContent] = useState<JSONContent>(initial.content);
  const [published, setPublished] = useState<Article | null>(null);

  const words = getDocStats(content).words;
  const ready = !!fields.title?.trim() && words > 0 && !hasPendingUploads(content);

  return (
    <div className="flex flex-col gap-4">
      <PostCanvas
        preset="article"
        adapters={adapters}
        theme={theme}
        defaultContent={initial.content}
        fields={fields}
        onFieldsChange={setFields}
        onChange={({ json }) => setContent(json)}
      />
      <div className="flex items-center justify-end gap-3">
        <span className="text-sm opacity-70">{ready ? `${words} words` : 'Add a title to publish'}</span>
        <button
          type="button"
          disabled={!ready}
          onClick={() => setPublished({ fields, content: sanitizeDocument(content).doc })}
          className="h-11 rounded-xl bg-[#2f5fd0] px-5 font-semibold text-white disabled:opacity-40"
        >
          Publish
        </button>
      </div>
      {published && (
        <article className="overflow-hidden rounded-2xl border border-current/15">
          {published.fields.cover && (
            // A plain img keeps the example framework-free; next/image works too.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={published.fields.cover.src}
              srcSet={published.fields.cover.srcset ?? undefined}
              sizes="(min-width: 1024px) 40rem, 100vw"
              width={published.fields.cover.width}
              height={published.fields.cover.height}
              alt={published.fields.cover.alt}
              className="aspect-[2/1] w-full object-cover"
            />
          )}
          <div className="p-5">
            <h2 className="mb-3 text-2xl font-bold">{published.fields.title}</h2>
            <PostCanvasView content={published.content} theme={theme} />
          </div>
        </article>
      )}
    </div>
  );
}
