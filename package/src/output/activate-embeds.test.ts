// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { activateEmbeds } from './activate-embeds';
import { renderToHTML } from './html';

const click = (element: Element) => element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));

describe('activateEmbeds', () => {
  it('rebuilds the player from the provider, never from DOM attributes', () => {
    const root = document.createElement('div');
    root.innerHTML = renderToHTML({
      type: 'doc',
      content: [{ type: 'video', attrs: { provider: 'youtube', videoId: 'dQw4w9WgXcQ', title: 'T' } }],
    });
    // Hostile markup from elsewhere on the page, shaped like a facade.
    root.insertAdjacentHTML(
      'beforeend',
      '<figure data-pc-embed data-provider="x" data-url="https://evil.example/"><div class="pc-embed-frame" data-pc-player="https://evil.example/" data-pc-sandbox="allow-top-navigation" data-pc-allow="camera"><a class="pc-embed-facade" href="#">Play</a></div></figure>',
    );
    document.body.append(root);
    const stop = activateEmbeds(root);
    const [good, bad] = Array.from(root.querySelectorAll('a.pc-embed-facade'));
    click(good!);
    click(bad!);
    const frames = Array.from(root.querySelectorAll('iframe'));
    expect(frames).toHaveLength(1);
    expect(frames[0]!.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&playsinline=1&autoplay=1');
    expect(frames[0]!.getAttribute('sandbox')).not.toContain('top-navigation');
    stop();
  });
});
