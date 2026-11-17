'use client';
import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  type Placement,
  type ReferenceElement,
} from '@floating-ui/dom';
import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';

const focusable =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Props of `Popover`. */
export interface PopoverProps {
  open: boolean;
  /** What it points at: an element, or a virtual element such as a text selection's rectangle. */
  anchor: ReferenceElement | null;
  /** Called on Escape and on a press outside the popover and its anchor. */
  onClose: () => void;
  /** Already translated accessible name. */
  label: string;
  /** Default `dialog`. Use `menu` or `listbox` and give the children matching item roles. */
  role?: 'dialog' | 'menu' | 'listbox';
  /** Default `bottom-start`. It flips and shifts to stay on screen. */
  placement?: Placement;
  /** Gap to the anchor in pixels. Default 6. */
  gap?: number;
  /** What gets focus on open: the first focusable child (default), a given element, or nothing. */
  initialFocus?: 'first' | 'none' | RefObject<HTMLElement | null>;
  className?: string;
  children: ReactNode;
}

/**
 * A small floating panel, positioned with Floating UI. Escape and a press outside close it, and focus goes back to
 * where it was before it opened (or to the anchor). It renders in place, inside `.pc-root`, so it keeps the theme.
 */
export function Popover({
  open,
  anchor,
  onClose,
  label,
  role = 'dialog',
  placement = 'bottom-start',
  gap = 6,
  initialFocus = 'first',
  className,
  children,
}: PopoverProps) {
  const panel = useRef<HTMLDivElement>(null);
  const latestClose = useRef(onClose);
  useEffect(() => {
    latestClose.current = onClose;
  });

  // Position, and keep it positioned while the page scrolls or resizes.
  useLayoutEffect(() => {
    const floating = panel.current;
    if (!open || !anchor || !floating) return;
    return autoUpdate(anchor, floating, () => {
      void computePosition(anchor, floating, {
        placement,
        strategy: 'fixed',
        middleware: [offset(gap), flip({ padding: 8 }), shift({ padding: 8 })],
      }).then(({ x, y }) => {
        floating.style.left = `${x}px`;
        floating.style.top = `${y}px`;
      });
    });
  }, [open, anchor, placement, gap]);

  // Focus in on open, and back out on close.
  useEffect(() => {
    const floating = panel.current;
    if (!open || !floating) return;
    const previous = floating.ownerDocument.activeElement;
    if (initialFocus === 'first') {
      (floating.querySelector<HTMLElement>(focusable) ?? floating).focus();
    } else if (initialFocus !== 'none') {
      initialFocus.current?.focus();
    }
    return () => {
      const active = floating.ownerDocument.activeElement;
      const focusWasInside = !active || active === floating.ownerDocument.body || floating.contains(active);
      if (!focusWasInside) return;
      if (previous instanceof HTMLElement && previous !== floating.ownerDocument.body && previous.isConnected) {
        previous.focus();
      } else if (anchor instanceof HTMLElement && anchor.isConnected) {
        anchor.focus();
      }
    };
    // The focus target is read once per opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on a press outside the popover and its anchor.
  useEffect(() => {
    const floating = panel.current;
    if (!open || !floating) return;
    const outside = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target || floating.contains(target)) return;
      if (anchor instanceof Element && anchor.contains(target)) return;
      latestClose.current();
    };
    floating.ownerDocument.addEventListener('pointerdown', outside, true);
    return () => floating.ownerDocument.removeEventListener('pointerdown', outside, true);
  }, [open, anchor]);

  if (!open) return null;
  return (
    <div
      ref={panel}
      role={role}
      aria-label={label}
      aria-modal={role === 'dialog' ? false : undefined}
      tabIndex={-1}
      className={className ? `pc-popover ${className}` : 'pc-popover'}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        latestClose.current();
      }}
    >
      {children}
    </div>
  );
}
