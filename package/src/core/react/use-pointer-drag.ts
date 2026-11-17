'use client';
import { useEffect, useRef, type MouseEvent, type PointerEvent as ReactPointerEvent } from 'react';

/** What a drag reports. */
export interface DragCallbacks {
  /** The press became a drag: it moved past the threshold (on touch with a delay, after resting first). */
  onStart: (event: PointerEvent) => void;
  onMove: (event: PointerEvent) => void;
  /** Let go after dragging. */
  onEnd: (event: PointerEvent) => void;
  /** Escape, or the browser took the pointer back (to scroll). */
  onCancel: () => void;
}

/** Options of `usePointerDrag`. */
export interface PointerDragOptions {
  /** Pixels a press must move before it becomes a drag. Default 4. */
  threshold?: number;
  /** On touch, milliseconds a finger must rest before it can drag, so a swipe still scrolls. Default 0. */
  touchDelay?: number;
}

/** The handlers to spread on the element that starts a drag. */
export interface PointerDragHandlers {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onClickCapture: (event: MouseEvent) => void;
}

/** Class on `<html>` while a drag runs, for global cursor and selection styles. */
export const draggingClass = 'pc-dragging';

/**
 * Press and drag with a mouse, finger or pen, for block handles and photo thumbnails. A press that never becomes a drag
 * stays an ordinary click, and the click after a drag is swallowed. With `touchDelay`, a finger has to rest first, so
 * swiping still scrolls. Escape cancels a running drag.
 */
export function usePointerDrag(
  callbacks: DragCallbacks,
  { threshold = 4, touchDelay = 0 }: PointerDragOptions = {},
): PointerDragHandlers {
  const latest = useRef(callbacks);
  useEffect(() => {
    latest.current = callbacks;
  });
  const stop = useRef<() => void>(() => {});
  const swallowClick = useRef(false);
  useEffect(() => () => stop.current(), []);

  function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0 || !event.isPrimary) return;
    stop.current();
    swallowClick.current = false;
    const element = event.currentTarget;
    const { pointerId } = event;
    const origin = { x: event.clientX, y: event.clientY };
    const rest = event.pointerType === 'touch' && touchDelay > 0;
    let phase: 'resting' | 'ready' | 'dragging' | 'cancelled' = rest ? 'resting' : 'ready';
    const timer = rest ? window.setTimeout(() => (phase = 'ready'), touchDelay) : 0;
    const root = element.ownerDocument.documentElement;

    // Once a finger has rested (or is dragging), moving it drags the item instead of scrolling.
    const holdPage = (ev: TouchEvent) => {
      if (phase !== 'resting') ev.preventDefault();
    };
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId || phase === 'cancelled') return;
      const distance = Math.hypot(ev.clientX - origin.x, ev.clientY - origin.y);
      if (phase === 'resting') {
        if (distance > 10) finish(); // moved too soon: a swipe, so the page keeps it
        return;
      }
      if (phase === 'ready') {
        if (distance < threshold) return;
        phase = 'dragging';
        element.setPointerCapture(pointerId);
        root.classList.add(draggingClass);
        latest.current.onStart(ev);
      }
      latest.current.onMove(ev);
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const was = phase;
      finish();
      if (was !== 'dragging' && was !== 'cancelled') return;
      swallowClick.current = true;
      setTimeout(() => (swallowClick.current = false));
      if (was === 'dragging') {
        if (ev.type === 'pointerup') latest.current.onEnd(ev);
        else latest.current.onCancel();
      }
    };
    const escape = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape' || phase !== 'dragging') return;
      ev.preventDefault();
      ev.stopPropagation();
      phase = 'cancelled';
      root.classList.remove(draggingClass);
      latest.current.onCancel();
    };
    function finish() {
      clearTimeout(timer);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('keydown', escape, true);
      element.removeEventListener('touchmove', holdPage);
      root.classList.remove(draggingClass);
      if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId);
      stop.current = () => {};
    }

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('keydown', escape, true);
    element.addEventListener('touchmove', holdPage, { passive: false });
    stop.current = finish;
  }

  function onClickCapture(event: MouseEvent) {
    if (!swallowClick.current) return;
    swallowClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  return { onPointerDown, onClickCapture };
}
