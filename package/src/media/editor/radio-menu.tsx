'use client';
import type { LucideIcon } from 'lucide-react';
import type { KeyboardEvent } from 'react';

/** One choice in a `RadioMenu`. */
export interface RadioMenuOption<T extends string> {
  value: T;
  label: string;
  icon: LucideIcon;
}

/** Props of `RadioMenu`. */
export interface RadioMenuProps<T extends string> {
  value: T;
  options: readonly RadioMenuOption<T>[];
  onSelect: (value: T) => void;
}

/** A menu of mutually exclusive choices (alignment, layout), with arrow keys, Home and End. Put it in a menu Popover. */
export function RadioMenu<T extends string>({ value, options, onSelect }: RadioMenuProps<T>) {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'));
    const index = items.indexOf(event.target as HTMLButtonElement);
    const next =
      event.key === 'ArrowDown'
        ? items[(index + 1) % items.length]
        : event.key === 'ArrowUp'
          ? items[(index - 1 + items.length) % items.length]
          : event.key === 'Home'
            ? items[0]
            : event.key === 'End'
              ? items[items.length - 1]
              : undefined;
    if (!next) return;
    event.preventDefault();
    next.focus();
  }
  return (
    <div className="pc-menu__items" onKeyDown={onKeyDown}>
      {options.map(({ value: option, label, icon: Icon }) => (
        <button
          key={option}
          type="button"
          role="menuitemradio"
          aria-checked={value === option}
          className="pc-menu__item"
          onClick={() => onSelect(option)}
        >
          <Icon size={17} strokeWidth={2.2} aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}
