'use client';

import type { PostCanvasHandle } from 'post-canvas';
import { useSyncExternalStore } from 'react';

/** The Tiptap editor behind a `PostCanvas`. */
export type Editor = NonNullable<PostCanvasHandle['editor']>;

const subscribe = () => () => undefined;
const getOrigin = () => window.location.origin;
const getServerOrigin = () => null;

/**
 * The page's origin, or `null` during the server render. Sample photo URLs must be absolute, so a demo starts its
 * editor once this is known.
 */
export function useOrigin(): string | null {
  return useSyncExternalStore(subscribe, getOrigin, getServerOrigin);
}

/** Puts the caret in an empty paragraph at the end of the document, adding one if needed. */
export function caretAtEmptyEnd(editor: Editor): void {
  const last = editor.state.doc.lastChild;
  if (!last || last.type.name !== 'paragraph' || last.content.size > 0) {
    editor.commands.insertContentAt(editor.state.doc.content.size, { type: 'paragraph' });
  }
  editor.commands.focus('end');
}

/**
 * Runs the editor's own paste logic, as if the reader pasted `text` or `html`. The embed rules turn a pasted link into
 * a player or a card, and the paste cleanup tidies pasted HTML, exactly as with a real paste.
 */
export function simulatePaste(editor: Editor, content: { text?: string; html?: string }): void {
  const data = new DataTransfer();
  if (content.text) data.setData('text/plain', content.text);
  if (content.html) data.setData('text/html', content.html);
  // A real ClipboardEvent can't carry data in every browser, so the paste handlers get an object with the same shape.
  const event = {
    type: 'paste',
    clipboardData: data,
    preventDefault() {},
    stopPropagation() {},
  } as unknown as ClipboardEvent;
  if (content.html) editor.view.pasteHTML(content.html, event);
  else editor.view.pasteText(content.text ?? '', event);
}

/** The id of the first node of `type` in the document. */
export function firstNodeId(editor: Editor, type: string): string | null {
  let id: string | null = null;
  editor.state.doc.descendants((node) => {
    if (id) return false;
    if (node.type.name === type && typeof node.attrs.id === 'string') id = node.attrs.id;
    return !id;
  });
  return id;
}

/** Finds `text` in the document and selects it. Returns whether it was found. */
export function selectText(editor: Editor, text: string): boolean {
  let range: { from: number; to: number } | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (range) return false;
    if (node.isText && node.text) {
      const index = node.text.indexOf(text);
      if (index >= 0) range = { from: pos + index, to: pos + index + text.length };
    }
    return !range;
  });
  if (!range) return false;
  editor.chain().focus().setTextSelection(range).run();
  return true;
}
