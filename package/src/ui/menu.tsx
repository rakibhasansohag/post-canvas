'use client';
// A menu button and its menu: arrow keys, Home, End and type-ahead move between items, Escape closes and returns focus.
import { Check, ChevronDown, type LucideIcon } from 'lucide-react';
import { useState, type ComponentType, type KeyboardEvent, type ReactNode } from 'react';
import { Popover } from '../core/react/popover';

/** One menu entry. */
export interface MenuEntry {
  id: string;
  label: string;
  icon?: ComponentType<{ size?: number }> | LucideIcon;
  /** Shown on the right, such as a shortcut. */
  hint?: string;
  /** Makes it a radio item: `true` is the current choice. */
  checked?: boolean;
  disabled?: boolean;
  /** Entries with the same group sit together under that heading. */
  group?: string;
  /** Extra classes on the item, for swatches and the like. */
  className?: string;
  /** Drawn before the label instead of `icon`. */
  swatch?: ReactNode;
  onSelect: () => void;
}

/** Moves focus between a container's enabled menu items. */
export function onMenuKeyDown(event: KeyboardEvent<HTMLElement>): void {
  const items = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(
      '[role="menuitem"]:not([aria-disabled="true"]), [role="menuitemradio"]:not([aria-disabled="true"])',
    ),
  );
  if (items.length === 0) return;
  const index = items.indexOf(document.activeElement as HTMLElement);
  let next: HTMLElement | undefined;
  if (event.key === 'ArrowDown') next = items[(index + 1) % items.length];
  else if (event.key === 'ArrowUp') next = items[(index - 1 + items.length) % items.length];
  else if (event.key === 'Home') next = items[0];
  else if (event.key === 'End') next = items[items.length - 1];
  else if (event.key.length === 1 && /\S/.test(event.key)) {
    const key = event.key.toLowerCase();
    const after = [...items.slice(index + 1), ...items.slice(0, index + 1)];
    next = after.find((item) => (item.textContent ?? '').trim().toLowerCase().startsWith(key));
  }
  if (!next) return;
  event.preventDefault();
  next.focus();
}

/** The items of a menu, grouped. Put it inside a `Popover` with `role="menu"`. */
export function MenuItems({ entries, onDone }: { entries: MenuEntry[]; onDone: () => void }) {
  const groups: { name: string | undefined; entries: MenuEntry[] }[] = [];
  for (const entry of entries) {
    const last = groups[groups.length - 1];
    if (last && last.name === entry.group) last.entries.push(entry);
    else groups.push({ name: entry.group, entries: [entry] });
  }
  const renderEntry = (entry: MenuEntry) => {
    const Icon = entry.icon;
    const radio = entry.checked !== undefined;
    return (
      <button
        key={entry.id}
        type="button"
        role={radio ? 'menuitemradio' : 'menuitem'}
        aria-checked={radio ? entry.checked : undefined}
        aria-disabled={entry.disabled || undefined}
        tabIndex={-1}
        className={entry.className ? `pc-menu__item ${entry.className}` : 'pc-menu__item'}
        onClick={() => {
          if (entry.disabled) return;
          onDone();
          entry.onSelect();
        }}
      >
        {entry.swatch ?? (Icon ? <Icon size={17} aria-hidden="true" /> : null)}
        <span className="pc-menu__label">{entry.label}</span>
        {entry.hint && <span className="pc-menu__hint">{entry.hint}</span>}
        {radio && entry.checked && <Check size={16} aria-hidden="true" className="pc-menu__check" />}
      </button>
    );
  };
  return (
    <div className="pc-menu__items" onKeyDown={onMenuKeyDown}>
      {groups.map((group, index) =>
        group.name ? (
          <div key={`${group.name}-${index}`} role="group" aria-label={group.name} className="pc-menu__group">
            <div className="pc-menu__heading" aria-hidden="true">
              {group.name}
            </div>
            {group.entries.map(renderEntry)}
          </div>
        ) : (
          group.entries.map(renderEntry)
        ),
      )}
    </div>
  );
}

/** Props of `MenuButton`. */
export interface MenuButtonProps {
  /** The accessible name and tooltip. */
  label: string;
  icon?: LucideIcon;
  /** Visible text next to the icon, such as the current block type. */
  text?: string;
  entries: MenuEntry[];
  disabled?: boolean;
  /** Marks the button as active, for example while the colour menu has a colour applied. */
  active?: boolean;
  className?: string;
  /** Extra content under the items. */
  footer?: (close: () => void) => ReactNode;
}

/** A toolbar button that opens a menu. */
export function MenuButton({ label, icon: Icon, text, entries, disabled, active, className, footer }: MenuButtonProps) {
  const [open, setOpen] = useState(false);
  const [button, setButton] = useState<HTMLButtonElement | null>(null);
  const close = () => setOpen(false);
  return (
    <>
      <button
        ref={setButton}
        type="button"
        className={['pc-tb-button', text ? 'pc-tb-button--text' : '', className ?? ''].filter(Boolean).join(' ')}
        aria-label={text ? undefined : label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        data-active={active || undefined}
        data-roving=""
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen((value) => !value)}
      >
        {Icon && <Icon size={18} aria-hidden="true" />}
        {text && <span className="pc-tb-button__text">{text}</span>}
        {text && <span className="pc-sr-only">{label}</span>}
        <ChevronDown size={14} aria-hidden="true" className="pc-tb-button__caret" />
      </button>
      <Popover
        open={open}
        anchor={button}
        onClose={close}
        label={label}
        role="menu"
        className="pc-menu"
        initialFocus="first"
      >
        <MenuItems entries={entries} onDone={close} />
        {footer?.(close)}
      </Popover>
    </>
  );
}
