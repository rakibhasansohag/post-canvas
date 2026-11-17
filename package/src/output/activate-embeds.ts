// Turns the static facades from `renderToHTML()` into players on click, for pages without React. Browser only; it
// touches nothing until it is called. The player is rebuilt from the figure's canonical URL through the provider
// registry, so markup from anywhere else on the page can't choose an iframe URL, `allow` list or sandbox.
import { matchEmbedUrl, parseVideoUrl, videoFrame, withAutoplay } from '../embeds/providers/index';
import type { EmbedFrame } from '../embeds/providers/types';
import { checkedFrame } from '../embeds/render-spec';

const ready = new WeakSet<EventTarget>();

/** The player for a facade's figure, rebuilt from its `data-url`, or `null` when nothing matches. */
function playerFor(figure: Element): { frame: EmbedFrame; autoplay: boolean } | null {
  const url = figure.getAttribute('data-url') ?? '';
  const provider = figure.getAttribute('data-provider');
  if (figure.hasAttribute('data-pc-video')) {
    const video = parseVideoUrl(url);
    const frame = video && video.provider === provider ? checkedFrame(videoFrame(video)) : null;
    return frame ? { frame, autoplay: true } : null;
  }
  const match = provider ? matchEmbedUrl(url, [provider]) : null;
  const frame = match ? checkedFrame(match.provider.frame(match.ref)) : null;
  return frame ? { frame, autoplay: false } : null;
}

/**
 * Makes every video and embed facade under `root` load its player when clicked, instead of following the link to the
 * provider. Call it once after inserting `renderToHTML()` output; facades added later under the same root work too.
 * Custom providers must be registered with `registerEmbedProvider()` on the page (it's in `post-canvas/render`,
 * `post-canvas/vanilla` and the CDN global). Returns a function that stops listening.
 *
 * @example
 * ```ts
 * import { activateEmbeds } from 'post-canvas/vanilla';
 * container.innerHTML = html; // from renderToHTML() on your server
 * activateEmbeds(container);
 * ```
 */
export function activateEmbeds(root: ParentNode & EventTarget = document): () => void {
  if (ready.has(root)) return () => undefined;
  const onClick = (event: Event) => {
    const target = event.target instanceof Element ? event.target : null;
    const facade = target?.closest('a.pc-embed-facade');
    const frameElement = facade?.parentElement;
    const figure = frameElement?.closest('figure[data-pc-video], figure[data-pc-embed]');
    if (!facade || !frameElement?.classList.contains('pc-embed-frame') || !figure) return;
    if (event instanceof MouseEvent && (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0)) return;
    const player = playerFor(figure);
    if (!player?.frame.src.startsWith('https://')) return;
    event.preventDefault();
    const iframe = frameElement.ownerDocument.createElement('iframe');
    iframe.src = player.autoplay ? withAutoplay(player.frame.src) : player.frame.src;
    iframe.title = frameElement.getAttribute('data-pc-player-title') ?? player.frame.title;
    iframe.setAttribute('allow', player.frame.allow);
    iframe.setAttribute('sandbox', player.frame.sandbox);
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    iframe.allowFullscreen = true;
    facade.replaceWith(iframe);
    iframe.focus();
  };
  root.addEventListener('click', onClick);
  ready.add(root);
  return () => {
    root.removeEventListener('click', onClick);
    ready.delete(root);
  };
}
