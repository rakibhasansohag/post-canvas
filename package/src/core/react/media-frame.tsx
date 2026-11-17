'use client';
import { ArrowDown, ArrowUp, GripVertical, Trash2, type LucideIcon } from 'lucide-react';
import { forwardRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Popover } from './popover';
import { usePointerDrag, type DragCallbacks } from './use-pointer-drag';
import { useTranslator } from './use-translator';

/** What a key on a selected block asks the canvas to do. */
export type FrameKey = 'remove' | 'before' | 'after';

/** The frame's own handle: drag to move, or click for a menu with move up, move down and remove. */
export interface FrameHandle {
  /** Drag callbacks. Leave out for a handle that only opens the menu. */
  drag?: DragCallbacks;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onStep: (by: -1 | 1) => void;
}

/** Props of `MediaFrame`. */
export interface MediaFrameProps {
  /** Already translated, such as "Gallery, 3 photos" or "Video: Big Buck Bunny". */
  label: string;
  /** Drawn as selected, for example while the node is the editor's node selection. Focus inside also selects it. */
  selected?: boolean;
  /** Faded, for example while it's being dragged. */
  dimmed?: boolean;
  /** Outlined, for example while dragged-in files would join it. */
  highlighted?: boolean;
  /** Keys pressed on the frame itself: Backspace or Delete (`remove`), arrows up or left (`before`), arrows down or right and Enter (`after`). */
  onKey?: (key: FrameKey) => void;
  onRemove: () => void;
  /** The frame's own handle. Leave out when the editor's block handle moves blocks. */
  handle?: FrameHandle;
  /** Buttons over the top-right corner, usually a `MediaToolbar`. */
  toolbar?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * The frame around a media or embed block. Clicking it selects it (it takes focus). While selected, Backspace or Delete
 * removes it, Enter and the arrow keys move to the text around it, and Escape lets go. Its optional handle drags it to
 * another spot or, clicked, opens a menu: move up, move down, remove.
 */
export const MediaFrame = forwardRef<HTMLDivElement, MediaFrameProps>(function MediaFrame(
  {
    label,
    selected = false,
    dimmed = false,
    highlighted = false,
    onKey,
    onRemove,
    handle,
    toolbar,
    className,
    children,
  },
  ref,
) {
  const t = useTranslator();
  const [menu, setMenu] = useState(false);
  const [grip, setGrip] = useState<HTMLButtonElement | null>(null);
  const noDrag: DragCallbacks = { onStart: () => {}, onMove: () => {}, onEnd: () => {}, onCancel: () => {} };
  const drag = handle?.drag ?? noDrag;
  const gripDrag = usePointerDrag({
    ...drag,
    onStart: (event) => {
      setMenu(false);
      drag.onStart(event);
    },
  });

  const choose = (action: () => void) => {
    setMenu(false);
    action();
  };

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    const key: FrameKey | null =
      event.key === 'Backspace' || event.key === 'Delete'
        ? 'remove'
        : event.key === 'ArrowUp' || event.key === 'ArrowLeft'
          ? 'before'
          : event.key === 'ArrowDown' || event.key === 'ArrowRight' || event.key === 'Enter'
            ? 'after'
            : null;
    if (key && onKey) {
      event.preventDefault();
      onKey(key);
    } else if (event.key === 'Escape') {
      event.currentTarget.blur();
    }
  }

  const classes = ['pc-frame', className].filter(Boolean).join(' ');
  return (
    <div
      ref={ref}
      role="group"
      aria-label={label}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className={classes}
      data-selected={selected || undefined}
      data-dimmed={dimmed || undefined}
      data-highlighted={highlighted || undefined}
      data-menu-open={menu || undefined}
    >
      {children}
      {handle && (
        <div className="pc-frame__handle" contentEditable={false}>
          <button
            ref={setGrip}
            type="button"
            className="pc-frame__grip pc-frame__reveal"
            aria-label={t('core.frame.handle', { label })}
            aria-haspopup="menu"
            aria-expanded={menu}
            onPointerDown={handle.drag ? gripDrag.onPointerDown : undefined}
            onClickCapture={gripDrag.onClickCapture}
            onClick={() => setMenu((open) => !open)}
          >
            <GripVertical size={18} strokeWidth={2.2} aria-hidden="true" />
          </button>
          <Popover
            open={menu}
            anchor={grip}
            onClose={() => setMenu(false)}
            label={t('core.frame.menu', { label })}
            role="menu"
            className="pc-menu"
          >
            <FrameMenu
              items={[
                {
                  icon: ArrowUp,
                  label: t('core.frame.moveUp'),
                  disabled: !handle.canMoveUp,
                  onSelect: () => choose(() => handle.onStep(-1)),
                },
                {
                  icon: ArrowDown,
                  label: t('core.frame.moveDown'),
                  disabled: !handle.canMoveDown,
                  onSelect: () => choose(() => handle.onStep(1)),
                },
                { icon: Trash2, label: t('core.frame.remove'), onSelect: () => choose(onRemove) },
              ]}
            />
          </Popover>
        </div>
      )}
      {toolbar && (
        <div className="pc-frame__toolbar" contentEditable={false}>
          {toolbar}
        </div>
      )}
    </div>
  );
});

interface MenuEntry {
  icon: LucideIcon;
  label: string;
  disabled?: boolean;
  onSelect: () => void;
}

/** Menu items with arrow-key, Home and End movement between the enabled ones. */
function FrameMenu({ items }: { items: MenuEntry[] }) {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const buttons = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])'),
    );
    const index = buttons.indexOf(event.target as HTMLButtonElement);
    const next =
      event.key === 'ArrowDown'
        ? buttons[(index + 1) % buttons.length]
        : event.key === 'ArrowUp'
          ? buttons[(index - 1 + buttons.length) % buttons.length]
          : event.key === 'Home'
            ? buttons[0]
            : event.key === 'End'
              ? buttons[buttons.length - 1]
              : undefined;
    if (!next) return;
    event.preventDefault();
    next.focus();
  }

  return (
    <div className="pc-menu__items" onKeyDown={onKeyDown}>
      {items.map(({ icon: Icon, label, disabled, onSelect }) => (
        <button
          key={label}
          type="button"
          role="menuitem"
          className="pc-menu__item"
          disabled={disabled}
          onClick={onSelect}
        >
          <Icon size={17} strokeWidth={2.2} aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}
