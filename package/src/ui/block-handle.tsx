'use client';
// The block handle beside the hovered block (or the caret's block): drag it to move the block, or click it for a menu
// with move up, move down, duplicate, delete and "turn into". Mouse drags start after a few pixels; on touch, a short
// rest (long press) starts the drag, so a swipe still scrolls. A drop is one transaction, so one undo step.
import type { Editor } from '@tiptap/core';
import { NodeSelection, Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { useEditorState } from '@tiptap/react';
import { ArrowDown, ArrowUp, Copy, GripVertical, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { Popover } from '../core/react/popover';
import { usePointerDrag } from '../core/react/use-pointer-drag';
import {
  blockAt,
  canMoveBlock,
  currentTurnInto,
  deleteBlock,
  duplicateBlock,
  isTextBlockType,
  moveBlock,
} from '../text/block-commands';
import { shortcut, turnIntoEntries } from './controls';
import { MenuItems, type MenuEntry } from './menu';
import { useEditorUi } from './ui-context';

/** Where the handle stands: a top-level block and its first line, in the canvas's coordinates. */
interface Spot {
  pos: number;
  top: number;
  left: number;
}

const edge = 56;
const maxScrollStep = 18;

/** The top-level block under a viewport y, or `null`. */
function blockAtY(editor: Editor, y: number): number | null {
  const { view } = editor;
  const box = view.dom.getBoundingClientRect();
  const left = box.left + parseFloat(getComputedStyle(view.dom).paddingLeft) + 4;
  const found = view.posAtCoords({ left, top: y });
  if (!found) return null;
  const $pos = editor.state.doc.resolve(found.inside >= 0 ? found.inside : found.pos);
  if ($pos.depth === 0) {
    const index = $pos.index(0);
    if (index >= editor.state.doc.childCount) return null;
    let pos = 0;
    for (let i = 0; i < index; i++) pos += editor.state.doc.child(i).nodeSize;
    return pos;
  }
  return $pos.before(1);
}

function spotFor(editor: Editor, pos: number, canvas: HTMLElement, narrow: boolean): Spot | null {
  const dom = editor.view.nodeDOM(pos);
  if (!(dom instanceof HTMLElement)) return null;
  const box = dom.getBoundingClientRect();
  const area = canvas.getBoundingClientRect();
  const style = getComputedStyle(dom);
  const line = parseFloat(style.lineHeight) || 24;
  const firstLine = Math.min(box.height, line);
  const top = box.top - area.top + firstLine / 2;
  const left = narrow ? area.width - 38 : box.left - area.left - 30;
  return { pos, top, left };
}

/** The top-level block index whose upper half is below `y`, for dropping: 0 to childCount. */
function dropIndexAt(editor: Editor, y: number): { index: number; top: number } {
  const { doc } = editor.state;
  let offset = 0;
  for (let index = 0; index < doc.childCount; index++) {
    const dom = editor.view.nodeDOM(offset);
    if (dom instanceof HTMLElement) {
      const box = dom.getBoundingClientRect();
      if (y < box.top + box.height / 2) return { index, top: box.top - 4 };
    }
    offset += doc.child(index).nodeSize;
  }
  const last = editor.view.dom.lastElementChild?.getBoundingClientRect();
  return { index: doc.childCount, top: (last ? last.bottom : editor.view.dom.getBoundingClientRect().bottom) + 4 };
}

/**
 * Moves the block at `from` to before the block at `index` (or to the end), in one transaction. The node keeps its
 * attributes, ids included, and stays selected (or keeps the caret) afterwards.
 */
export function moveBlockTo(editor: Editor, from: number, index: number): boolean {
  const block = blockAt(editor, from);
  if (!block || index === block.index || index === block.index + 1) return false;
  const { state } = editor;
  const node = state.doc.child(block.index);
  let target = 0;
  for (let i = 0; i < index; i++) target += state.doc.child(i).nodeSize;
  const tr = state.tr.delete(block.pos, block.pos + block.size);
  const at = target > block.pos ? target - block.size : target;
  tr.insert(at, node);
  tr.setSelection(
    node.isTextblock || node.firstChild?.isTextblock
      ? TextSelection.near(tr.doc.resolve(at + 1))
      : NodeSelection.create(tr.doc, at),
  );
  editor.view.dispatch(tr.scrollIntoView());
  return true;
}

const draggingKey = new PluginKey<number | null>('postCanvasBlockDragging');

/** Dims the block being dragged with a node decoration, so ProseMirror's own redraws keep it. */
function draggingPlugin() {
  return new Plugin<number | null>({
    key: draggingKey,
    state: {
      init: () => null,
      apply: (tr, value) => {
        const meta = tr.getMeta(draggingKey) as number | null | undefined;
        if (meta !== undefined) return meta;
        return value === null ? null : tr.mapping.map(value);
      },
    },
    props: {
      decorations: (state) => {
        const pos = draggingKey.getState(state) ?? null;
        const node = pos === null || pos < 0 || pos >= state.doc.content.size ? null : state.doc.nodeAt(pos);
        if (pos === null || !node) return null;
        return DecorationSet.create(state.doc, [
          Decoration.node(pos, pos + node.nodeSize, { class: 'pc-block-dragging' }),
        ]);
      },
    },
  });
}

/** `pos` when it is still the start of a block in the current document, else `null`. */
function blockStartOrNull(editor: Editor, pos: number | null): number | null {
  const { doc } = editor.state;
  if (pos === null || !Number.isInteger(pos) || pos < 0 || pos >= doc.content.size) return null;
  const node = doc.nodeAt(pos);
  return node && node.isBlock ? pos : null;
}

function markDragging(editor: Editor, pos: number | null): void {
  if (!editor.isDestroyed)
    editor.view.dispatch(editor.state.tr.setMeta(draggingKey, pos).setMeta('addToHistory', false));
}

/** The nearest scrolling ancestor, or the page. */
function scrollParent(element: HTMLElement): HTMLElement | null {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node;
  }
  return null;
}

/** The handle beside the hovered or caret block. Render it inside the canvas element (`position: relative`). */
export function BlockHandle({ canvas, narrow }: { canvas: RefObject<HTMLDivElement | null>; narrow: boolean }) {
  const { editor, t } = useEditorUi();
  const [hover, setHover] = useState<Spot | null>(null);
  const [caretSpot, setCaretSpot] = useState<Spot | null>(null);
  const [frozen, setFrozen] = useState<Spot | null>(null);
  const [menu, setMenu] = useState(false);
  const [grip, setGrip] = useState<HTMLButtonElement | null>(null);
  const [drop, setDrop] = useState<number | null>(null);
  const drag = useRef<{ from: number; index: number | null; y: number; frame: number } | null>(null);

  useEffect(() => {
    // Drop any earlier copy first (a hot reload or a remount can leave one behind under the same key name).
    editor.unregisterPlugin('postCanvasBlockDragging');
    editor.registerPlugin(draggingPlugin());
    return () => {
      if (!editor.isDestroyed) editor.unregisterPlugin('postCanvasBlockDragging');
    };
  }, [editor]);
  const frame = useRef(0);

  // The caret's block, so keyboard and touch users get a handle too.
  const caret = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e.isEditable || (!e.isFocused && !menu)) return null;
      const { $from } = e.state.selection;
      return $from.depth === 0 ? $from.pos : $from.before(1);
    },
  });
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const element = canvas.current;
      setCaretSpot(caret === null || !element ? null : spotFor(editor, caret, element, narrow));
    });
    return () => cancelAnimationFrame(id);
  }, [caret, editor, canvas, narrow]);

  // Follow the mouse over the canvas.
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || drag.current) return;
      const y = event.clientY;
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        if ((event.target as Element | null)?.closest?.('.pc-handle')) return;
        const pos = blockAtY(editor, y);
        setHover(pos === null ? null : spotFor(editor, pos, element, narrow));
      });
    };
    const leave = () => {
      cancelAnimationFrame(frame.current);
      if (!drag.current) setHover(null);
    };
    element.addEventListener('pointermove', move);
    element.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(frame.current);
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerleave', leave);
    };
  }, [canvas, editor, narrow]);

  const spot = frozen ?? hover ?? caretSpot;

  // The handle stays put while its menu is open or it has keyboard focus, and follows the blocks again after.
  const handle = useRef<HTMLDivElement>(null);
  const release = () =>
    requestAnimationFrame(() => {
      if (!handle.current?.contains(document.activeElement)) setFrozen(null);
    });
  const openMenu = () => {
    setFrozen(spot);
    setMenu(true);
  };
  const closeMenu = () => {
    setMenu(false);
    release();
  };

  const endDrag = (commit: boolean) => {
    const state = drag.current;
    drag.current = null;
    if (!state) return;
    cancelAnimationFrame(state.frame);
    markDragging(editor, null);
    setDrop(null);
    setFrozen(null);
    if (commit && state.index !== null) moveBlockTo(editor, state.from, state.index);
  };

  // Drop line at the pointer, plus auto-scroll while it rests near the top or bottom edge.
  const track = (y: number) => {
    const state = drag.current;
    const element = canvas.current;
    if (!state || !element) return;
    state.y = y;
    const found = dropIndexAt(editor, y);
    state.index = found.index;
    setDrop(found.top - element.getBoundingClientRect().top);
  };
  const scrollLoop = () => {
    const state = drag.current;
    if (!state) return;
    const scroller = scrollParent(editor.view.dom);
    const top = scroller ? scroller.getBoundingClientRect().top : 0;
    const bottom = scroller ? scroller.getBoundingClientRect().bottom : window.innerHeight;
    const step =
      state.y < top + edge
        ? -Math.ceil(((top + edge - state.y) / edge) * maxScrollStep)
        : state.y > bottom - edge
          ? Math.ceil(((state.y - (bottom - edge)) / edge) * maxScrollStep)
          : 0;
    if (step !== 0) {
      if (scroller) scroller.scrollTop += step;
      else window.scrollBy(0, step);
      track(state.y);
    }
    state.frame = requestAnimationFrame(scrollLoop);
  };

  const pointer = usePointerDrag(
    {
      onStart: (event) => {
        const from = blockStartOrNull(editor, spot?.pos ?? null);
        if (!spot || from === null) return;
        setMenu(false);
        setFrozen(spot);
        drag.current = { from, index: null, y: event.clientY, frame: 0 };
        markDragging(editor, from);
        track(event.clientY);
        drag.current.frame = requestAnimationFrame(scrollLoop);
      },
      onMove: (event) => track(event.clientY),
      onEnd: () => endDrag(true),
      onCancel: () => endDrag(false),
    },
    { touchDelay: 350 },
  );

  // A drag still running when the editor goes away leaves nothing behind.
  useEffect(
    () => () => {
      const state = drag.current;
      if (!state) return;
      cancelAnimationFrame(state.frame);
    },
    [],
  );

  // A spot is kept across edits until the next hover or caret move, so after an undo or a remote change its position can
  // point past the end or inside another node. Only a position that still starts a block counts.
  const pos = blockStartOrNull(editor, spot?.pos ?? null);
  const entries: MenuEntry[] = [];
  if (pos !== null && menu) {
    const run = (action: () => void) => () => {
      setMenu(false);
      setFrozen(null);
      action();
      editor.commands.focus();
    };
    entries.push(
      {
        id: 'up',
        label: t('ui.handle.moveUp'),
        icon: ArrowUp,
        hint: shortcut('Alt-Shift-↑'),
        disabled: !canMoveBlock(editor, pos, -1),
        onSelect: run(() => moveBlock(editor, pos, -1)),
      },
      {
        id: 'down',
        label: t('ui.handle.moveDown'),
        icon: ArrowDown,
        hint: shortcut('Alt-Shift-↓'),
        disabled: !canMoveBlock(editor, pos, 1),
        onSelect: run(() => moveBlock(editor, pos, 1)),
      },
      {
        id: 'duplicate',
        label: t('ui.handle.duplicate'),
        icon: Copy,
        hint: shortcut('Alt-Shift-D'),
        onSelect: run(() => duplicateBlock(editor, pos)),
      },
      {
        id: 'delete',
        label: t('ui.handle.delete'),
        icon: Trash2,
        hint: shortcut('Alt-Shift-⌫'),
        className: 'pc-menu__item--danger',
        onSelect: run(() => deleteBlock(editor, pos)),
      },
    );
    const node = editor.state.doc.nodeAt(pos);
    if (node && isTextBlockType(node.type.name)) {
      const group = t('ui.turnInto');
      for (const entry of turnIntoEntries(editor, t, currentTurnInto(editor, pos), pos)) {
        entries.push({ ...entry, group, onSelect: run(entry.onSelect) });
      }
    }
  }

  const node = pos === null ? null : editor.state.doc.nodeAt(pos);
  const label = node ? t('ui.handle.label', { block: blockName(node.type.name, node.attrs.level, t) }) : '';

  return (
    <>
      {spot && node && (
        <div
          ref={handle}
          className="pc-handle"
          style={{ top: spot.top, left: spot.left }}
          contentEditable={false}
          onFocus={() => {
            if (!frozen) setFrozen(spot);
          }}
          onBlur={() => {
            if (!menu) release();
          }}
        >
          <button
            ref={setGrip}
            type="button"
            className="pc-handle__grip"
            aria-label={label}
            title={t('ui.handle.hint')}
            aria-haspopup="menu"
            aria-expanded={menu}
            // A press keeps focus in the text, so the caret (and the block the handle stands for) doesn't move.
            onMouseDown={(event) => event.preventDefault()}
            onPointerDown={pointer.onPointerDown}
            onClickCapture={pointer.onClickCapture}
            onClick={() => {
              const at = blockStartOrNull(editor, spot.pos);
              if (!menu && at !== null && !editor.state.doc.nodeAt(at)?.isTextblock) {
                // Select a media block, so it's clear what the menu acts on.
                editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, at)));
              }
              if (menu) closeMenu();
              else openMenu();
            }}
          >
            <GripVertical size={18} aria-hidden="true" />
          </button>
        </div>
      )}
      <Popover
        open={menu && pos !== null}
        anchor={grip}
        onClose={closeMenu}
        label={t('ui.handle.menu')}
        role="menu"
        placement="bottom-start"
        className="pc-menu"
      >
        <MenuItems entries={entries} onDone={() => undefined} />
      </Popover>
      {drop !== null && <div className="pc-drop-line" style={{ top: drop }} aria-hidden="true" />}
    </>
  );
}

function blockName(
  type: string,
  level: unknown,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  if (type === 'heading') return t('text.insert.heading', { level: Number(level) });
  const known = [
    'paragraph',
    'bulletList',
    'orderedList',
    'taskList',
    'blockquote',
    'codeBlock',
    'table',
    'horizontalRule',
  ];
  return known.includes(type) ? t(`ui.block.${type}`) : t('ui.block.media');
}
