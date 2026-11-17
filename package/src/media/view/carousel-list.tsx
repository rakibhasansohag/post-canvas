'use client';
// The carousel strip with a mouse: drag it sideways, and it glides on when let go. Touch, pens, trackpads and the
// keyboard already scroll it natively, and without JavaScript it still scrolls with CSS scroll-snap.
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';

interface Sample {
  x: number;
  t: number;
}

/** Below this speed (px per ms) a glide stops. */
const minSpeed = 0.02;
/** How fast a glide slows down, per ms (exponential decay). */
const friction = 0.0035;
const maxSpeed = 4;
const windowMs = 100;
/** Holding still this long before letting go means "stop here", not "fling". */
const restMs = 60;
/** Movement before a press counts as a drag, so clicks still work. */
const threshold = 4;

/** The pointer's speed (px per ms) over the last 100 ms of a drag. Zero if it rested before letting go. */
export function releaseVelocity(samples: readonly Sample[], now: number): number {
  const last = samples[samples.length - 1];
  if (!last || now - last.t >= restMs) return 0;
  const recent = samples.filter((sample) => sample.t >= now - windowMs);
  const first = recent[0];
  if (!first || recent.length < 2 || last.t === first.t) return 0;
  const speed = (last.x - first.x) / (last.t - first.t);
  return Math.max(-maxSpeed, Math.min(maxSpeed, speed));
}

/** One frame of the glide: the speed after `dt` ms of friction, and the distance covered. */
export function glideStep(velocity: number, dt: number): { velocity: number; distance: number } {
  const decay = Math.exp(-friction * dt);
  return { velocity: velocity * decay, distance: (velocity * (1 - decay)) / friction };
}

/** Props of `CarouselList`: the list's own props from the static HTML, plus its accessible name. */
export interface CarouselListProps {
  className?: string;
  tabIndex?: number;
  label: string;
  children: ReactNode;
}

/** The carousel's `ul`, with mouse dragging and a glide. */
export function CarouselList({ className, tabIndex, label, children }: CarouselListProps) {
  const strip = useRef<HTMLUListElement>(null);
  const frame = useRef(0);
  const swallowClick = useRef(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  function glide(initial: number) {
    const element = strip.current;
    if (!element) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || Math.abs(initial) < minSpeed) {
      setDragging(false);
      return;
    }
    const max = element.scrollWidth - element.clientWidth;
    let velocity = initial;
    let position = element.scrollLeft;
    let last = performance.now();
    const step = (now: number) => {
      const next = glideStep(velocity, now - last);
      last = now;
      velocity = next.velocity;
      position = Math.max(0, Math.min(max, position + next.distance));
      element.scrollLeft = position;
      if (Math.abs(velocity) >= minSpeed && position > 0 && position < max) frame.current = requestAnimationFrame(step);
      else setDragging(false);
    };
    frame.current = requestAnimationFrame(step);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLUListElement>) {
    cancelAnimationFrame(frame.current);
    setDragging(false);
    const element = strip.current;
    if (!element || event.pointerType !== 'mouse' || event.button !== 0) return;
    if (element.scrollWidth <= element.clientWidth) return;
    const { pointerId } = event;
    const startX = event.clientX;
    const startScroll = element.scrollLeft;
    const samples: Sample[] = [{ x: event.clientX, t: event.timeStamp }];
    let moved = false;

    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const dx = ev.clientX - startX;
      if (!moved) {
        if (Math.abs(dx) < threshold) return;
        moved = true;
        setDragging(true);
        // Capture only now: before the threshold a press is still a click on whatever is under it.
        element.setPointerCapture(pointerId);
      }
      element.scrollLeft = startScroll - dx;
      samples.push({ x: ev.clientX, t: ev.timeStamp });
      if (samples.length > 30) samples.shift();
    };
    const end = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      if (!moved) return;
      swallowClick.current = true;
      setTimeout(() => (swallowClick.current = false));
      if (ev.type === 'pointerup') glide(-releaseVelocity(samples, ev.timeStamp));
      else setDragging(false);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  }

  function onClickCapture(event: MouseEvent) {
    if (!swallowClick.current) return;
    swallowClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <ul
      ref={strip}
      className={className}
      tabIndex={tabIndex}
      aria-label={label}
      data-dragging={dragging || undefined}
      onPointerDown={onPointerDown}
      onClickCapture={onClickCapture}
      onWheel={() => {
        cancelAnimationFrame(frame.current);
        setDragging(false);
      }}
      onDragStart={(event) => event.preventDefault()}
    >
      {children}
    </ul>
  );
}
