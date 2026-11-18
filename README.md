<h1 align="center">
  <a href="https://postcanvas.saimulislam.com">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/saimulft/post-canvas/main/.github/assets/wordmark-dark.svg" />
      <img alt="Post Canvas" src="https://raw.githubusercontent.com/saimulft/post-canvas/main/.github/assets/wordmark-light.svg" width="300" />
    </picture>
  </a>
</h1>

<p align="center">
  An open-source <b>React rich text editor</b> for posts and articles, built on <a href="https://tiptap.dev">Tiptap</a>.
  It has the WYSIWYG tools you expect from TinyMCE or Froala, plus a media canvas: image galleries, collages, YouTube and
  social embeds, and link cards. Documents render to sanitized HTML on your server. MIT licensed.
</p>

<p align="center">
  <a href="https://postcanvas.saimulislam.com">Website and live demos</a> ·
  <a href="https://postcanvas.saimulislam.com/docs/">Docs</a> ·
  <a href="https://postcanvas.saimulislam.com/docs/features/">Feature tour</a> ·
  <a href="https://postcanvas.saimulislam.com/playground/">Playground</a> ·
  <a href="https://postcanvas.saimulislam.com/examples/">Examples</a> ·
  <a href="https://www.npmjs.com/package/post-canvas">npm</a>
</p>

<!-- README-DEMO-LOOP: the coordinator puts chat H's demo loop (GIF or animated WebP, about 800 px wide) here. -->

<a href="https://postcanvas.saimulislam.com">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://postcanvas.saimulislam.com/features/editor-collage-dark.webp" />
    <img alt="The Post Canvas editor with the social preset: a short post with a mention, two hashtags and a four-photo collage" src="https://postcanvas.saimulislam.com/features/editor-collage.webp" width="880" />
  </picture>
</a>

```bash
npm install post-canvas
```

## Features

- Rich text with a toolbar, a selection menu, a `/` menu, Markdown shortcuts, mentions and hashtags.
- Image galleries in four layouts (carousel, grid, masonry and collage), with a collage editor.
- YouTube, Vimeo and social embeds that load on click by default, and link cards for any other page.
- Presets for a social post, an article with a title and cover, and a comment box.
- Sanitized HTML, a React Server Component and Markdown output, from the same schema as the editor.

Every image below is the real editor. Click **Try it live** under any of them to use it in your browser.

## Rich text: the WYSIWYG tools people already know

Headings, bold, italic, underline, strike, code, links, colours, highlights, alignment, lists, task lists, quotes,
tables and code blocks with syntax highlighting. Select text for a small menu, or type `/` on an empty line to insert
any block. Paste from Word or Google Docs and the structure stays while their styling goes.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://postcanvas.saimulislam.com/features/rich-text-dark.webp" />
  <img alt="The full toolbar above a formatted note with a heading, bold, italic, a highlight, a mention, a link, a task list and a quote" src="https://postcanvas.saimulislam.com/features/rich-text.webp" width="880" />
</picture>

<table>
  <tr>
    <td width="50%">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="https://postcanvas.saimulislam.com/features/selection-menu-dark.webp" />
        <img alt="The selection menu above selected text, with bold, italic, underline, strike, code, link, colour and Turn into" src="https://postcanvas.saimulislam.com/features/selection-menu.webp" width="430" />
      </picture>
      <br />The selection menu
    </td>
    <td width="50%">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="https://postcanvas.saimulislam.com/features/slash-menu-dark.webp" />
        <img alt="The slash menu open under a typed slash, listing Text and four heading levels" src="https://postcanvas.saimulislam.com/features/slash-menu.webp" width="430" />
      </picture>
      <br />The <code>/</code> menu
    </td>
  </tr>
</table>

[Try it live](https://postcanvas.saimulislam.com/#rich-text)

### Mentions and hashtags from your own API

Type `@` or `#` and pick from your people and tags. Your adapter returns the matches, and the editor stores each one
with its id.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://postcanvas.saimulislam.com/features/mentions-dark.webp" />
  <img alt="The mention list open after typing @, showing people with their initials and roles" src="https://postcanvas.saimulislam.com/features/mentions.webp" width="880" />
</picture>

[Try it live](https://postcanvas.saimulislam.com/#rich-text) ·
[Mentions guide](https://postcanvas.saimulislam.com/docs/guides/mentions-and-hashtags/)

## Media canvas: image galleries, collages and embeds

### Image galleries: carousel, grid, masonry and collage

One gallery block holds several photos and shows them in four layouts. Writers switch layouts from the gallery's
toolbar, drag to reorder, and add alt text and a caption. Uploads go through your own adapter (S3, Cloudinary or your
own route), with progress, retry and cancel.

<table>
  <tr>
    <td width="50%">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="https://postcanvas.saimulislam.com/features/gallery-carousel-dark.webp" />
        <img alt="A gallery in the carousel layout: one large coast photo with the next photo peeking in from the side" src="https://postcanvas.saimulislam.com/features/gallery-carousel.webp" width="430" />
      </picture>
      <br />Carousel
    </td>
    <td width="50%">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="https://postcanvas.saimulislam.com/features/gallery-grid-dark.webp" />
        <img alt="A gallery in the grid layout: six coast photos in two rows of even square tiles" src="https://postcanvas.saimulislam.com/features/gallery-grid.webp" width="430" />
      </picture>
      <br />Grid
    </td>
  </tr>
  <tr>
    <td width="50%">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="https://postcanvas.saimulislam.com/features/gallery-masonry-dark.webp" />
        <img alt="A gallery in the masonry layout: five photos in three columns, each at its own proportions" src="https://postcanvas.saimulislam.com/features/gallery-masonry.webp" width="430" />
      </picture>
      <br />Masonry
    </td>
    <td width="50%">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="https://postcanvas.saimulislam.com/features/gallery-collage-dark.webp" />
        <img alt="A gallery in the collage layout: four photos tilted and layered over a clifftop background photo" src="https://postcanvas.saimulislam.com/features/gallery-collage.webp" width="430" />
      </picture>
      <br />Collage
    </td>
  </tr>
</table>

### Arrange a collage

The first photo is the background. **Arrange the collage** opens an editor where you drag each photo into place,
resize it and turn it, with a pinch on touch screens.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://postcanvas.saimulislam.com/features/collage-arrange-dark.webp" />
  <img alt="The collage editor open, with a hint to drag a photo to place it and to pinch or use its handles to resize and turn it" src="https://postcanvas.saimulislam.com/features/collage-arrange.webp" width="880" />
</picture>

[Try it live](https://postcanvas.saimulislam.com/#galleries) ·
[Galleries guide](https://postcanvas.saimulislam.com/docs/guides/galleries/)

### YouTube, Vimeo and social embeds, plus link cards

Paste a link and the editor picks the block. YouTube and Vimeo become players. Spotify, SoundCloud, X, Instagram,
TikTok, CodePen, Loom, Figma and Google Maps become embeds, and you can add your own provider. Any other page becomes a
link card through your link preview adapter. By default, players and embeds load only after a click.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://postcanvas.saimulislam.com/features/embed-youtube-dark.webp" />
  <img alt="A pasted YouTube link shown as a player with a thumbnail, a title, a description and a Watch on YouTube link" src="https://postcanvas.saimulislam.com/features/embed-youtube.webp" width="880" />
</picture>

<table>
  <tr>
    <td width="50%">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="https://postcanvas.saimulislam.com/features/embed-social-dark.webp" />
        <img alt="A pasted X post shown as a click-to-load placeholder that says it loads content from X, which may set cookies" src="https://postcanvas.saimulislam.com/features/embed-social.webp" width="430" />
      </picture>
      <br />A post from X, before the click
    </td>
    <td width="50%">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="https://postcanvas.saimulislam.com/features/link-card-dark.webp" />
        <img alt="A pasted link shown as a card with the site name, the page title, a description and a preview image" src="https://postcanvas.saimulislam.com/features/link-card.webp" width="430" />
      </picture>
      <br />A link card
    </td>
  </tr>
</table>

[Try it live](https://postcanvas.saimulislam.com/#embeds) ·
[Embeds guide](https://postcanvas.saimulislam.com/docs/guides/embeds-and-link-previews/)

## Presets for a social post, an article and a comment box

`social` is a post composer, `article` adds a title and a cover, `comment` is a small reply box, and `full` turns on
everything. Change any single feature on top of a preset.

<table>
  <tr>
    <td width="50%">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="https://postcanvas.saimulislam.com/features/preset-social-dark.webp" />
        <img alt="The social preset: a short post with a hashtag and one photo, and a status bar that reads Photo post" src="https://postcanvas.saimulislam.com/features/preset-social.webp" width="430" />
      </picture>
      <br /><code>preset="social"</code>
    </td>
    <td width="50%">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="https://postcanvas.saimulislam.com/features/preset-article-dark.webp" />
        <img alt="The article preset: a cover image, a large title, body text and a heading" src="https://postcanvas.saimulislam.com/features/preset-article.webp" width="430" />
      </picture>
      <br /><code>preset="article"</code>
    </td>
  </tr>
</table>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://postcanvas.saimulislam.com/features/preset-comment-dark.webp" />
  <img alt="The comment preset: a small one-line box with a reply that mentions another person" src="https://postcanvas.saimulislam.com/features/preset-comment.webp" width="640" />
</picture>

[Try it live](https://postcanvas.saimulislam.com/#presets) · [Examples](https://postcanvas.saimulislam.com/examples/)

## Safe output: sanitized HTML and server rendering

The editor saves Tiptap JSON. `sanitizeDocument()` and `validateDocument()` check it on your server with the same
schema as the editor, and need no DOM. `renderToHTML()` and the React Server Component `PostCanvasView` show it without
the editor, and it converts to Markdown and plain text. Player URLs are built from validated ids at render time, and
iframes are sandboxed.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://postcanvas.saimulislam.com/features/output-html-dark.webp" />
  <img alt="A document in the editor next to its HTML output from renderToHTML, with JSON, Markdown, Text and View tabs" src="https://postcanvas.saimulislam.com/features/output-html.webp" width="880" />
</picture>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://postcanvas.saimulislam.com/features/sanitizer-dark.webp" />
  <img alt="A hostile document with a javascript: link, an unsafe photo, an iframe and a script in a video id, next to what sanitizeDocument removed and the safe HTML it renders" src="https://postcanvas.saimulislam.com/features/sanitizer.webp" width="880" />
</picture>

[Try it live](https://postcanvas.saimulislam.com/#output) ·
[Security model](https://postcanvas.saimulislam.com/docs/concepts/security/)

## Phone width, light and dark themes, six languages

The editor works with touch at phone width and follows light, dark or auto themes through CSS tokens. It ships in
English, German, Spanish, French, Italian and Portuguese. A vanilla build and a CDN bundle run it without React.

<table>
  <tr>
    <td width="34%">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="https://postcanvas.saimulislam.com/features/mobile-dark.webp" />
        <img alt="The editor at phone width with the social preset, a mention, hashtags and a collage" src="https://postcanvas.saimulislam.com/features/mobile.webp" width="280" />
      </picture>
    </td>
    <td width="66%">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="https://postcanvas.saimulislam.com/features/playground-dark.webp" />
        <img alt="The playground: switches for preset, theme, language and features beside a live editor with a sample post" src="https://postcanvas.saimulislam.com/features/playground.webp" width="560" />
      </picture>
      <br />The <a href="https://postcanvas.saimulislam.com/playground/">playground</a>: switch every option and read the output
    </td>
  </tr>
</table>

**Also included:** a `+` button, a `/` menu and a block handle to insert, move, duplicate and delete blocks; image and
file uploads with optional HEIC conversion; autosave and drafts; and HTML import from other editors.

**Not yet:** real-time collaboration, comments, AI features, emoji shortcodes, right-to-left layouts, and Vue and Angular
wrappers. See the [roadmap](https://postcanvas.saimulislam.com/docs/roadmap/).

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

### Plain HTML and CDN (no React)

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

## Coming from TinyMCE, Froala or Quill?

TinyMCE and Froala store a post as an HTML string, and Quill can export one. Post Canvas stores JSON. `fromHTML()` converts each old post once
and reports what it could not keep, so you can check the result before you save it. The
[migration guide](https://postcanvas.saimulislam.com/docs/guides/migrating-from-tinymce-froala/) covers the conversion
and maps TinyMCE and Froala options to Post Canvas features.

## Built on Tiptap

Post Canvas is built on Tiptap 3 and ProseMirror, and saves Tiptap JSON. `post-canvas/extensions` exports the Tiptap
extensions it is made of, so you can build your own editor from them or add your own nodes next to the built-in ones.
See the [extensions reference](https://postcanvas.saimulislam.com/docs/reference/extensions/).

## Browser support

Current versions of Chrome, Edge, Firefox and Safari, on desktop and mobile. Most testing so far is in Chromium. Safari,
Firefox and real touch devices have had less, so please report anything that looks wrong. Trackpad pinch in the collage
editor zooms the page instead of the collage (touch pinch works).

## Contributing

Issues and pull requests are welcome. Read
[CONTRIBUTING.md](https://github.com/saimulft/post-canvas/blob/main/CONTRIBUTING.md) for setup and the checklist, and
[SECURITY.md](https://github.com/saimulft/post-canvas/blob/main/SECURITY.md) to report a vulnerability.

## Licence

[MIT](https://github.com/saimulft/post-canvas/blob/main/LICENSE), free for commercial use. The optional HEIC conversion uses a library you
install yourself ([`heic-to`](https://github.com/hoppergee/heic-to)), which is LGPL licensed. Post Canvas does not
bundle it.
