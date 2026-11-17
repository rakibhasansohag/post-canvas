// The read-only `embed` view. Server-safe, like `VideoView`.
import type { ViewProps } from '../../core/types';
import { embedRender, externalRel } from '../render-spec';
import { EmbedPlayer } from './embed-player';

/** A third-party embed behind a click-to-load placeholder, with an "Open on…" link. */
export function EmbedView({ node, t }: ViewProps) {
  const embed = embedRender(node.attrs);
  if (!embed) return null;
  const provider = embed.provider.label;
  return (
    <figure className={`pc-embed pc-embed-${embed.provider.name}`} data-provider={embed.provider.name}>
      <EmbedPlayer
        src={embed.frame.src}
        playerTitle={embed.title || t('embeds.embed.frameTitle', { provider })}
        allow={embed.frame.allow}
        sandbox={embed.frame.sandbox}
        aspectRatio={embed.frame.aspectRatio}
        height={embed.frame.height}
        label={t('embeds.embed.load', { provider })}
        badge={provider}
        thumbnail={embed.thumbnail}
        note={t('embeds.embed.consent', { provider })}
      />
      <figcaption className="pc-embed-caption">
        {embed.title && <span className="pc-embed-title">{embed.title}</span>}
        <a className="pc-embed-source" href={embed.canonical} target="_blank" rel={externalRel}>
          {t('embeds.embed.openOn', { provider })}
        </a>
      </figcaption>
    </figure>
  );
}
