'use client';
// Roving tabindex for toolbars: one Tab stop, arrow keys between the buttons.
import { useLayoutEffect, useRef, type FocusEvent, type KeyboardEvent, type RefObject } from 'react';

const itemSelector = '[data-roving]:not([disabled])';

function items(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(itemSelector)).filter(
    (item) => item.closest('[data-roving-root]') === root && item.offsetParent !== null,
  );
}

/**
 * Makes the element a toolbar with a single Tab stop: ArrowLeft and ArrowRight (and Home, End) move focus between its
 * `[data-roving]` children, and Tab leaves. Returns the handlers to spread on the toolbar element.
 */
export function useRovingFocus(root: RefObject<HTMLElement | null>) {
  const current = useRef<HTMLElement | null>(null);

  // After every render, make sure exactly one item is in the Tab order.
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const list = items(element);
    const active = current.current && list.includes(current.current) ? current.current : list[0];
    for (const item of Array.from(element.querySelectorAll<HTMLElement>('[data-roving]'))) {
      if (item.closest('[data-roving-root]') === element) item.tabIndex = item === active ? 0 : -1;
    }
  });

  return {
    'data-roving-root': '',
    onFocus(event: FocusEvent<HTMLElement>) {
      const target = event.target as HTMLElement;
      if (!target.matches('[data-roving]') || target.closest('[data-roving-root]') !== event.currentTarget) return;
      current.current = target;
      for (const item of items(event.currentTarget)) item.tabIndex = item === target ? 0 : -1;
    },
    onKeyDown(event: KeyboardEvent<HTMLElement>) {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const target = event.target as HTMLElement;
      if (target.closest('[data-roving-root]') !== event.currentTarget || !target.matches('[data-roving]')) return;
      const list = items(event.currentTarget);
      const index = list.indexOf(target);
      if (index === -1) return;
      const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
      const forward = event.key === (rtl ? 'ArrowLeft' : 'ArrowRight');
      const next =
        event.key === 'Home'
          ? list[0]
          : event.key === 'End'
            ? list[list.length - 1]
            : list[(index + (forward ? 1 : -1) + list.length) % list.length];
      if (!next) return;
      event.preventDefault();
      next.focus();
    },
  };
}
