# Post Canvas docs

The docs site and live playground for [Post Canvas](../README.md), built with Next.js 16 and Fumadocs.

## Run it

Build the package first, since the site imports its `dist/` output:

```bash
npm --prefix ../package ci
npm --prefix ../package run build
npm ci
npm run dev
```

The site runs on http://localhost:3100, and the editor is at `/playground`.

## How the local package is wired

- `post-canvas` is a `file:../package` dependency, so `node_modules/post-canvas` is a symlink to `../package`. Rebuild
  the package (`npm run build` there) to see changes here.
- Turbopack only resolves files inside its root, so `next.config.mjs` sets `turbopack.root` (and
  `outputFileTracingRoot`) to the repo folder that holds both `client/` and `package/`.
- No React alias is needed. Next maps every `react` and `react-dom` import, the package's included, to its own copy, so
  the build has one React and no invalid hook calls. The packed-tarball setup isn't used, because its integrity hash
  would change on every package build and break `npm ci`.

## Scripts

| Script                   | What it does                                  |
| ------------------------ | --------------------------------------------- |
| `dev`                    | Next dev server on port 3100                  |
| `build`, `start`         | Production build, and serving it on port 3100 |
| `lint`                   | ESLint with `eslint-config-next`              |
| `typecheck`              | `next typegen`, then `tsc --noEmit`           |
| `format`, `format:check` | Prettier, with the Tailwind plugin            |
