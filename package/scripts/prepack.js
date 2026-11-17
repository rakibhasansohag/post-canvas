// Runs before `npm pack` and `npm publish`: copies the repo's README and LICENSE into this folder, so npm shows them,
// and stops if the package has not been built. The copies are gitignored, so the root files stay the only source.
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = join(here, '..');
const root = join(pkg, '..');

for (const file of ['README.md', 'LICENSE']) {
  copyFileSync(join(root, file), join(pkg, file));
}

for (const file of ['dist/index.js', 'dist/styles.css', 'dist/cdn/post-canvas.iife.js', 'dist/cdn/post-canvas.css']) {
  if (!existsSync(join(pkg, file))) {
    console.error(`prepack: ${file} is missing. Run "npm run build" first.`);
    process.exit(1);
  }
}
