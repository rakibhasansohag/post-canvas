# Post Canvas docs

The docs site and live playground for [Post Canvas](../README.md), built with Next.js 16 and Fumadocs. It builds as a
static export, so it runs on any static host.

## Run it

Build the package first, since the site imports its `dist/` output:

```bash
npm --prefix ../package ci
npm --prefix ../package run build
npm ci
npm run dev
```

The site runs on http://localhost:3100. The editor is at `/playground`, and the pages are in `content/docs/`.

## Build and host the static export

```bash
npm run build   # writes the site to out/
npm start       # serves out/ on http://localhost:3100
```

`out/` is plain HTML, CSS and JavaScript. Copy it to any static host: GitHub Pages, Cloudflare Pages, Netlify, an S3
bucket, or your own server behind nginx or Caddy. Nothing runs on the server. Search runs in the browser against an index
built at build time.

Two environment variables, read at build time, set where the site lives:

| Variable                | Default                 | Use                                                                             |
| ----------------------- | ----------------------- | ------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_BASE_PATH` | empty                   | The sub-path the site is served from, such as `/post-canvas`. No trailing slash |
| `NEXT_PUBLIC_SITE_URL`  | `http://localhost:3100` | The public origin, used in the sitemap, `robots.txt` and Open Graph tags        |

For example, for `https://example.com/post-canvas/`:

```bash
NEXT_PUBLIC_BASE_PATH=/post-canvas NEXT_PUBLIC_SITE_URL=https://example.com npm run build
```

The repo's `pages.yml` workflow does this for GitHub Pages. It stays inactive until you turn Pages on and set the
repository variable `ENABLE_PAGES` to `true`.

## How the local package is wired

- `post-canvas` is a `file:../package` dependency, so `node_modules/post-canvas` is a symlink to `../package`. Rebuild
  the package (`npm run build` there) to see changes here.
- Turbopack only resolves files inside its root, so `next.config.mjs` sets `turbopack.root` (and
  `outputFileTracingRoot`) to the repo folder that holds both `client/` and `package/`.
- No React alias is needed. Next maps every `react` and `react-dom` import, the package's included, to its own copy, so
  the build has one React and no invalid hook calls.
- The API reference tables are generated from the package's TSDoc comments at build time with `fumadocs-typescript`
  (`<TypeTable path="react/post-canvas.tsx" name="PostCanvasProps" />`, with paths relative to `package/src/`).

## Writing docs

Pages are MDX files in `content/docs/`, with a `meta.json` in each folder that sets the order. Use sentence case for
headings and plain, short sentences. Check every code sample against the real API.

## Scripts

| Script                   | What it does                        |
| ------------------------ | ----------------------------------- |
| `dev`                    | Next dev server on port 3100        |
| `build`                  | Static export into `out/`           |
| `start`                  | Serves `out/` on port 3100          |
| `lint`                   | ESLint with `eslint-config-next`    |
| `typecheck`              | `next typegen`, then `tsc --noEmit` |
| `format`, `format:check` | Prettier, with the Tailwind plugin  |

## SEO

Every page has a title and description. The site publishes `sitemap.xml`, `robots.txt`, an Open Graph image per docs
page, and `llms.txt` and `llms-full.txt` for AI tools. Each docs page is also available as Markdown at
`/llms.mdx/docs/<page>.md`.
