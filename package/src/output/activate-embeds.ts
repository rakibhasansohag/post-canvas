// Turns the static facades from `renderToHTML()` into players on click, for pages without React. Browser only; it
// touches nothing until it is called.

const ready = new WeakSet<Element>();

/**
 * Makes every video and embed facade under `root` load its player when clicked, instead of following the link to the
 * provider. Call it once after inserting `renderToHTML()` output; elements added later under the same root work too.
 * Returns a function that stops listening.
 *
 * @example
 * ```ts
 * import { activateEmbeds } from 'post-canvas/vanilla';
 * container.innerHTML = html; // from renderToHTML() on your server
 * activateEmbeds(container);
 * ```
 */
export function activateEmbeds(root: ParentNode & EventTarget = document): () => void {
  if (root instanceof Element && ready.has(root)) return () => undefined;
  const onClick = (event: Event) => {
    const target = event.target instanceof Element ? event.target : null;
    const facade = target?.closest('a.pc-embed-facade');
    const frame = facade?.parentElement;
    if (!facade || !frame?.matches('.pc-embed-frame[data-pc-player]')) return;
    if (event instanceof MouseEvent && (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0)) return;
    const src = frame.getAttribute('data-pc-player') ?? '';
    let url: URL;
    try {
      url = new URL(src);
    } catch {
      return;
    }
    if (url.protocol !== 'https:') return;
    event.preventDefault();
    const iframe = frame.ownerDocument.createElement('iframe');
    iframe.src = url.href;
    iframe.title = frame.getAttribute('data-pc-player-title') ?? '';
    iframe.setAttribute('allow', frame.getAttribute('data-pc-allow') ?? '');
    iframe.setAttribute('sandbox', frame.getAttribute('data-pc-sandbox') ?? 'allow-scripts allow-same-origin');
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    iframe.allowFullscreen = true;
    facade.replaceWith(iframe);
    iframe.focus();
  };
  root.addEventListener('click', onClick);
  if (root instanceof Element) ready.add(root);
  return () => {
    root.removeEventListener('click', onClick);
    if (root instanceof Element) ready.delete(root);
  };
}
