// Bundles src/styles/index.css (and its @imports) into dist/styles.css for npm and dist/cdn/post-canvas.css for the CDN.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { bundle } from 'lightningcss';

const root = resolve(import.meta.dirname, '..');
const targets = { chrome: 111 << 16, firefox: 113 << 16, safari: (16 << 16) | (4 << 8) };

for (const [file, minify] of [
  ['dist/styles.css', false],
  ['dist/cdn/post-canvas.css', true],
]) {
  const { code } = bundle({ filename: resolve(root, 'src/styles/index.css'), minify, targets });
  const out = resolve(root, file);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, code);
  console.log(`css: ${file} (${code.length} bytes)`);
}
