'use client';
// The + at the canvas's left edge, level with the line it would add at: the caret's empty line, or the line under the
// mouse. It opens the same insert items as `/`. Pressing it keeps focus in the text, so the spot doesn't move.
import type { Editor } from '@tiptap/core';
import { useEditorState } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import { Plus } from 'lucide-react';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { Popover } from '../core/react/popover';
import { useInsertEntries } from './controls';
import { MenuItems } from './menu';
import { useEditorUi } from './ui-context';

interface Spot {
  /** Start of the top-level block. */
  pos: number;
  /** Middle of its first line, in the canvas's coordinates. */
  top: number;
  /** An empty paragraph: items replace it. Otherwise they go on a new line after it. */
  empty: boolean;
}

function spotFor(editor: Editor, pos: number, canvas: HTMLElement): Spot | null {
  const node = editor.state.doc.nodeAt(pos);
  if (!node || !node.isTextblock) return null;
  const dom = editor.view.nodeDOM(pos);
  if (!(dom instanceof HTMLElement)) return null;
  const box = dom.getBoundingClientRect();
  const lineHeight = parseFloat(getComputedStyle(dom).lineHeight) || 24;
  const top = box.top - canvas.getBoundingClientRect().top + Math.min(box.height, lineHeight) / 2;
  return { pos, top, empty: node.type.name === 'paragraph' && node.content.size === 0 };
}

const same = (a: Spot | null, b: Spot | null) => a?.pos === b?.pos && a?.top === b?.top && a?.empty === b?.empty;

/** The + button. Render it inside the canvas element (`position: relative`). */
export function InsertButton({ canvas }: { canvas: RefObject<HTMLDivElement | null> }) {
  const { editor, t } = useEditorUi();
  const [hover, setHover] = useState<Spot | null>(null);
  const [menu, setMenu] = useState<Spot | null>(null);
  const [button, setButton] = useState<HTMLButtonElement | null>(null);
  const frame = useRef(0);

  // The caret's empty line gets a + too: keyboard and touch users see it there.
  const caret = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const { selection } = e.state;
      if (!selection.empty || !e.isFocused || !e.isEditable) return null;
      const { $from } = selection;
      if ($from.depth !== 1 || $from.parent.type.name !== 'paragraph' || $from.parent.content.size > 0) return null;
      return $from.before(1);
    },
  });
  const [caretSpot, setCaretSpot] = useState<Spot | null>(null);
  useEffect(() => {
    const element = canvas.current;
    if (caret === null || !element) {
      setCaretSpot(null);
      return;
    }
    const id = requestAnimationFrame(() => {
      const next = spotFor(editor, caret, element);
      setCaretSpot((prev) => (same(prev, next) ? prev : next));
    });
    return () => cancelAnimationFrame(id);
  }, [caret, editor, canvas]);

  // Follow the mouse over the canvas.
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || document.documentElement.classList.contains('pc-dragging')) return;
      const y = event.clientY;
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        const content = editor.view.dom.getBoundingClientRect();
        const style = getComputedStyle(editor.view.dom);
        const left = content.left + parseFloat(style.paddingLeft) + 4;
        const found = editor.view.posAtCoords({ left, top: y });
        let next: Spot | null = null;
        if (found) {
          const $pos = editor.state.doc.resolve(found.pos);
          if ($pos.depth >= 1) next = spotFor(editor, $pos.before(1), element);
        }
        setHover((prev) => (same(prev, next) ? prev : next));
      });
    };
    const leave = () => {
      cancelAnimationFrame(frame.current);
      setHover(null);
    };
    element.addEventListener('pointermove', move);
    element.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(frame.current);
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerleave', leave);
    };
  }, [canvas, editor]);

  const getEntries = useInsertEntries((run) => {
    const spot = menu;
    setMenu(null);
    if (!spot) return run();
    // Put the caret where the + stands, on a fresh line when that line has text.
    const node = editor.state.doc.nodeAt(spot.pos);
    if (!node) return run();
    if (spot.empty) {
      editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, spot.pos + 1)));
    } else {
      const after = spot.pos + node.nodeSize;
      const tr = editor.state.tr.insert(after, editor.schema.nodes.paragraph!.create());
      tr.setSelection(TextSelection.create(tr.doc, after + 1));
      editor.view.dispatch(tr);
    }
    editor.commands.focus();
    run();
  }, 'insert-button');

  const spot = menu ?? hover ?? caretSpot;
  if (!spot) return null;
  const open = menu !== null;

  return (
    <div className="pc-insert" style={{ top: spot.top }} contentEditable={false}>
      <button
        ref={setButton}
        type="button"
        tabIndex={-1}
        className="pc-insert__button"
        data-open={open || undefined}
        aria-label={open ? t('ui.insertButton.close') : t('ui.insertButton.open')}
        aria-haspopup="menu"
        aria-expanded={open}
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => setMenu(open ? null : spot)}
      >
        <Plus size={18} strokeWidth={2.4} aria-hidden="true" />
      </button>
      <Popover
        open={open}
        anchor={button}
        onClose={() => setMenu(null)}
        label={t('ui.insertButton.menu')}
        role="menu"
        placement="bottom-start"
        className="pc-menu pc-insert__menu"
      >
        {open && <MenuItems entries={getEntries()} onDone={() => undefined} />}
      </Popover>
    </div>
  );
}
