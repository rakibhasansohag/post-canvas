'use client';
// Owner: chat A (media canvas). The post's cover picture, above the title in presets that show one.
import { ImagePlus, ImageUp, Trash2 } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useOptionalPostCanvasContext } from '../../core/react/context';
import { ToolButton } from '../../core/react/tool-button';
import { useTranslator } from '../../core/react/use-translator';
import type { CoverImage } from '../../core/types';
import { safeMediaSrc } from '../../core/url';
import { UploadStatus, type UploadView } from '../editor/upload-status';
import { formatBytes, textLimits } from '../rules';
import { cleanPlaceholder, cleanSrcset } from '../sanitize';
import { imageAccept, openFilePicker } from '../upload/picker';
import { MediaRefusal, prepareImage, type RefusalReason } from '../upload/prepare';

/** Props of `CoverField`. */
export interface CoverFieldProps {
  value: CoverImage | null;
  /** Called with the finished cover (after its upload), with a new alt text, or with `null` when it's removed. */
  onChange(value: CoverImage | null): void;
  disabled?: boolean;
}

const refusalKeys: Record<RefusalReason, string> = {
  'not-image': 'media.refused.notImage',
  svg: 'media.refused.svg',
  heic: 'media.refused.heic',
  unreadable: 'media.refused.unreadable',
  'too-large': 'media.refused.tooLarge',
};

interface Pending {
  file: File;
  preview: string;
  width: number;
  height: number;
  view: UploadView;
}

/**
 * Picks, uploads and edits a post's cover picture: choose one, watch it upload, describe it, replace or remove it. It
 * reads the upload adapter and the translator from the nearest `PostCanvasProvider`, and calls `onChange` only with a
 * finished upload, so `value` never holds a local preview.
 */
export function CoverField(props: CoverFieldProps) {
  const { value, disabled = false } = props;
  const context = useOptionalPostCanvasContext();
  const t = useTranslator();
  const adapter = context?.adapters.upload;
  const altId = useId();
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const previews = useRef<string[]>([]);
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });
  useEffect(
    () => () => {
      controller.current?.abort();
      for (const url of previews.current) URL.revokeObjectURL(url);
    },
    [],
  );

  async function upload(file: File, width: number, height: number, preview: string) {
    if (!adapter) return;
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setPending({ file, preview, width, height, view: { state: 'running', progress: 0 } });
    try {
      const result = await adapter.upload(file, {
        kind: 'image',
        signal: current.signal,
        onProgress: (fraction) =>
          setPending((state) =>
            state && state.preview === preview
              ? { ...state, view: { state: 'running', progress: Math.min(1, Math.max(0, fraction)) } }
              : state,
          ),
      });
      if (current.signal.aborted) return;
      const src = safeMediaSrc(result.src, { allowBlob: true });
      if (!src) throw new Error('The upload adapter returned no http(s) src.');
      const sized = Number(result.width) > 0 && Number(result.height) > 0;
      latest.current.onChange({
        src,
        width: sized ? Math.round(Number(result.width)) : width,
        height: sized ? Math.round(Number(result.height)) : height,
        alt: latest.current.value?.alt ?? '',
        srcset: cleanSrcset(result.srcset),
        placeholder: cleanPlaceholder(result.placeholder),
        uploadId: typeof result.id === 'string' ? result.id : null,
      });
      setPending(null);
    } catch (failure) {
      if (current.signal.aborted) return;
      console.warn('[post-canvas] Cover upload failed:', failure);
      setPending((state) => (state && state.preview === preview ? { ...state, view: { state: 'failed' } } : state));
    }
  }

  async function choose() {
    if (!adapter || disabled) return;
    const [file] = await openFilePicker({ accept: imageAccept(adapter.accept?.image) });
    if (!file) return;
    setError(null);
    try {
      const prepared = await prepareImage(file, {
        maxBytes: adapter.maxBytes?.image,
        convertHeic: adapter.convertHeic,
      });
      const preview = URL.createObjectURL(prepared.file);
      previews.current.push(preview);
      await upload(prepared.file, prepared.width, prepared.height, preview);
    } catch (refusal) {
      const reason = refusal instanceof MediaRefusal ? refusal.reason : 'unreadable';
      setError(t(refusalKeys[reason], { name: file.name, size: formatBytes(adapter.maxBytes?.image ?? null) }));
    }
  }

  function remove() {
    controller.current?.abort();
    setPending(null);
    setError(null);
    props.onChange(null);
  }

  const shown = pending?.preview ?? value?.src ?? null;
  const errorBox = error && (
    <p role="alert" className="pc-cover__error">
      {error}
    </p>
  );

  if (!shown) {
    return (
      <div className="pc-cover">
        <button type="button" className="pc-cover__add" disabled={disabled || !adapter} onClick={() => void choose()}>
          <span className="pc-cover__add-icon">
            <ImagePlus size={20} strokeWidth={2.2} aria-hidden="true" />
          </span>
          <span className="pc-cover__add-text">
            <span className="pc-cover__add-title">{t('media.cover.add')}</span>
            <span className="pc-cover__add-hint">{t('media.cover.addHint')}</span>
          </span>
        </button>
        {errorBox}
      </div>
    );
  }

  return (
    <figure className="pc-cover pc-cover--filled" aria-label={t('media.cover.label')}>
      <div className="pc-cover__media">
        <img src={shown} alt="" className="pc-cover__img" />
        <span className="pc-cover__badge">{t('media.cover.label')}</span>
        {!disabled && (
          <div
            className="pc-media-toolbar pc-cover__tools"
            role="toolbar"
            aria-label={t('core.frame.tools', { label: t('media.cover.label') })}
          >
            <ToolButton
              icon={ImageUp}
              label={t('media.cover.change')}
              onClick={() => void choose()}
              disabled={!adapter}
            />
            <ToolButton icon={Trash2} label={t('media.cover.remove')} onClick={remove} />
          </div>
        )}
        {pending && (
          <UploadStatus
            view={pending.view}
            t={t}
            onRetry={() => void upload(pending.file, pending.width, pending.height, pending.preview)}
          />
        )}
      </div>
      {errorBox}
      {value && !pending && (
        <div className="pc-cover__alt">
          <label className="pc-sr-only" htmlFor={altId}>
            {t('media.cover.describe')}
          </label>
          <input
            id={altId}
            className="pc-media-input pc-cover__alt-input"
            value={value.alt}
            maxLength={textLimits.alt}
            disabled={disabled}
            placeholder={t('media.cover.describePlaceholder')}
            onChange={(event) => props.onChange({ ...value, alt: event.target.value })}
          />
        </div>
      )}
    </figure>
  );
}
