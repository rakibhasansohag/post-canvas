# Security policy

Post Canvas handles content that other people read, so we treat sanitizing and embedding as security code. Thank you for
reporting problems responsibly.

## Report a vulnerability

Please do not open a public issue for a security problem.

Use GitHub's private vulnerability reporting: open the repository's **Security** tab, choose **Report a vulnerability**,
and describe the problem. If that option is not available to you, open a public issue that says only that you have a
security report and asks for a private channel. Do not put details in it.

A useful report has:

- the version of `post-canvas` and the entry point involved (`post-canvas`, `post-canvas/render`, `post-canvas/server`,
  `post-canvas/vanilla` or the CDN bundle);
- a minimal document, HTML or URL that shows the problem;
- what you expected, and what happened.

We aim to reply within a few days, to confirm or explain, and to fix confirmed problems in a patch release. We will credit
you in the release notes if you want that. This is a small open-source project run by volunteers, so we cannot promise
fixed dates.

## Supported versions

Only the latest published minor version gets security fixes. While the version is below 1.0, that means the newest 0.x
release. Please upgrade before you report, and say if the problem is already fixed in the latest version.

## What is in scope

- **The sanitizer.** `sanitizeDocument`, `validateDocument`, `renderToHTML`, `PostCanvasView` and `fromHTML`: a document or
  HTML that produces script execution, an unsafe URL scheme (`javascript:`, `data:`, `vbscript:`, `file:`), unsafe
  attributes or styles, or unbounded work (a memory or CPU denial of service).
- **Embeds.** An iframe that loads a host outside the built-in provider list, a stored iframe URL being honoured, a
  sandbox or `allow` value that is too wide, or a lookalike host that matches a provider.
- **The resolvers.** `createEmbedResolver` and `createLinkPreviewResolver`: server-side request forgery, a way to reach a
  private or link-local address, an open redirect to one, or unbounded response sizes.
- **Paste handling.** Pasted HTML that gets past the cleanup into the document.
- **Upload handling in the editor.** A file that is accepted but should be refused, such as an SVG disguised as an image.

## What is out of scope

- Problems that need an attacker who already controls your server, your build or your `adapters`.
- Content you store or render with `sanitize: false`. Turning the sanitizer off is the app's decision.
- An injected `fetch` in the link resolver. A custom `fetch` cannot be protected against DNS rebinding by the library, and
  the docs say so.
- Third-party content that loads after a reader clicks a facade (the player's own site), and thumbnails that load from a
  provider's image host.
- Findings from automated scanners with no demonstrated impact, missing security headers on the demo site, and denial of
  service through huge inputs on a path with no documented limit.
- Dependencies' own bugs. Report those to the dependency. We will update when a fix is out.

## For app developers

The library only helps if the server runs it. Always run `sanitizeDocument()` (or check `validateDocument()`) on JSON that
came from a client before you store it or show it to other people. The [security
page](https://github.com/saimulft/post-canvas/blob/main/client/content/docs/concepts/security.mdx) in the docs explains
the model.
