<h1 align="center">
  <a href="https://postcanvas.saimulislam.com">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/saimulft/post-canvas/main/.github/assets/wordmark-dark.svg" />
      <img alt="Post Canvas" src="https://raw.githubusercontent.com/saimulft/post-canvas/main/.github/assets/wordmark-light.svg" width="300" />
    </picture>
  </a>
</h1>

An open-source React editor for posts and articles, built on [Tiptap](https://tiptap.dev). It has the rich text you expect
from TinyMCE or Froala, plus a media canvas: photo galleries, video and social embeds, link cards and drag-to-reorder
blocks. Documents render to HTML or React on your server with a built-in sanitizer.

[![Post Canvas: the social preset with a formatted post, a mention, hashtags and a four-photo collage](https://raw.githubusercontent.com/saimulft/post-canvas/main/.github/assets/demo.jpg)](https://postcanvas.saimulislam.com)

[Website and live demos](https://postcanvas.saimulislam.com) · [Docs](https://postcanvas.saimulislam.com/docs/) ·
[Examples](https://postcanvas.saimulislam.com/examples/) · [Playground](https://postcanvas.saimulislam.com/playground/) ·
[npm](https://www.npmjs.com/package/post-canvas) · [Contributing](https://github.com/saimulft/post-canvas/blob/main/CONTRIBUTING.md)

## Features

**Media canvas**

- Galleries as a carousel, grid, masonry or collage. Drag to reorder, add alt text and captions, and place photos freely
  in a collage.
- Image and file uploads through your own adapter (S3, Cloudinary, your own route), with progress, retry, cancel and
  optional HEIC conversion.
- Video (YouTube and Vimeo) and social embeds (Spotify, SoundCloud, X, Instagram, TikTok, CodePen, Loom, Figma and Google
  Maps), shown as click-to-load facades. Link cards for any other page. Add your own provider.
- A `+` button, a `/` menu and a block handle to insert, move, duplicate and delete blocks.

**Rich text**

- Headings, lists, task lists, tables, quotes, code blocks with syntax highlighting, links, colours, highlights,
  mentions and hashtags from your API.
- Toolbar, selection menu, Markdown shortcuts, clean paste from Word and Google Docs, autosave and drafts.
- Four presets: `full`, `article` (title and cover), `social` (a post composer) and `comment`.
- English, German, Spanish, French, Italian and Portuguese. Light and dark themes through CSS tokens.

**Safe output**

- One schema for the editor and the server. `sanitizeDocument()` and `validateDocument()` run anywhere, with no DOM.
- `renderToHTML()` and a React Server Component `PostCanvasView`. Convert to Markdown and plain text, or import HTML from
  other editors.
- Player URLs are built from validated ids at render time and are never stored. Iframes are sandboxed.
- A vanilla build and a CDN bundle run the editor without React.

**Not yet:** real-time collaboration, comments, AI features, emoji shortcodes, right-to-left layouts, and Vue and Angular
wrappers. See the roadmap in the docs.

## Install

```bash
npm install post-canvas
```

Post Canvas needs React 18.2 or newer. It is ESM only.

## Quick start

### React

```tsx
import { PostCanvas } from 'post-canvas';
import 'post-canvas/styles.css';

export function Composer() {
  return <PostCanvas preset="social" onChange={({ json }) => console.log(json)} />;
}
```

`json` is the document as Tiptap JSON. Save it in your database, and read it back with `defaultContent`.

### Next.js (App Router)

Render the editor in a client component, and show saved posts in a Server Component.

```tsx
// app/composer.tsx
'use client';

import { PostCanvas } from 'post-canvas';
import 'post-canvas/styles.css';

export function Composer({ action }: { action: (json: unknown) => Promise<void> }) {
  return <PostCanvas preset="article" onChange={({ json }) => void action(json)} />;
}
```

```tsx
// app/posts/[id]/page.tsx
import { PostCanvasView } from 'post-canvas/render';
import 'post-canvas/styles.css';

export default async function Post({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await loadPost(id); // your data layer
  return <PostCanvasView content={post.content} />;
}
```

`PostCanvasView` sanitizes the document before it renders. Always sanitize or validate JSON that came from a browser
before you store it: use `sanitizeDocument()` or `validateDocument()` from `post-canvas/server`.

### Plain HTML

```html
<link rel="stylesheet" href="https://unpkg.com/post-canvas/dist/cdn/post-canvas.css" />
<div id="editor"></div>
<script src="https://unpkg.com/post-canvas/dist/cdn/post-canvas.iife.js"></script>
<script>
  const canvas = PostCanvas.create(document.getElementById('editor'), { preset: 'article' });
  canvas.on('change', (json) => console.log(json));
</script>
```

Uploads, mentions, link previews, autosave, theming and the other guides are in the
[docs](https://postcanvas.saimulislam.com/docs/).

## Browser support

Current versions of Chrome, Edge, Firefox and Safari, on desktop and mobile. Most testing so far is in Chromium. Safari,
Firefox and real touch devices have had less, so please report anything that looks wrong. Trackpad pinch in the collage
editor zooms the page instead of the collage (touch pinch works).

## Contributing

Issues and pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup and the checklist, and
[SECURITY.md](SECURITY.md) to report a vulnerability.

## Licence

[MIT](LICENSE). The optional HEIC conversion uses a library you install yourself ([`heic-to`](https://github.com/hoppergee/heic-to)),
which is LGPL licensed. Post Canvas does not bundle it.
