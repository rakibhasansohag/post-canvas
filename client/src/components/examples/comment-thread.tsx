'use client';

import { PostCanvas, getDocStats, type JSONContent, type PostCanvasHandle, type PostCanvasTheme } from 'post-canvas';
import { PostCanvasView, sanitizeDocument } from 'post-canvas/render';
import 'post-canvas/styles.css';
import { useRef, useState } from 'react';
// The site's fake adapters: swap in your own mention search.
import { createFakeAdapters } from '@/lib/fake-adapters';

const adapters = createFakeAdapters();

export interface Comment {
  id: string;
  author: string;
  content: JSONContent;
}

/** A comment thread: Enter posts, Shift and Enter adds a line, @ mentions people. */
export function CommentThread({ theme = 'auto', initial }: { theme?: PostCanvasTheme; initial: Comment[] }) {
  const editor = useRef<PostCanvasHandle>(null);
  const [comments, setComments] = useState(initial);

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-4" aria-label="Comments">
        {comments.map((comment) => (
          <li key={comment.id} className="rounded-2xl border border-current/15 p-4">
            <p className="mb-1 text-sm font-semibold">{comment.author}</p>
            <PostCanvasView content={comment.content} theme={theme} />
          </li>
        ))}
      </ol>
      <PostCanvas
        ref={editor}
        preset="comment"
        adapters={adapters}
        theme={theme}
        submitOnEnter
        placeholder="Add a comment. Type @ to mention someone."
        onSubmit={({ json }) => {
          if (getDocStats(json).words === 0) return;
          const { doc } = sanitizeDocument(json); // On your server, before you store it.
          setComments((list) => [...list, { id: crypto.randomUUID(), author: 'You', content: doc }]);
          editor.current?.clear();
        }}
      />
    </div>
  );
}
