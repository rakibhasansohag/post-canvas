import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** The line above a demo stage that says the editor in it is the real, live one, and what to try first. */
export function LiveNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('site-live-note', className)}>
      <span className="site-live-note-tag">
        <span className="site-live-dot" aria-hidden="true" />
        Live editor
      </span>
      <span>{children}</span>
    </p>
  );
}
