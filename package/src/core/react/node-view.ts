'use client';
// What the media and embed node views share: following the editor's editable state, the frame's keys, and which
// events ProseMirror should leave to the node view.
import type { Editor } from '@tiptap/core';
import { NodeSelection, Selection } from '@tiptap/pm/state';
import { useEffect, useState } from 'react';
import type { FrameKey } from './media-frame';

/** Whether the editor can be edited, kept current. */
export function useEditable(editor: Editor): boolean {
  const [editable, setEditable] = useState(editor.isEditable);
  useEffect(() => {
    const update = () => setEditable(editor.isEditable);
    editor.on('update', update);
    editor.on('transaction', update);
    return () => {
      editor.off('update', update);
      editor.off('transaction', update);
    };
  }, [editor]);
  return editable;
}

/**
 * What a key on a selected frame does: remove the node, or move to the text before or after it. With no text there,
 * Enter and the arrows make a new paragraph, so writing can always go on.
 */
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
  const neighbour = before ? $edge.nodeBefore : $edge.nodeAfter;
  if (neighbour?.isTextblock) {
    editor
      .chain()
      .focus()
      .setTextSelection(before ? edge - 1 : edge + 1)
      .run();
    return;
  }
  if (neighbour?.isAtom && NodeSelection.isSelectable(neighbour)) {
    editor
      .chain()
      .focus()
      .setNodeSelection(before ? edge - neighbour.nodeSize : edge)
      .run();
    return;
  }
  if (neighbour) {
    const found = Selection.findFrom($edge, before ? -1 : 1, true);
    if (found) {
      editor.chain().focus().setTextSelection(found.from).run();
      return;
    }
  }
  editor
    .chain()
    .focus()
    .insertContentAt(edge, { type: 'paragraph' })
    .setTextSelection(edge + 1)
    .run();
}

const fieldTags = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON']);

/** True when a drag carries files from outside the page. */
export function isFileDrag(event: Event): boolean {
  const transfer = (event as DragEvent).dataTransfer;
  return !!transfer && Array.from(transfer.types).includes('Files');
}

/**
 * Which events ProseMirror leaves to a media node view. Typing, clicks and keys in its fields and buttons, and gestures
 * in a `[data-pc-stop]` area (the collage, the photo manager), are the node view's. A press elsewhere still selects the
 * node, copy and cut still copy it, and other drags still move content. `ownFileDrops` keeps dropped files for the node
 * view (a gallery adds them).
 */
export function mediaStopEvent(event: Event, ownFileDrops = false): boolean {
  const target = event.target instanceof Element ? event.target : null;
  const type = event.type;
  if (type.startsWith('drag') || type === 'drop') return ownFileDrops && isFileDrag(event);
  const inField = !!target && (fieldTags.has(target.tagName) || (target as HTMLElement).isContentEditable);
  if (type === 'copy' || type === 'cut' || type === 'paste') return inField;
  if (inField || target?.closest('[data-pc-stop]')) return true;
  return !(type === 'mousedown');
}

const embedFieldTags = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A', 'IFRAME']);

/** Events in the node view's own fields and buttons stay with it; a press elsewhere still selects the node. */
export function embedStopEvent({ event }: { event: Event }): boolean {
  const target = event.target instanceof Element ? event.target : null;
  if (event.type.startsWith('drag') || event.type === 'drop') return false;
  const inField = !!target && (embedFieldTags.has(target.tagName) || !!target.closest('input, textarea, button, a'));
  if (event.type === 'copy' || event.type === 'cut' || event.type === 'paste') return inField;
  return inField;
}
