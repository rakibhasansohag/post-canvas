// Read-only views for the embed nodes, used by `PostCanvasView`.
import type { ViewMap } from '../../core/types';
import { EmbedView } from './embed-view';
import { LinkCardView } from './link-card-view';
import { VideoView } from './video-view';

export { EmbedPlayer, frameStyle, type EmbedPlayerProps } from './embed-player';
export { EmbedView, LinkCardView, VideoView };

/** Read-only views for the embed nodes, by node type. */
export const embedViews: ViewMap = { video: VideoView, embed: EmbedView, linkCard: LinkCardView };
