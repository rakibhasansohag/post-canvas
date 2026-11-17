import type { SVGProps } from 'react';
import { cn } from '@/lib/cn';

/** The Post Canvas mark: a line of text above a photo, on an accent tile. */
export function LogoMark({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn('size-7 shrink-0', className)} {...props}>
      <rect width="32" height="32" rx="8" fill="var(--site-accent)" />
      <rect x="8" y="7.5" width="12" height="3" rx="1.5" fill="var(--site-accent-text)" />
      <rect x="8" y="13.5" width="16" height="11" rx="2.5" fill="var(--site-accent-text)" />
      <circle cx="20" cy="17" r="1.6" fill="var(--site-accent)" />
      <path
        d="M8 22.2 12.6 18l3.4 3 2.4-1.9 5.6 4.2V22a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 8 22Z"
        fill="var(--site-accent)"
      />
    </svg>
  );
}

/** The mark and the name, as used in the navigation and the footer. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="font-display text-[1.2rem] leading-none font-bold tracking-[-0.02em]">Post Canvas</span>
    </span>
  );
}
