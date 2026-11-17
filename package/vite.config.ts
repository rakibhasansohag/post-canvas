import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const root = resolve(import.meta.dirname, 'playground');

// Every playground/*.html is a page, so a new page needs no config edit.
const pages = Object.fromEntries(
  readdirSync(root)
    .filter((file) => file.endsWith('.html'))
    .map((file) => [file.replace(/\.html$/, ''), resolve(root, file)]),
);

// The port comes from the CLI (`npm run playground -- --port 5101`), and each port gets its own cache folder, so several
// playgrounds can run at once.
const portFlag = process.argv.indexOf('--port');
const port = portFlag === -1 ? 5100 : Number(process.argv[portFlag + 1]);

export default defineConfig({
  root,
  plugins: [react()],
  cacheDir: resolve(import.meta.dirname, `node_modules/.vite-${port}`),
  server: { port, strictPort: true },
  build: {
    outDir: resolve(import.meta.dirname, 'node_modules/.playground-dist'),
    emptyOutDir: true,
    rollupOptions: { input: pages },
  },
});
