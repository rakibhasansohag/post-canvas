'use client';

import { useTheme } from 'next-themes';
import type { PostCanvasTheme } from 'post-canvas';
import { useSyncExternalStore } from 'react';

const subscribe = () => () => undefined;

/**
 * The editor theme that matches the site: the site's own light or dark choice, or `auto` before it is known. The site
 * toggle can differ from the system setting, so `auto` alone would show a light editor on a dark page. The first
 * render (on the server and while hydrating) is always `auto`, so the HTML matches.
 */
export function useSiteTheme(): PostCanvasTheme {
  const { resolvedTheme } = useTheme();
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  if (!hydrated) return 'auto';
  return resolvedTheme === 'dark' ? 'dark' : resolvedTheme === 'light' ? 'light' : 'auto';
}
