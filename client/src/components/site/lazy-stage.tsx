'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Mounts its children once the box is about to scroll into view. The box keeps its reserved height before and after,
 * so nothing below it moves. `fallback` shows meanwhile.
 */
export function LazyStage({
  children,
  fallback,
  minHeight,
  className,
}: {
  children: ReactNode;
  fallback?: ReactNode;
  /** CSS lengths per breakpoint: `[phone, from 768px, from 1280px]`. */
  minHeight: [string, string?, string?];
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    // Every browser this site supports has IntersectionObserver; without it the demo stays a placeholder.
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const [phone, tablet = phone, desktop = tablet] = minHeight;
  const style = { '--h-phone': phone, '--h-tablet': tablet, '--h-desktop': desktop } as CSSProperties;

  return (
    <div
      ref={ref}
      style={style}
      className={cn('min-h-(--h-phone) md:min-h-(--h-tablet) xl:min-h-(--h-desktop)', className)}
    >
      {visible ? children : fallback}
    </div>
  );
}

/** A quiet placeholder for a demo that hasn't loaded yet. */
export function StageFallback({ label = 'Loading the editor' }: { label?: string }) {
  return (
    <div className="site-dots flex h-full min-h-[inherit] items-center justify-center p-6">
      <span className="site-label">{label}</span>
    </div>
  );
}
