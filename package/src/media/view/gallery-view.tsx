import type { GalleryAttrs, Translator, ViewProps } from '../../core/types';
import { galleryAttrsOf } from '../coerce';
import { gallerySpec } from '../html';
import { effectiveLayout } from '../rules';
import { CarouselList } from './carousel-list';
import { specToReact } from './spec-to-react';

/** Props of `GalleryPreview`. */
export interface GalleryPreviewProps {
  attrs: GalleryAttrs;
  t: Translator;
}

/**
 * A gallery drawn from typed attributes: the static HTML, with the carousel's list swapped for the draggable one. The
 * editor's node view shows this too, so the editor and the output look the same.
 */
export function GalleryPreview({ attrs, t }: GalleryPreviewProps) {
  const count = attrs.photos.length;
  const carousel = count > 1 && effectiveLayout(attrs.layout, count) === 'carousel';
  return specToReact(gallerySpec(attrs), (tag, props, children) => {
    if (!carousel || tag !== 'ul') return undefined;
    return (
      <CarouselList
        key={props.key as string | number | undefined}
        className={props.className as string}
        tabIndex={0}
        label={t('media.gallery.stripLabel', { count })}
      >
        {children}
      </CarouselList>
    );
  });
}

/** The read-only `gallery`, in its layout: carousel, grid, masonry or collage. */
export function GalleryView({ node, t }: ViewProps) {
  return <GalleryPreview attrs={galleryAttrsOf(node.attrs)} t={t} />;
}
