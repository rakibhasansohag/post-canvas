# Contributing to Post Canvas

Thanks for helping. This page covers how to set up the repo, what the scripts do, where things live, and what a good
pull request looks like. Please read the [Code of Conduct](CODE_OF_CONDUCT.md) first.

For a security problem, do not open a public issue. Follow [SECURITY.md](SECURITY.md).

## What is in the repo

| Folder     | What it is                                                                |
| ---------- | ------------------------------------------------------------------------- |
| `package/` | The npm package `post-canvas`: source, tests, build and a Vite playground |
| `client/`  | The docs site and live playground, built with Next.js 16 and Fumadocs     |
| `.github/` | Workflows, issue templates and the pull request template                  |

`package/` and `client/` are separate projects. Each has its own `package.json`, lockfile and `node_modules`. There is no
root `package.json` and no workspaces, so run `npm` commands inside the folder you are working in.

## Set up

You need Node 20.19 or newer (the CI runs 22 and 24) and npm.

```bash
git clone https://github.com/saimulft/post-canvas.git
cd post-canvas/package
npm ci
npm run build
cd ../client
npm ci
```

Build the package before you start the docs site. The site imports the package's `dist/` folder through a
`file:../package` dependency, so rebuild the package to see your changes there.

## Scripts

Run these in `package/`:

| Script                  | What it does                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `npm run playground`    | Vite playground (several pages, one per area) with fake adapters. Add `-- --port N`. |
| `npm run lint`          | ESLint, then ls-lint for file names                                                  |
| `npm run typecheck`     | TypeScript in strict mode                                                            |
| `npm test`              | Vitest                                                                               |
| `npm run build`         | The ESM library, the CSS bundle and the CDN bundle, into `dist/`                     |
| `npm run check:package` | publint and Are the Types Wrong against the packed tarball. Build first              |
| `npm run size`          | Bundle size budgets from `.size-limit.json`. Build first                             |
| `npm run changeset`     | Describe a change for the changelog                                                  |

Run these in `client/`:

| Script              | What it does                        |
| ------------------- | ----------------------------------- |
| `npm run dev`       | Docs site on http://localhost:3100  |
| `npm run build`     | Static export into `client/out/`    |
| `npm start`         | Serves `client/out/` on port 3100   |
| `npm run lint`      | ESLint                              |
| `npm run typecheck` | `next typegen`, then `tsc --noEmit` |

## File layout in `package/src`

```
core/        types, features, i18n, URL safety, the core extension, shared React pieces
text/        text nodes and marks, presets, paste cleanup, autosave, block commands
ui/          toolbar, menus, block handle, status bar, fields
media/       image, gallery and file nodes, uploads, the gallery manager and the collage editor
embeds/      video, embed and link card nodes, providers and their views
output/      sanitizer, renderToHTML, PostCanvasView, Markdown, plain text, fromHTML
server/      validateDocument and the embed and link preview resolvers
locales/     en, de, es, fr, it, pt
styles/      plain CSS, one file per area, with the tokens in tokens.css
```

Rules the code follows:

- **File names** are lowercase kebab-case, `.tsx` included. ls-lint checks this.
- **Each area has two extension lists.** `schema.ts` is render-safe: no React, no DOM, no node views. `kit.ts` extends the
  same nodes with node views, commands and shortcuts. The editor schema and the render schema must stay identical for the
  same features.
- **URLs go through `core/url.ts`.** Never put a stored string into an `href`, `src` or `style` without it.
- **Strings go through `t()`** and exist in all six languages.
- **CSS** is plain, uses the `pc-` prefix and only the tokens from `tokens.css`. It must look right in light and dark.
- **Accessibility** is part of done: keyboard access, visible focus, ARIA roles, 44 px touch targets on coarse pointers
  and `prefers-reduced-motion`.
- **Types** are strict, with no `any` in public types, and every public export has a TSDoc comment. The docs site builds
  the API reference tables from them.

## Common jobs

### Add an embed provider

Providers live in `package/src/embeds/providers/built-in.ts`. A provider says which URLs it matches, extracts validated
ids, and builds the iframe from them. It never stores or accepts an iframe URL from a document. Look at an existing
provider, add yours to the built-in list, and add cases to `providers.test.ts`: URLs that must match, lookalike hosts
that must not, and bad ids. Then add the provider to the list in the docs guide
(`client/content/docs/guides/embeds-and-link-previews.mdx`).

### Add a language

1. Copy `package/src/locales/en/` to `package/src/locales/<code>/`.
2. Translate the five JSON files (`core`, `text`, `ui`, `media`, `embeds`). Keep the keys and the `{placeholders}`.
3. Export it from `index.ts` like the others, and add it to the `locales` map in `src/vanilla.ts`.
4. Add the code to the language list in the docs guide and in the playground.

### Fix a bug

Reproduce it first, ideally in a failing test or on a playground page. Fix it in the shared code, not in one caller.
Security-relevant code (the sanitizer, URL checks, paste cleanup, embed providers and the resolvers) needs a test for the
risky path.

## Changesets

Every user-facing change needs a changeset. In `package/`, run:

```bash
npm run changeset
```

Pick `patch`, `minor` or `major`, and write one or two plain sentences about what changed for users. Commit the generated
file in `package/.changeset/` with your pull request. Docs-only and test-only changes do not need one.

## Pull request checklist

- [ ] `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` pass in `package/`
- [ ] `npm run lint`, `npm run typecheck` and `npm run build` pass in `client/` if you touched the docs site
- [ ] New or changed behaviour has a test where the risk is real (security, parsing, data loss)
- [ ] New strings exist in all six languages
- [ ] New public exports have TSDoc, and the docs pages are updated
- [ ] A changeset is included for user-facing changes
- [ ] You checked the change in a browser at 390 px and 1440 px wide, in light and dark

Keep pull requests small and focused. Say what changed and why. If the change is large, open an issue first so we can
agree on the shape.

## Maintainers

These steps are for whoever publishes releases. The pipeline is in `.github/workflows/release.yml`.

### How a release works

1. Contributors add changesets with their pull requests.
2. On every push to `main`, the Release workflow runs the checks and the Changesets action. It opens or updates a pull
   request named "Version packages" that bumps `package/package.json` and writes `package/CHANGELOG.md`.
3. Merging that pull request runs the workflow again. It builds, then publishes to npm from `package/` with provenance.

### One-time setup

1. **Allow the workflow to open pull requests.** On GitHub: Settings, Actions, General, Workflow permissions, tick "Allow
   GitHub Actions to create and approve pull requests".
2. **npm publishing** uses trusted publishing, so there is no npm token and no secret:
   - A trusted publisher can only be added to a package that already exists, so a new package's first version is
     published once by hand (`npm publish --access public` from `package/`, after `npm run build`).
   - The package's Settings, Trusted Publisher: GitHub Actions, owner `saimulft`, repository `post-canvas`, workflow
     file `release.yml`, with "Allow npm publish" ticked, so merging the "Version packages" pull request publishes
     directly. Without that tick, npm stages each version until a maintainer approves it on npmjs.com.
   - Don't add an `NPM_TOKEN` secret: the release workflow doesn't read one.

3. **First version.** `package/package.json` starts at `0.0.0` and the repo has one changeset, so the first "Version
   packages" pull request produces `0.1.0`.
4. **The website.** The site at https://postcanvas.saimulislam.com is a Cloudflare Pages project connected to this
   repository. Cloudflare builds `main` on every push and gives each pull request a preview URL; nothing in
   `.github/workflows` deploys it. The build settings are in `client/README.md`. The static export in `client/out/` also
   works on any other static host.
   - The domain is a custom domain on the Pages project. Its DNS record, a proxied CNAME from `postcanvas` to
     `post-canvas.pages.dev`, is in the `saimulislam.com` zone, which lives in a different Cloudflare account.
   - A Bulk Redirect in the project's account sends `post-canvas.pages.dev` to the custom domain with a 301, keeping the
     path and query. Preview URLs are not redirected.

### Check a release by hand

```bash
cd package
npm run build
npm run check:package
npm run size
npm pack --dry-run
```

`npm pack` runs the `prepack` script, which copies the root `README.md` and `LICENSE` into `package/`. Those copies are
gitignored.

## Licence

By contributing, you agree that your contributions are licensed under the [MIT licence](LICENSE).
