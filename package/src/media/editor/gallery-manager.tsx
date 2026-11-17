'use client';
import type { Editor } from '@tiptap/core';
import {
  ArrowLeft,
  ArrowRight,
  GalleryHorizontal,
  ImagePlus,
  LayoutDashboard,
  LayoutGrid,
  RotateCw,
  Shapes,
  Trash2,
  TriangleAlert,
  Wallpaper,
  type LucideIcon,
} from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { usePointerDrag } from '../../core/react/use-pointer-drag';
import type { GalleryAttrs, GalleryLayout, GalleryPhoto, Translator } from '../../core/types';
import { textLimits } from '../rules';
import { useUploads } from './node-view-utils';
import { UploadTile } from './upload-tile';
import { uploadView } from './upload-status';

/** The icon of each layout, for the toolbar and the manager. */
export const layoutIcons: Record<GalleryLayout, LucideIcon> = {
  carousel: GalleryHorizontal,
  grid: LayoutGrid,
  masonry: LayoutDashboard,
  collage: Shapes,
};

/** Moves the photo with `key` to the gap `to` (0 is before the first photo). */
export function movePhoto(photos: readonly GalleryPhoto[], key: string, to: number): GalleryPhoto[] {
  const from = photos.findIndex((photo) => photo.key === key);
  const photo = photos[from];
  if (!photo) return [...photos];
  const rest = photos.filter((item) => item.key !== key);
  const index = Math.max(0, Math.min(rest.length, to > from ? to - 1 : to));
  rest.splice(index, 0, photo);
  return rest;
}

/** Props of `GalleryManager`. */
export interface GalleryManagerProps {
  editor: Editor;
  attrs: GalleryAttrs;
  layouts: readonly GalleryLayout[];
  maxPhotos: number;
  t: Translator;
  /** Sets the photos at once: order, alt text and removals. An empty list removes the gallery. */
  onPhotos: (photos: GalleryPhoto[]) => void;
  onLayout: (layout: GalleryLayout) => void;
  onAdd: () => void;
  onClose: () => void;
}

/**
 * The gallery's photos, to manage: every photo is a tile showing how its upload stands (Try again on a failed one,
 * remove on all), photos are dragged into order (or moved with Earlier and Later), described for screen readers, and
 * the layout is chosen. In a collage the first photo is the background, and any photo can be made it.
 */
export function GalleryManager({
  editor,
  attrs,
  layouts,
  maxPhotos,
  t,
  onPhotos,
  onLayout,
  onAdd,
  onClose,
}: GalleryManagerProps) {
  const manager = useUploads(editor);
  const titleId = useId();
  const { photos, layout } = attrs;
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('');
  const count = photos.length;
  const room = maxPhotos - count;
  const views = photos.map((photo) => uploadView(photo.uploadKey, manager?.get(photo.uploadKey)));
  const uploading = views.filter((view) => view.state === 'running').length;
  const failed = views.filter((view) => view.state === 'failed' || view.state === 'lost').length;
  const index = photos.findIndex((photo) => photo.key === selectedKey);
  const selected = index >= 0 ? photos[index] : undefined;
  const collage = layout === 'collage' && count >= 2;

  const move = (key: string, to: number) => {
    const next = movePhoto(photos, key, to);
    onPhotos(next);
    const at = next.findIndex((photo) => photo.key === key);
    setAnnounce(t('media.manager.moved', { number: at + 1 }));
  };
  const remove = (key: string) => {
    if (key === selectedKey) setSelectedKey(null);
    onPhotos(photos.filter((photo) => photo.key !== key));
    setAnnounce(t('media.manager.removed'));
  };
  const setAlt = (key: string, alt: string) =>
    onPhotos(photos.map((photo) => (photo.key === key ? { ...photo, alt } : photo)));

  // Dragging a tile to reorder: it follows the pointer, and the tile under it shows where it lands.
  const grid = useRef<HTMLUListElement>(null);
  const drag = useRef({ from: 0, to: 0, x: 0, y: 0 });
  const [dragging, setDragging] = useState<{ key: string; to: number } | null>(null);
  const tiles = () => Array.from(grid.current?.querySelectorAll<HTMLElement>('[data-tile]') ?? []);
  const clearDrag = () => {
    const moved = tiles()[drag.current.from];
    if (moved) moved.style.transform = '';
    setDragging(null);
  };
  const pointer = usePointerDrag(
    {
      onStart: (event) => {
        drag.current = { ...drag.current, to: drag.current.from, x: event.clientX, y: event.clientY };
        setDragging({ key: photos[drag.current.from]?.key ?? '', to: drag.current.from });
      },
      onMove: (event) => {
        const all = tiles();
        const { from, x, y } = drag.current;
        const moved = all[from];
        if (moved) moved.style.transform = `translate(${event.clientX - x}px, ${event.clientY - y}px)`;
        const over = all.findIndex((tile, i) => {
          if (i === from) return false;
          const rect = tile.getBoundingClientRect();
          return (
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom
          );
        });
        const to = over >= 0 ? over : drag.current.to;
        drag.current.to = to;
        setDragging((current) => (current && current.to !== to ? { ...current, to } : current));
      },
      onEnd: () => {
        const { from, to } = drag.current;
        clearDrag();
        const photo = photos[from];
        if (from !== to && photo) move(photo.key, to > from ? to + 1 : to);
      },
      onCancel: clearDrag,
    },
    { touchDelay: 250 },
  );

  const status =
    uploading > 0
      ? t('media.manager.uploadingCount', { count, max: maxPhotos, uploading })
      : failed > 0
        ? t('media.manager.failedCount', { count, max: maxPhotos, failed })
        : t('media.manager.count', { count, max: maxPhotos });

  return (
    <div className="pc-photo-manager" data-pc-stop="" aria-labelledby={titleId}>
      <header className="pc-photo-manager__header">
        <span className="pc-photo-manager__heading">
          <h2 id={titleId} className="pc-photo-manager__title">
            {t('media.manager.title')}
          </h2>
          <span className="pc-photo-manager__status" aria-live="polite">
            {status}
          </span>
        </span>
        <button type="button" className="pc-media-button pc-media-button--primary" onClick={onClose}>
          {t('media.done')}
        </button>
      </header>

      <ul ref={grid} className="pc-photo-manager__grid" aria-label={t('media.manager.order')}>
        {photos.map((photo, i) => (
          <li
            key={photo.key}
            data-tile=""
            className="pc-photo-manager__cell"
            data-target={(dragging && dragging.to === i && dragging.key !== photo.key) || undefined}
          >
            <UploadTile
              preview={photo.src}
              name={photo.alt || manager?.get(photo.uploadKey)?.file.name || null}
              view={views[i] ?? { state: 'none' }}
              number={i + 1}
              t={t}
              selected={photo.key === selectedKey}
              dragging={dragging?.key === photo.key}
              badge={collage && i === 0 ? t('media.manager.base') : undefined}
              onSelect={() => setSelectedKey(photo.key === selectedKey ? null : photo.key)}
              onRetry={() => photo.uploadKey && manager?.start(photo.uploadKey)}
              onRemove={() => remove(photo.key)}
              onPointerDown={(event) => {
                drag.current.from = i;
                pointer.onPointerDown(event);
              }}
              onClickCapture={pointer.onClickCapture}
            />
          </li>
        ))}
        {room > 0 && (
          <li className="pc-photo-manager__cell">
            <button type="button" className="pc-photo-manager__add" onClick={onAdd}>
              <ImagePlus size={20} strokeWidth={2.2} aria-hidden="true" />
              <span>{t('media.manager.addMore')}</span>
            </button>
          </li>
        )}
      </ul>
      <p className="pc-media-field__hint">
        {room > 0 ? t('media.manager.hint', { room }) : t('media.manager.full', { max: maxPhotos })}
      </p>

      {selected && (
        <section className="pc-photo-manager__selected" aria-label={t('media.manager.selected', { number: index + 1 })}>
          {views[index]?.state === 'failed' && (
            <p role="alert" className="pc-photo-manager__error">
              <TriangleAlert size={16} strokeWidth={2.2} aria-hidden="true" />
              {t('media.upload.failedShort')}
            </p>
          )}
          <label className="pc-media-field">
            <span className="pc-media-field__label">{t('media.manager.describe', { number: index + 1 })}</span>
            <input
              className="pc-media-input"
              value={selected.alt}
              maxLength={textLimits.alt}
              placeholder={t('media.manager.describePlaceholder')}
              onChange={(event) => setAlt(selected.key, event.target.value)}
            />
          </label>
          <div className="pc-photo-manager__actions">
            <button
              type="button"
              className="pc-media-button"
              disabled={index === 0}
              onClick={() => move(selected.key, index - 1)}
            >
              <ArrowLeft size={16} strokeWidth={2.2} aria-hidden="true" />
              {t('media.manager.earlier')}
            </button>
            <button
              type="button"
              className="pc-media-button"
              disabled={index === count - 1}
              onClick={() => move(selected.key, index + 2)}
            >
              <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
              {t('media.manager.later')}
            </button>
            {layout === 'collage' && index > 0 && (
              <button type="button" className="pc-media-button" onClick={() => move(selected.key, 0)}>
                <Wallpaper size={16} strokeWidth={2.2} aria-hidden="true" />
                {t('media.manager.makeBase')}
              </button>
            )}
            {views[index]?.state === 'failed' && (
              <button
                type="button"
                className="pc-media-button"
                onClick={() => selected.uploadKey && manager?.start(selected.uploadKey)}
              >
                <RotateCw size={16} strokeWidth={2.2} aria-hidden="true" />
                {t('media.upload.retry')}
              </button>
            )}
            <button type="button" className="pc-media-button" onClick={() => remove(selected.key)}>
              <Trash2 size={16} strokeWidth={2} aria-hidden="true" />
              {t('media.manager.remove')}
            </button>
          </div>
        </section>
      )}

      {count >= 2 && layouts.length > 1 && (
        <fieldset className="pc-photo-manager__layouts">
          <legend className="pc-media-field__label">{t('media.manager.layout')}</legend>
          <div className="pc-photo-manager__layout-grid">
            {layouts.map((option) => {
              const Icon = layoutIcons[option];
              return (
                <button
                  key={option}
                  type="button"
                  className="pc-layout-option"
                  aria-pressed={layout === option}
                  onClick={() => onLayout(option)}
                >
                  <Icon size={20} strokeWidth={2.1} aria-hidden="true" />
                  <span className="pc-layout-option__text">
                    <span className="pc-layout-option__name">{t(`media.layout.${option}.name`)}</span>
                    <span className="pc-layout-option__hint">{t(`media.layout.${option}.hint`)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
      <span className="pc-sr-only" role="status">
        {announce}
      </span>
    </div>
  );
}
