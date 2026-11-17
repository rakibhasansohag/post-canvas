import { ArrowRight, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface ButtonLinkProps {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  icon?: LucideIcon;
  className?: string;
}

/** A 48px button link with an icon tile. External links open in the same tab. */
export function ButtonLink({
  href,
  children,
  variant = 'primary',
  icon: Icon = ArrowRight,
  className,
}: ButtonLinkProps) {
  const classes = cn('site-btn', variant === 'primary' ? 'site-btn-primary' : 'site-btn-secondary', className);
  const inner = (
    <>
      <span>{children}</span>
      <span className="site-btn-tile">
        <Icon size={18} strokeWidth={2.2} aria-hidden="true" />
      </span>
    </>
  );
  if (/^https?:/.test(href)) {
    return (
      <a href={href} className={classes}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {inner}
    </Link>
  );
}
