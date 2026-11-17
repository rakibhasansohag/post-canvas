'use client';
// What the embed node views share: the frame's keys, the editable state, and which events stay with the node view.
import type { Editor } from '@tiptap/core';
import { Selection, TextSelection } from '@tiptap/pm/state';
import { useEffect, useState } from 'react';
import type { FrameKey } from '../../core/react/media-frame';

/** Whether the editor can be edited, kept current. */
export function useEditable(editor: Editor): boolean {
  const [editable, setEditable] = useState(editor.isEditable);
  useEffect(() => {
    const update = () => setEditable(editor.isEditable);
    editor.on('transaction', update);
    return () => {
      editor.off('transaction', update);
    };
  }, [editor]);
  return editable;
}

/** Removes the node, or moves the cursor to the text before or after it (making a paragraph when there is none). */
export function runFrameKey(editor: Editor, getPos: () => number | undefined, key: FrameKey): void {
  const pos = getPos();
  if (typeof pos !== 'number') return;
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return;
  if (key === 'remove') {
    editor
      .chain()
      .focus()
      .deleteRange({ from: pos, to: pos + node.nodeSize })
      .run();
    return;
  }
  const before = key === 'before';
  const edge = before ? pos : pos + node.nodeSize;
  const $edge = editor.state.doc.resolve(edge);
  const found = Selection.findFrom($edge, before ? -1 : 1, true);
  if (found instanceof TextSelection || (found && !found.empty)) {
    editor.chain().focus().setTextSelection(found.from).run();
    return;
  }
  editor
    .chain()
    .focus()
    .insertContentAt(edge, { type: 'paragraph' })
    .setTextSelection(edge + 1)
    .run();
}

const fieldTags = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A', 'IFRAME']);

/** Events in the node view's own fields and buttons stay with it; a press elsewhere still selects the node. */
export function embedStopEvent({ event }: { event: Event }): boolean {
  const target = event.target instanceof Element ? event.target : null;
  if (event.type.startsWith('drag') || event.type === 'drop') return false;
  const inField = !!target && (fieldTags.has(target.tagName) || !!target.closest('input, textarea, button, a'));
  if (event.type === 'copy' || event.type === 'cut' || event.type === 'paste') return inField;
  return inField;
}
