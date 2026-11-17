'use client';

import { PostCanvas, type JSONContent } from 'post-canvas';
import 'post-canvas/styles.css';
import { useState } from 'react';

const starter: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Start typing. Try Cmd+B or Ctrl+B for bold, and undo with Cmd+Z or Ctrl+Z.' }],
    },
  ],
};

/** The docs site's live editor, rendered from the local `post-canvas` package. */
export function PlaygroundEditor() {
  const [words, setWords] = useState(0);
  return (
    <div className="overflow-hidden rounded-xl border">
      <PostCanvas
        defaultContent={starter}
        onChange={(_json, editor) => setWords(editor.getText().split(/\s+/).filter(Boolean).length)}
      />
      <p className="border-t px-4 py-2 text-sm text-fd-muted-foreground" aria-live="polite">
        {words} words
      </p>
    </div>
  );
}
