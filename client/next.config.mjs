import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

// `post-canvas` is installed as `file:../package`, a symlink to the package folder next to this one. Turbopack only
// resolves files inside its root, so the root is the repo folder that holds both. No React alias is needed: Next maps
// every `react` and `react-dom` import, the package's included, to its own copy, so only one React is bundled.
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');

// The site is a static export (`out/`) that any static host can serve. To host it under a sub-path, such as
// GitHub Pages' `/post-canvas`, set NEXT_PUBLIC_BASE_PATH when you build. NEXT_PUBLIC_SITE_URL sets the absolute URLs in
// the sitemap and the Open Graph tags.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

/** @type {import('next').NextConfig} */
const config = {
  output: 'export',
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  outputFileTracingRoot: repoRoot,
  turbopack: {
    root: repoRoot,
  },
};

export default withMDX(config);
