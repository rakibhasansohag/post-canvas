'use client';
import { RotateCw, TriangleAlert } from 'lucide-react';
import type { Translator } from '../../core/types';
import type { UploadEntry } from '../upload/manager';

/** How an upload stands, for drawing: running, failed, lost (the key is unknown, as after a reload) or nothing. */
export type UploadView =
  { state: 'none' } | { state: 'running'; progress: number } | { state: 'failed' } | { state: 'lost' };

/** The view of one upload key. */
export function uploadView(key: string | null, entry: UploadEntry | undefined): UploadView {
  if (!key) return { state: 'none' };
  if (!entry) return { state: 'lost' };
  if (entry.status === 'failed') return { state: 'failed' };
  if (entry.status === 'done') return { state: 'none' };
  return { state: 'running', progress: entry.status === 'uploading' ? entry.progress : 0 };
}

/** Props of `UploadStatus`. */
export interface UploadStatusProps {
  view: UploadView;
  t: Translator;
  onRetry?: () => void;
  /** Shown for a lost upload instead of Retry. */
  onReplace?: () => void;
}

/** The progress bar, or the failure with Try again, over a picture or a file card. */
export function UploadStatus({ view, t, onRetry, onReplace }: UploadStatusProps) {
  if (view.state === 'none') return null;
  if (view.state === 'running') {
    const percent = Math.round(view.progress * 100);
    return (
      <div className="pc-upload-status" contentEditable={false}>
        <span role="status" className="pc-upload-status__text">
          {t('media.upload.progress', { percent })}
        </span>
        <span
          className="pc-media-progress"
          role="progressbar"
          aria-label={t('media.upload.progressLabel')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <span className="pc-media-progress__bar" style={{ width: `${Math.max(6, percent)}%` }} />
        </span>
      </div>
    );
  }
  const lost = view.state === 'lost';
  const action = lost ? onReplace : onRetry;
  return (
    <div className="pc-upload-status pc-upload-status--failed" role="alert" contentEditable={false}>
      <TriangleAlert size={16} strokeWidth={2.2} aria-hidden="true" />
      <span className="pc-upload-status__text">{lost ? t('media.upload.lost') : t('media.upload.failedShort')}</span>
      {action && (
        <button type="button" className="pc-media-text-button" onClick={action}>
          <RotateCw size={14} strokeWidth={2.4} aria-hidden="true" />
          {lost ? t('media.upload.replace') : t('media.upload.retry')}
        </button>
      )}
    </div>
  );
}
