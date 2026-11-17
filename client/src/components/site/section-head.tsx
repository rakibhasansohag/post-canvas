import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** A section's label, heading and one or two lines. `numbered` adds the 01, 02... counter to the label. */
export function SectionHead({
  label,
  title,
  children,
  id,
  numbered,
  className,
  aside,
}: {
  label: string;
  title: ReactNode;
  children?: ReactNode;
  id: string;
  numbered?: boolean;
  className?: string;
  aside?: ReactNode;
}) {
  return (
    <div className={cn('mb-8 flex flex-col gap-6 md:mb-12 lg:flex-row lg:items-end lg:justify-between', className)}>
      <div data-reveal className="max-w-[46rem]">
        <p className="site-label mb-4" data-numbered={numbered ? '' : undefined}>
          {label}
        </p>
        <h2 id={id} className="site-h2">
          {title}
        </h2>
        {children && <div className="site-lead mt-4 max-w-[40rem]">{children}</div>}
      </div>
      {aside}
    </div>
  );
}
