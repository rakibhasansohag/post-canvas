'use client';
import { RotateCw, TriangleAlert, X } from 'lucide-react';
import { useState, type MouseEvent, type PointerEvent } from 'react';
import type { Translator } from '../../core/types';
import type { UploadView } from './upload-status';

/** Props of `UploadTile`. */
export interface UploadTileProps {
  preview: string;
  /** The photo's alt text or file name, or `null` when it has neither. */
  name: string | null;
  view: UploadView;
  number: number;
  t: Translator;
  selected?: boolean;
  dragging?: boolean;
  /** A word over the bottom edge, such as "Background". */
  badge?: string;
  onSelect?: () => void;
  onRetry?: () => void;
  onRemove?: () => void;
  onPointerDown?: (event: PointerEvent<HTMLElement>) => void;
  onClickCapture?: (event: MouseEvent) => void;
}

/**
 * A square thumbnail with its upload drawn over it: a bar and the percentage while it uploads, or why it failed with
 * Try again. Remove is always there. Pressing it selects it; with `onPointerDown` it can be dragged to reorder.
 */
export function UploadTile({
  preview,
  name,
  view,
  number,
  t,
  selected = false,
  dragging = false,
  badge,
  onSelect,
  onRetry,
  onRemove,
  onPointerDown,
  onClickCapture,
}: UploadTileProps) {
  const [broken, setBroken] = useState<string | null>(null);
  const percent = view.state === 'running' ? Math.round(view.progress * 100) : 100;
  const plain = name ? '' : 'Plain';
  const values = { number, name: name ?? '', percent };
  const label =
    view.state === 'failed' || view.state === 'lost'
      ? t(`media.tile.failedLabel${plain}`, values)
      : view.state === 'running'
        ? t(`media.tile.uploadingLabel${plain}`, values)
        : t(`media.tile.doneLabel${plain}`, values);

  return (
    <div className="pc-tile" data-dragging={dragging || undefined}>
      <button
        type="button"
        className="pc-tile__button"
        aria-pressed={onSelect ? selected : undefined}
        aria-label={label}
        title={name ?? undefined}
        onPointerDown={onPointerDown}
        onClickCapture={onClickCapture}
        onClick={onSelect}
        onContextMenu={onPointerDown ? (event) => event.preventDefault() : undefined}
      >
        {preview && broken !== preview ? (
          <img src={preview} alt="" draggable={false} onError={() => setBroken(preview)} className="pc-tile__img" />
        ) : (
          <span className="pc-tile__name">{name ?? number}</span>
        )}
        <span className="pc-tile__number" aria-hidden="true">
          {number}
        </span>
        {badge && <span className="pc-tile__badge">{badge}</span>}
        {view.state === 'running' && (
          <span className="pc-tile__overlay" aria-hidden="true">
            <span className="pc-tile__percent">{percent}%</span>
            <span className="pc-media-progress">
              <span className="pc-media-progress__bar" style={{ width: `${Math.max(6, percent)}%` }} />
            </span>
          </span>
        )}
        {(view.state === 'failed' || view.state === 'lost') && (
          <span className="pc-tile__overlay pc-tile__overlay--failed" aria-hidden="true">
            <TriangleAlert size={20} strokeWidth={2.2} />
            <span>{t('media.tile.failed')}</span>
          </span>
        )}
      </button>
      {onRemove && (
        <button
          type="button"
          className="pc-tile__remove"
          aria-label={t(`media.tile.remove${plain}`, values)}
          onClick={onRemove}
        >
          <X size={14} strokeWidth={2.6} aria-hidden="true" />
        </button>
      )}
      {view.state === 'failed' && onRetry && (
        <button type="button" className="pc-media-text-button pc-tile__retry" onClick={onRetry}>
          <RotateCw size={13} strokeWidth={2.4} aria-hidden="true" />
          {t('media.tile.retry')}
        </button>
      )}
    </div>
  );
}
