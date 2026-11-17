'use client';
// The block handle: drag with a mouse to move a block (Tiptap's drag handle), or click it for a menu with move up, move
// down, duplicate, delete and "turn into". On touch, the menu works, and a long press starts a drag.
import type { Editor } from '@tiptap/core';
import { DragHandle } from '@tiptap/extension-drag-handle-react';
import type { Node as PmNode } from '@tiptap/pm/model';
import { NodeSelection } from '@tiptap/pm/state';
import { ArrowDown, ArrowUp, Copy, GripVertical, Trash2 } from 'lucide-react';
import { useRef, useState, type RefObject } from 'react';
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

/** The top-level block index whose upper half is above `y`, for dropping: 0 to childCount. */
function dropIndexAt(editor: Editor, y: number): { index: number; top: number } {
  const { doc } = editor.state;
  let offset = 0;
  for (let index = 0; index < doc.childCount; index++) {
    const dom = editor.view.nodeDOM(offset);
    if (dom instanceof HTMLElement) {
      const box = dom.getBoundingClientRect();
      if (y < box.top + box.height / 2) return { index, top: box.top };
    }
    offset += doc.child(index).nodeSize;
  }
  const last = editor.view.dom.lastElementChild?.getBoundingClientRect();
  return { index: doc.childCount, top: last ? last.bottom : editor.view.dom.getBoundingClientRect().bottom };
}

/** Moves the block at `from` to before the block at `index` (or the end). */
function moveBlockTo(editor: Editor, from: number, index: number): void {
  const block = blockAt(editor, from);
  if (!block || index === block.index || index === block.index + 1) return;
  const { state } = editor;
  const node = state.doc.child(block.index);
  let target = 0;
  for (let i = 0; i < index; i++) target += state.doc.child(i).nodeSize;
  const tr = state.tr;
  if (target > block.pos) {
    tr.insert(target, node);
    tr.delete(block.pos, block.pos + block.size);
  } else {
    tr.delete(block.pos, block.pos + block.size);
    tr.insert(target, node);
  }
  editor.view.dispatch(tr.scrollIntoView());
}

/** The handle beside the hovered block. Render it inside the canvas element. */
export function BlockHandle({ canvas }: { canvas: RefObject<HTMLDivElement | null> }) {
  const { editor, t } = useEditorUi();
  const [target, setTarget] = useState<{ node: PmNode; pos: number } | null>(null);
  const [menu, setMenu] = useState(false);
  const [grip, setGrip] = useState<HTMLButtonElement | null>(null);
  const [drop, setDrop] = useState<number | null>(null);
  const dragFrom = useRef<number | null>(null);
  const dropIndex = useRef<number | null>(null);

  const lock = (locked: boolean) => {
    editor.view.dispatch(editor.state.tr.setMeta('lockDragHandle', locked).setMeta('addToHistory', false));
  };
  const openMenu = (open: boolean) => {
    setMenu(open);
    lock(open);
  };

  // Touch: a long press on the handle starts a drag that follows the finger.
  const touchDrag = usePointerDrag(
    {
      onStart: () => {
        dragFrom.current = target?.pos ?? null;
        setMenu(false);
        lock(true);
      },
      onMove: (event) => {
        const element = canvas.current;
        if (!element) return;
        const found = dropIndexAt(editor, event.clientY);
        dropIndex.current = found.index;
        setDrop(found.top - element.getBoundingClientRect().top);
      },
      onEnd: () => {
        if (dragFrom.current !== null && dropIndex.current !== null) {
          moveBlockTo(editor, dragFrom.current, dropIndex.current);
        }
        dragFrom.current = null;
        dropIndex.current = null;
        setDrop(null);
        lock(false);
      },
      onCancel: () => {
        dragFrom.current = null;
        dropIndex.current = null;
        setDrop(null);
        lock(false);
      },
    },
    { touchDelay: 350 },
  );

  const pos = target?.pos ?? null;
  const entries: MenuEntry[] = [];
  if (pos !== null && menu) {
    const run = (action: () => void) => () => {
      openMenu(false);
      action();
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

  const label = target ? t('ui.handle.label', { block: blockName(target.node, t) }) : t('ui.handle.generic');

  return (
    <>
      <DragHandle
        editor={editor}
        className="pc-handle"
        computePositionConfig={{ placement: 'left-start', strategy: 'absolute' }}
        onNodeChange={({ node, pos: at }) => {
          if (!menu) setTarget(node ? { node, pos: at } : null);
        }}
        onElementDragStart={() => openMenu(false)}
      >
        <button
          ref={setGrip}
          type="button"
          className="pc-handle__grip"
          aria-label={label}
          title={t('ui.handle.hint')}
          aria-haspopup="menu"
          aria-expanded={menu}
          onPointerDown={(event) => {
            if (event.pointerType !== 'mouse') touchDrag.onPointerDown(event);
          }}
          onClickCapture={touchDrag.onClickCapture}
          onClick={() => {
            if (target && !menu) {
              // Select the block, so it's clear what the menu acts on.
              const selectable = editor.state.doc.nodeAt(target.pos);
              if (selectable && !selectable.isTextblock) {
                editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, target.pos)));
              }
            }
            openMenu(!menu);
          }}
        >
          <GripVertical size={18} aria-hidden="true" />
        </button>
      </DragHandle>
      <Popover
        open={menu && pos !== null}
        anchor={grip}
        onClose={() => openMenu(false)}
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

function blockName(node: PmNode, t: (key: string, values?: Record<string, string | number>) => string): string {
  if (node.type.name === 'heading') return t('text.insert.heading', { level: node.attrs.level as number });
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
  return known.includes(node.type.name) ? t(`ui.block.${node.type.name}`) : t('ui.block.media');
}
