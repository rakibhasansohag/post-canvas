'use client';
// The paste-a-link field: Enter adds, Escape or Backspace on an empty field cancels, and pasting a link adds it straight
// away. It shows its lookup and its errors, with a retry.
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Link2, LoaderCircle, X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { cancelEmbedInput, patchById, replaceById, linkParagraph, submitEmbedInput, type EmbedInputKind } from './actions';
import { parseEmbedUrl } from '../providers/index';

/** The editor view of the transient `embedInput` node. */
export function EmbedInputView({ node, editor }: NodeViewProps) {
  const { t } = editor.storage.postCanvasCore;
  const inputId = useId();
  const ref = useRef<HTMLInputElement>(null);
  const id = String(node.attrs.id ?? '');
  const value = typeof node.attrs.value === 'string' ? node.attrs.value : '';
  const kind = (node.attrs.kind as EmbedInputKind | undefined) ?? 'any';
  const status = node.attrs.status as 'idle' | 'loading' | 'error';
  const errorKey = typeof node.attrs.error === 'string' ? node.attrs.error : null;
  const loading = status === 'loading';

  // ProseMirror moves focus back to the editor after the insert transaction, so focus the field once that has settled.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setTimeout(() => ref.current?.focus(), 0);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const submit = (link: string) => {
    if (!link.trim() || loading) return;
    void submitEmbedInput(editor, id, link.trim(), kind);
  };
  const cancel = () => cancelEmbedInput(editor, id);
  const placeholder = kind === 'video' ? t('embeds.input.videoPlaceholder') : t('embeds.input.placeholder');

  return (
    <NodeViewWrapper data-pc-node="embedInput" className="pc-embed-input" contentEditable={false}>
      <form
        className="pc-embed-input-form"
        onSubmit={(event) => {
          event.preventDefault();
          submit(value);
        }}
      >
        <label htmlFor={inputId} className="pc-sr-only">
          {t('embeds.input.label')}
        </label>
        <div className="pc-embed-input-row">
          <span className="pc-embed-input-field">
            <Link2 size={18} strokeWidth={2.2} aria-hidden="true" className="pc-embed-input-icon" />
            <input
              ref={ref}
              id={inputId}
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              value={value}
              placeholder={placeholder}
              disabled={loading}
              aria-invalid={status === 'error' || undefined}
              aria-describedby={errorKey ? `${inputId}-error` : undefined}
              onChange={(event) => patchById(editor, id, { value: event.target.value, status: 'idle', error: null })}
              onKeyDown={(event) => {
                if (event.key === 'Escape' || (event.key === 'Backspace' && value === '')) {
                  event.preventDefault();
                  cancel();
                } else if (event.key === 'Enter') {
                  event.preventDefault();
                  submit(value);
                }
              }}
              onPaste={(event) => {
                const pasted = event.clipboardData.getData('text').trim();
                if (parseEmbedUrl(pasted) && !/\s/.test(pasted)) {
                  event.preventDefault();
                  patchById(editor, id, { value: pasted });
                  submit(pasted);
                }
              }}
            />
          </span>
          <button type="submit" className="pc-embed-input-add" disabled={loading || !value.trim()}>
            {loading ? <LoaderCircle size={18} aria-hidden="true" className="pc-spin" /> : null}
            {loading ? t('embeds.input.lookingUp') : t('embeds.input.add')}
          </button>
          <button type="button" className="pc-embed-input-cancel" aria-label={t('embeds.input.cancel')} title={t('embeds.input.cancel')} onClick={cancel}>
            <X size={18} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>
        {loading && (
          <p className="pc-embed-input-status" role="status">
            {t('embeds.input.lookingUp')}
          </p>
        )}
        {status === 'error' && errorKey && (
          <div className="pc-embed-input-error" id={`${inputId}-error`} role="alert">
            <span>{t(errorKey)}</span>
            <span className="pc-embed-input-actions">
              <button type="button" onClick={() => submit(value)}>
                {t('embeds.input.retry')}
              </button>
              {errorKey !== 'embeds.input.invalid' && parseEmbedUrl(value) && (
                <button type="button" onClick={() => replaceById(editor, id, linkParagraph(editor, parseEmbedUrl(value)?.href ?? value))}>
                  {t('embeds.input.asLink')}
                </button>
              )}
            </span>
          </div>
        )}
      </form>
    </NodeViewWrapper>
  );
}
