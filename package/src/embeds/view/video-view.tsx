// The read-only `video` view. Server-safe: it computes every string and URL here and hands only plain props to the
// client-side player, so it works in a React Server Component.
import type { ViewProps } from '../../core/types';
import { externalRel, videoRender } from '../render-spec';
import { EmbedPlayer } from './embed-player';

/** A YouTube or Vimeo video: a click-to-load player with its title, description and "Watch on…" link. */
export function VideoView({ node, t }: ViewProps) {
  const video = videoRender(node.attrs);
  if (!video) return null;
  const provider = video.provider.label;
  return (
    <figure
      className={video.video.vertical ? 'pc-embed pc-video pc-embed-vertical' : 'pc-embed pc-video'}
      data-provider={video.video.provider}
    >
      <EmbedPlayer
        src={video.frame.src}
        playerTitle={video.title || t('embeds.video.frameTitle', { provider })}
        allow={video.frame.allow}
        sandbox={video.frame.sandbox}
        aspectRatio={video.frame.aspectRatio}
        height={video.frame.height}
        label={
          video.title
            ? t('embeds.video.playTitled', { title: video.title, provider })
            : t('embeds.video.play', { provider })
        }
        badge={provider}
        thumbnail={video.thumbnail}
        play
      />
      <figcaption className="pc-embed-caption">
        {video.title && <span className="pc-embed-title">{video.title}</span>}
        {video.description && <span className="pc-embed-description">{video.description}</span>}
        <a className="pc-embed-source" href={video.canonical} target="_blank" rel={externalRel}>
          {t('embeds.video.watchOn', { provider })}
        </a>
      </figcaption>
    </figure>
  );
}
