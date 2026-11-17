import { createGetUrl } from 'fumadocs-core/source';

export const appName = 'Post Canvas';
export const appDescription =
  'An open-source React editor for posts and articles: rich text, photo galleries, video and social embeds, and safe output. Built on Tiptap.';
export const docsRoute = '/docs';
export const docsImageRoute = '/og/docs';

/** The sub-path the site is hosted under, such as `/post-canvas` on GitHub Pages. Empty at the domain root. */
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** The public origin, for the sitemap and Open Graph tags. Set `NEXT_PUBLIC_SITE_URL` when you build for a host. */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3100').replace(/\/$/, '');

export const gitConfig = {
  user: 'saimulft',
  repo: 'post-canvas',
  branch: 'main',
};

const getImageUrl = createGetUrl(docsImageRoute);

export function getPageImageUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, 'image.png'];

  return { segments, url: `${basePath}${getImageUrl(segments, page.locale)}` };
}
