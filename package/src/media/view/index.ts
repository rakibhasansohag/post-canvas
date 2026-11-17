// Owner: chat A (media canvas). The read-only media views for `PostCanvasView`.
import type { ViewMap } from '../../core/types';
import { FileView } from './file-view';
import { GalleryView } from './gallery-view';
import { ImageView } from './image-view';

export { FileView } from './file-view';
export { GalleryPreview, GalleryView, type GalleryPreviewProps } from './gallery-view';
export { ImageView } from './image-view';

/** Read-only views for the media nodes, by node type. Each draws the node's static HTML; the carousel also drags. */
export const mediaViews: ViewMap = {
  image: ImageView,
  gallery: GalleryView,
  file: FileView,
};
