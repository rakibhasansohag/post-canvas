import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

// `post-canvas` is installed as `file:../package`, a symlink to the package folder next to this one. Turbopack only
// resolves files inside its root, so the root is the repo folder that holds both. No React alias is needed: Next maps
// every `react` and `react-dom` import, the package's included, to its own copy, so only one React is bundled.
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  outputFileTracingRoot: repoRoot,
  turbopack: {
    root: repoRoot,
  },
  async rewrites() {
    return [
      {
        source: '/docs/:path*.md',
        destination: '/llms.mdx/docs/:path*.md',
      },
      {
        source: '/docs/:path*.txt',
        destination: '/llms.mdx/docs/:path*.txt',
      },
    ];
  },
};

export default withMDX(config);
