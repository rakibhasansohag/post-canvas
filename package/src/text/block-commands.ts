// Moves, duplicates, deletes and converts top-level blocks. The block handle, its menu and keyboard shortcuts use these;
// they work for text and media blocks alike.
import type { Editor } from '@tiptap/core';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';

/** What a text block can turn into. */
export type TurnIntoTarget =
  | 'paragraph'
  | 'heading-1'
  | 'heading-2'
  | 'heading-3'
  | 'heading-4'
  | 'bulletList'
  | 'orderedList'
  | 'taskList'
  | 'blockquote'
  | 'codeBlock';

/** The top-level block around a document position: its start and the node. */
export function blockAt(editor: Editor, pos: number): { pos: number; size: number; index: number } | null {
  const { doc } = editor.state;
  if (pos < 0 || pos > doc.content.size) return null;
  const $pos = doc.resolve(pos);
  const index = $pos.depth === 0 ? $pos.index(0) : $pos.index(0);
  if (index >= doc.childCount) return null;
  const start = $pos.depth === 0 ? $pos.pos : $pos.before(1);
  const node = doc.child(index);
  return { pos: start, size: node.nodeSize, index };
}

/** True when the block at `pos` has a neighbour in that direction. */
export function canMoveBlock(editor: Editor, pos: number, by: -1 | 1): boolean {
  const block = blockAt(editor, pos);
  if (!block) return false;
  const next = block.index + by;
  return next >= 0 && next < editor.state.doc.childCount;
}

/** Swaps the block at `pos` with its neighbour above (`-1`) or below (`1`). Keeps the caret in it. */
export function moveBlock(editor: Editor, pos: number, by: -1 | 1): boolean {
  const block = blockAt(editor, pos);
  if (!block || !canMoveBlock(editor, pos, by)) return false;
  const { state } = editor;
  const node = state.doc.child(block.index);
  const neighbour = state.doc.child(block.index + by);
  const offsetInBlock = Math.max(0, state.selection.from - block.pos);
  const tr = state.tr.delete(block.pos, block.pos + block.size);
  const target = by === -1 ? block.pos - neighbour.nodeSize : block.pos + neighbour.nodeSize;
  tr.insert(target, node);
  const caret = Math.min(target + offsetInBlock, target + node.nodeSize - 1);
  tr.setSelection(
    node.isTextblock || node.firstChild?.isTextblock
      ? TextSelection.near(tr.doc.resolve(Math.max(target + 1, caret)))
      : NodeSelection.create(tr.doc, target),
  );
  editor.view.dispatch(tr.scrollIntoView());
  return true;
}

/** Puts a copy of the block at `pos` right after it. Media copies get new ids from UniqueID. */
export function duplicateBlock(editor: Editor, pos: number): boolean {
  const block = blockAt(editor, pos);
  if (!block) return false;
  const node = editor.state.doc.child(block.index);
  const copy = node.type.create(node.type.spec.attrs && 'id' in node.attrs ? { ...node.attrs, id: null } : node.attrs, node.content, node.marks);
  editor.view.dispatch(editor.state.tr.insert(block.pos + block.size, copy).scrollIntoView());
  return true;
}

/** Removes the block at `pos`. The document always keeps one paragraph. */
export function deleteBlock(editor: Editor, pos: number): boolean {
  const block = blockAt(editor, pos);
  if (!block) return false;
  const { state } = editor;
  const tr = state.tr.delete(block.pos, block.pos + block.size);
  if (tr.doc.childCount === 0) tr.insert(0, state.schema.nodes.paragraph!.create());
  tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(block.pos, tr.doc.content.size))));
  editor.view.dispatch(tr.scrollIntoView());
  return true;
}

/** True for blocks "turn into" applies to: paragraphs, headings, lists, quotes and code blocks. */
export function isTextBlockType(name: string): boolean {
  return ['paragraph', 'heading', 'bulletList', 'orderedList', 'taskList', 'blockquote', 'codeBlock'].includes(name);
}

/** The "turn into" target that describes the block at `pos`, if any. */
export function currentTurnInto(editor: Editor, pos: number): TurnIntoTarget | null {
  const block = blockAt(editor, pos);
  if (!block) return null;
  const node = editor.state.doc.child(block.index);
  if (node.type.name === 'heading') return `heading-${node.attrs.level as 1 | 2 | 3 | 4}`;
  return isTextBlockType(node.type.name) ? (node.type.name as TurnIntoTarget) : null;
}

/** Turns the text block at `pos` (or the selection when `pos` is left out) into another kind of block. */
export function turnInto(editor: Editor, target: TurnIntoTarget, pos?: number): boolean {
  let chain = editor.chain().focus();
  if (pos !== undefined) {
    const block = blockAt(editor, pos);
    if (!block) return false;
    const node = editor.state.doc.child(block.index);
    if (!isTextBlockType(node.type.name)) return false;
    // Put the caret inside the block so the commands apply to it.
    const inside = node.isTextblock ? block.pos + 1 : block.pos + 2;
    chain = chain.setTextSelection(Math.min(inside, block.pos + block.size - 1));
  }
  // Leave lists and quotes first, so a list item can become a heading and so on.
  chain = chain.clearNodes();
  switch (target) {
    case 'paragraph':
      return chain.setParagraph().run();
    case 'heading-1':
    case 'heading-2':
    case 'heading-3':
    case 'heading-4':
      return chain.setHeading({ level: Number(target.slice(-1)) as 1 | 2 | 3 | 4 }).run();
    case 'bulletList':
      return chain.toggleBulletList().run();
    case 'orderedList':
      return chain.toggleOrderedList().run();
    case 'taskList':
      return chain.toggleTaskList().run();
    case 'blockquote':
      return chain.toggleBlockquote().run();
    case 'codeBlock':
      return chain.toggleCodeBlock().run();
  }
}

/** The turn-into targets a schema supports. */
export function turnIntoTargets(editor: Editor): TurnIntoTarget[] {
  const nodes = editor.schema.nodes;
  const targets: TurnIntoTarget[] = ['paragraph'];
  const heading = editor.extensionManager.extensions.find((extension) => extension.name === 'heading');
  const levels = (heading?.options as { levels?: number[] } | undefined)?.levels ?? [];
  for (const level of levels) targets.push(`heading-${level as 1 | 2 | 3 | 4}`);
  if (nodes.bulletList) targets.push('bulletList');
  if (nodes.orderedList) targets.push('orderedList');
  if (nodes.taskList) targets.push('taskList');
  if (nodes.blockquote) targets.push('blockquote');
  if (nodes.codeBlock) targets.push('codeBlock');
  return targets;
}
