'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Fades `[data-reveal]` elements up once as they scroll into view. Elements already on screen when the page loads are
 * left alone, so the server HTML shows straight away and nothing flashes. Does nothing under reduced motion.
 */
export function Reveal() {
  const pathname = usePathname();
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    const below = nodes.filter((node) => node.getBoundingClientRect().top > window.innerHeight);
    for (const node of below) node.dataset.reveal = 'pending';
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.reveal = 'shown';
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    for (const node of below) observer.observe(node);
    return () => observer.disconnect();
  }, [pathname]);
  return null;
}
