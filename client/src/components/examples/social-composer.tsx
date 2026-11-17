'use client';

import {
  PostCanvas,
  getDocStats,
  hasPendingUploads,
  type JSONContent,
  type PostCanvasHandle,
  type PostCanvasTheme,
} from 'post-canvas';
import { PostCanvasView, sanitizeDocument } from 'post-canvas/render';
import 'post-canvas/styles.css';
import { useRef, useState } from 'react';
// The site's fake adapters: swap in your own upload, mentions, hashtags and link previews.
import { createFakeAdapters } from '@/lib/fake-adapters';

const adapters = createFakeAdapters();

interface Post {
  id: number;
  content: JSONContent;
}

/** A social composer: write, add photos or paste a link, then post to the feed below. */
export function SocialComposer({ theme = 'auto' }: { theme?: PostCanvasTheme }) {
  const editor = useRef<PostCanvasHandle>(null);
  const [draft, setDraft] = useState<JSONContent | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);

  const stats = draft ? getDocStats(draft) : null;
  const hasContent = !!stats && (stats.words > 0 || stats.mediaBlocks > 0);
  const uploading = !!draft && hasPendingUploads(draft);

  const post = () => {
    if (!draft || !hasContent || uploading) return;
    // Your server does this step: sanitize what the client sent, then store it.
    const { doc } = sanitizeDocument(draft);
    setPosts((list) => [{ id: Date.now(), content: doc }, ...list]);
    editor.current?.clear();
  };

  return (
    <div className="flex flex-col gap-4">
      <PostCanvas
        ref={editor}
        preset="social"
        adapters={adapters}
        theme={theme}
        placeholder="What's new? Add photos, or paste a link."
        onChange={({ json }) => setDraft(json)}
        slots={{
          footer: (
            <div className="flex items-center justify-end gap-3 px-4 pb-4">
              {uploading && <span className="text-sm opacity-70">Waiting for uploads</span>}
              <button
                type="button"
                onClick={post}
                disabled={!hasContent || uploading}
                className="h-11 rounded-xl bg-[#2f5fd0] px-5 font-semibold text-white disabled:opacity-40"
              >
                Post
              </button>
            </div>
          ),
        }}
      />
      {posts.map((item) => (
        <article key={item.id} className="rounded-2xl border border-current/15 p-4">
          <p className="mb-2 text-sm font-semibold">You · just now</p>
          <PostCanvasView content={item.content} theme={theme} />
        </article>
      ))}
    </div>
  );
}
