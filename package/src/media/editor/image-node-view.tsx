'use client';
import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';
import {
  AlignCenter,
  AlignHorizontalJustifyCenter,
  ImageUp,
  PanelLeft,
  PanelRight,
  RectangleHorizontal,
  TextCursorInput,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { MediaFrame } from '../../core/react/media-frame';
import { MediaToolbar } from '../../core/react/media-toolbar';
import { Popover } from '../../core/react/popover';
import { ToolButton } from '../../core/react/tool-button';
import { useTranslator } from '../../core/react/use-translator';
import type { ImageAlign } from '../../core/types';
import { imageAttrsOf } from '../coerce';
import { imgAttrs } from '../html';
import { textLimits } from '../rules';
import { openFilePicker } from '../upload/picker';
import { uploadFiles } from '../upload/pipeline';
import { CaptionField } from './caption-field';
import { runFrameKey, useEditable, useUpload } from './node-view-utils';
import { UploadStatus, uploadView } from './upload-status';

const alignIcons: Record<ImageAlign, LucideIcon> = {
  center: AlignCenter,
  wide: RectangleHorizontal,
  full: AlignHorizontalJustifyCenter,
  left: PanelLeft,
  right: PanelRight,
};
const alignOrder: ImageAlign[] = ['center', 'wide', 'full', 'left', 'right'];

/** The accept string for picture pickers. */
export function imageAccept(accept: string | undefined): string {
  return accept ?? 'image/jpeg,image/png,image/webp,image/avif,image/gif,image/heic,image/heif,.heic,.heif';
}

/** The `image` block in the editor: the picture, its caption, and tools to replace, describe, align and remove it. */
export function ImageNodeView({ editor, node, getPos, selected, updateAttributes, deleteNode }: ReactNodeViewProps) {
  const t = useTranslator();
  const attrs = imageAttrsOf(node.attrs);
  const entry = useUpload(editor, attrs.uploadKey);
  const editable = useEditable(editor);
  const [panel, setPanel] = useState<'alt' | 'align' | null>(null);
  const [altAnchor, setAltAnchor] = useState<HTMLElement | null>(null);
  const [alignAnchor, setAlignAnchor] = useState<HTMLElement | null>(null);
  const manager = editor.storage.postCanvasMedia?.manager ?? null;
  const view = uploadView(attrs.uploadKey, entry);
  const label = attrs.alt ? t('media.image.labelWithAlt', { alt: attrs.alt }) : t('media.image.label');

  const replace = () => {
    const accept = imageAccept(editor.storage.postCanvasCore.adapters.upload?.accept?.image);
    void openFilePicker({ accept }).then((files) => {
      if (files.length > 0 && attrs.id) void uploadFiles(editor, files, { type: 'replace', nodeId: attrs.id });
    });
  };

  // A pasted picture without a size gets it once it loads, outside the undo history.
  const measure = (image: HTMLImageElement) => {
    if (attrs.width > 0 && attrs.height > 0) return;
    const pos = getPos();
    if (typeof pos !== 'number' || !image.naturalWidth || !image.naturalHeight) return;
    editor.view.dispatch(
      editor.state.tr
        .setNodeAttribute(pos, 'width', image.naturalWidth)
        .setNodeAttribute(pos, 'height', image.naturalHeight)
        .setMeta('addToHistory', false),
    );
  };

  const img = imgAttrs(attrs, { className: 'pc-image__img' });
  const toolbar = editable ? (
    <MediaToolbar label={t('core.frame.tools', { label })}>
      <ToolButton icon={ImageUp} label={t('media.image.replace')} onClick={replace} />
      <span ref={setAltAnchor} className="pc-anchor">
        <ToolButton
          icon={TextCursorInput}
          label={t('media.image.alt')}
          pressed={panel === 'alt'}
          onClick={() => setPanel(panel === 'alt' ? null : 'alt')}
        />
      </span>
      <span ref={setAlignAnchor} className="pc-anchor">
        <ToolButton
          icon={alignIcons[attrs.align]}
          label={t('media.image.align')}
          pressed={panel === 'align'}
          onClick={() => setPanel(panel === 'align' ? null : 'align')}
        />
      </span>
      <ToolButton icon={Trash2} label={t('media.image.remove')} onClick={deleteNode} />
    </MediaToolbar>
  ) : undefined;

  return (
    <NodeViewWrapper className="pc-node-view">
      <MediaFrame
        label={label}
        selected={selected}
        onKey={(key) => runFrameKey(editor, getPos, key)}
        onRemove={deleteNode}
        toolbar={toolbar}
        className="pc-frame--image"
      >
        <figure className={`pc-image pc-image--${attrs.align}`} data-align={attrs.align}>
          <span className="pc-image__media">
            <img
              className={img.class}
              src={img.src}
              alt={img.alt}
              width={img.width}
              height={img.height}
              srcSet={img.srcset}
              sizes={img.sizes}
              decoding="async"
              draggable={false}
              onLoad={(event) => measure(event.currentTarget)}
            />
            <UploadStatus
              view={view}
              t={t}
              onRetry={() => attrs.uploadKey && manager?.start(attrs.uploadKey)}
              onReplace={editable ? replace : undefined}
            />
          </span>
          {editable ? (
            <CaptionField
              value={attrs.caption}
              onChange={(caption) => updateAttributes({ caption })}
              onLeave={() => runFrameKey(editor, getPos, 'after')}
              label={t('media.caption.label')}
              placeholder={t('media.caption.placeholder')}
              className="pc-image__caption"
            />
          ) : (
            attrs.caption && <figcaption className="pc-image__caption">{attrs.caption}</figcaption>
          )}
        </figure>
      </MediaFrame>
      <Popover
        open={panel === 'alt'}
        anchor={altAnchor}
        onClose={() => setPanel(null)}
        label={t('media.alt.title')}
        placement="bottom-end"
        className="pc-media-panel"
      >
        <AltTextForm
          value={attrs.alt}
          onChange={(alt) => updateAttributes({ alt })}
          onDone={() => setPanel(null)}
          t={t}
        />
      </Popover>
      <Popover
        open={panel === 'align'}
        anchor={alignAnchor}
        onClose={() => setPanel(null)}
        label={t('media.image.align')}
        role="menu"
        placement="bottom-end"
        className="pc-menu"
      >
        <AlignMenu
          value={attrs.align}
          onSelect={(align) => {
            setPanel(null);
            updateAttributes({ align });
          }}
          t={t}
        />
      </Popover>
    </NodeViewWrapper>
  );
}

/** Props of `AltTextForm`. */
export interface AltTextFormProps {
  value: string;
  onChange: (value: string) => void;
  onDone: () => void;
  t: (key: string, values?: Record<string, string | number>) => string;
  /** Default: the image wording. */
  label?: string;
}

/** The alt text field with its hint. Enter or Done closes it. */
export function AltTextForm({ value, onChange, onDone, t, label }: AltTextFormProps) {
  const [draft, setDraft] = useState(value);
  return (
    <div className="pc-alt-form">
      <label className="pc-field">
        <span className="pc-field__label">{label ?? t('media.alt.title')}</span>
        <textarea
          className="pc-input pc-input--area"
          rows={3}
          value={draft}
          maxLength={textLimits.alt}
          placeholder={t('media.alt.placeholder')}
          onChange={(event) => {
            setDraft(event.target.value);
            onChange(event.target.value);
          }}
          onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              onDone();
            }
          }}
        />
      </label>
      <p className="pc-field__hint">{t('media.alt.hint')}</p>
      <div className="pc-panel-actions">
        <button type="button" className="pc-button pc-button--primary" onClick={onDone}>
          {t('media.done')}
        </button>
      </div>
    </div>
  );
}

function AlignMenu({ value, onSelect, t }: { value: ImageAlign; onSelect: (align: ImageAlign) => void; t: (key: string) => string }) {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'));
    const index = items.indexOf(event.target as HTMLButtonElement);
    const next =
      event.key === 'ArrowDown'
        ? items[(index + 1) % items.length]
        : event.key === 'ArrowUp'
          ? items[(index - 1 + items.length) % items.length]
          : event.key === 'Home'
            ? items[0]
            : event.key === 'End'
              ? items[items.length - 1]
              : undefined;
    if (!next) return;
    event.preventDefault();
    next.focus();
  }
  return (
    <div className="pc-menu__items" onKeyDown={onKeyDown}>
      {alignOrder.map((align) => {
        const Icon = alignIcons[align];
        return (
          <button
            key={align}
            type="button"
            role="menuitemradio"
            aria-checked={value === align}
            className="pc-menu__item"
            onClick={() => onSelect(align)}
          >
            <Icon size={17} strokeWidth={2.2} aria-hidden="true" />
            {t(`media.align.${align}`)}
          </button>
        );
      })}
    </div>
  );
}
