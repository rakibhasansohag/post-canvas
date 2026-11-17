import { resolve } from 'node:path';
import { defineConfig } from 'tsdown';

// Rolldown warns about every "use client". The unbundled build keeps each one at the top of its own file, and the CDN
// bundle has no server/client split, so the warning is noise here.
const suppressWarnings = [/MODULE_LEVEL_DIRECTIVE/, /module level directive/];

// --- chat C: CDN code languages ---
// The CDN bundle is one file, so every dynamic import is inlined. Swap the code block languages for a small set there;
// the npm build keeps all of them, loaded lazily.
const slimLanguages = {
  name: 'post-canvas-slim-code-languages',
  resolveId(source: string, importer: string | undefined) {
    if (
      source === './code-languages' &&
      /\/src\/text\/code-(?:highlight|lowlight)\.ts$/.test(importer?.replace(/\\/g, '/') ?? '')
    ) {
      return resolve(import.meta.dirname, 'src/text/code-languages-slim.ts');
    }
    return null;
  },
};
// --- end chat C ---

export default defineConfig([
  // The npm package: ESM, unbundled (one output file per source file, so each file's "use client" survives), with types.
  {
    entry: [
      'src/index.ts',
      'src/extensions.ts',
      'src/render.ts',
      'src/server.ts',
      'src/vanilla.ts',
      'src/locales/*/index.ts',
    ],
    format: 'esm',
    platform: 'neutral',
    unbundle: true,
    fixedExtension: false,
    dts: true,
    clean: true,
    outDir: 'dist',
    suppressWarnings,
  },
  // The CDN bundle: one IIFE with React and everything else inside, exposed as the global `PostCanvas`.
  {
    entry: { 'post-canvas': 'src/vanilla.ts' },
    format: 'iife',
    globalName: 'PostCanvas',
    platform: 'browser',
    deps: { alwaysBundle: [/.*/], onlyBundle: false },
    minify: true,
    dts: false,
    clean: false,
    outDir: 'dist/cdn',
    plugins: [slimLanguages],
    suppressWarnings,
    define: { 'process.env.NODE_ENV': '"production"' },
  },
]);
