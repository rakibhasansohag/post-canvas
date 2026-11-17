'use client';
import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';
import { ImagePlus, Move, SlidersHorizontal, Trash2, TriangleAlert } from 'lucide-react';
import { lazy, Suspense, useRef, useState, type DragEvent } from 'react';
import { MediaFrame } from '../../core/react/media-frame';
import { MediaToolbar } from '../../core/react/media-toolbar';
import { Popover } from '../../core/react/popover';
import { ToolButton } from '../../core/react/tool-button';
import { useTranslator } from '../../core/react/use-translator';
import type { GalleryLayout, GalleryPhoto } from '../../core/types';
import { galleryAttrsOf } from '../coerce';
import { effectiveLayout } from '../rules';
import { galleryLimitsFrom, normalizePlaces } from '../sanitize';
import { imageAccept, openFilePicker } from '../upload/picker';
import { uploadFiles } from '../upload/pipeline';
import { GalleryPreview } from '../view/gallery-view';
import { CaptionField } from './caption-field';
import { GalleryManager, layoutIcons } from './gallery-manager';
import { isFileDrag, runFrameKey, useEditable, useUploads } from './node-view-utils';
import { RadioMenu } from './radio-menu';
import { uploadView } from './upload-status';

const CollageEditor = lazy(() => import('./collage-editor'));

/**
 * The `gallery` block in the editor, shown exactly as it will be published. Its toolbar switches the layout, adds
 * photos, opens the manager (order, alt text, retries), arranges a collage, or removes it. Files dropped on it join it.
 */
export function GalleryNodeView({ editor, node, getPos, selected, updateAttributes, deleteNode }: ReactNodeViewProps) {
  const t = useTranslator();
  const attrs = galleryAttrsOf(node.attrs);
  const manager = useUploads(editor);
  const editable = useEditable(editor);
  const limits = galleryLimitsFrom(editor.storage.postCanvasCore.features.gallery);
  const [managing, setManaging] = useState(false);
  const [arranging, setArranging] = useState(false);
  const [over, setOver] = useState(false);
  const depth = useRef(0);
  const [manageAnchor, setManageAnchor] = useState<HTMLElement | null>(null);
  const [layoutAnchor, setLayoutAnchor] = useState<HTMLElement | null>(null);
  const [layoutMenu, setLayoutMenu] = useState(false);
  const { photos } = attrs;
  const count = photos.length;
  const shown = effectiveLayout(attrs.layout, count);
  const collage = shown === 'collage';
  const editingCollage = collage && arranging && editable;
  const views = photos.map((photo) => uploadView(photo.uploadKey, manager?.get(photo.uploadKey)));
  const running = views.filter((view) => view.state === 'running');
  const failed = views.filter((view) => view.state === 'failed' || view.state === 'lost').length;
  const label = t('media.gallery.label', { count });
  const full = count >= limits.maxPhotos;

  const setPhotos = (next: GalleryPhoto[]) => {
    if (next.length === 0) {
      deleteNode();
      return;
    }
    updateAttributes({ photos: normalizePlaces(next, attrs.layout) });
  };
  const setLayout = (layout: GalleryLayout) => {
    if (layout === attrs.layout) return;
    updateAttributes({ layout, photos: normalizePlaces(photos, layout) });
    if (layout !== 'collage') setArranging(false);
  };
  const add = (files: File[]) => {
    if (files.length > 0 && attrs.id) void uploadFiles(editor, files, { type: 'gallery', nodeId: attrs.id });
  };
  const pick = () => {
    const accept = imageAccept(editor.storage.postCanvasCore.adapters.upload?.accept?.image);
    void openFilePicker({ accept, multiple: true }).then(add);
  };

  // Files dragged in from outside join this gallery; ProseMirror leaves these drops to the node view.
  const dropHandlers = editable
    ? {
        onDragEnter: (event: DragEvent) => {
          if (!isFileDrag(event.nativeEvent)) return;
          event.preventDefault();
          depth.current += 1;
          setOver(true);
        },
        onDragOver: (event: DragEvent) => {
          if (!isFileDrag(event.nativeEvent)) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = full ? 'none' : 'copy';
        },
        onDragLeave: (event: DragEvent) => {
          if (!isFileDrag(event.nativeEvent)) return;
          depth.current = Math.max(0, depth.current - 1);
          if (depth.current === 0) setOver(false);
        },
        onDrop: (event: DragEvent) => {
          if (!isFileDrag(event.nativeEvent)) return;
          event.preventDefault();
          depth.current = 0;
          setOver(false);
          add(Array.from(event.dataTransfer.files));
        },
      }
    : {};

  const tools = editable ? (
    <>
      {count >= 2 && limits.layouts.length > 1 && (
        <>
          {/* Wide blocks show a toggle per layout; narrow ones a single Layout menu (media.css switches them). */}
          <span className="pc-layout-toggles">
            {limits.layouts.map((layout) => (
              <ToolButton
                key={layout}
                icon={layoutIcons[layout]}
                label={t(`media.gallery.showAs.${layout}`)}
                pressed={attrs.layout === layout}
                onClick={() => setLayout(layout)}
              />
            ))}
          </span>
          <span ref={setLayoutAnchor} className="pc-media-anchor pc-layout-menu-button">
            <ToolButton
              icon={layoutIcons[attrs.layout]}
              label={t('media.gallery.layout')}
              pressed={layoutMenu}
              onClick={() => setLayoutMenu(!layoutMenu)}
            />
          </span>
          <span className="pc-media-divider" aria-hidden="true" />
        </>
      )}
      {collage && (
        <ToolButton
          icon={Move}
          label={t('media.gallery.arrange')}
          pressed={arranging}
          onClick={() => setArranging(!arranging)}
        />
      )}
      <ToolButton icon={ImagePlus} label={t('media.gallery.add')} disabled={full} onClick={pick} />
      <span ref={setManageAnchor} className="pc-media-anchor">
        <ToolButton
          icon={SlidersHorizontal}
          label={t('media.gallery.manage')}
          pressed={managing}
          onClick={() => setManaging(!managing)}
        />
      </span>
      <ToolButton icon={Trash2} label={t('media.gallery.remove')} onClick={deleteNode} />
    </>
  ) : null;

  const percent =
    running.length > 0
      ? Math.round(
          (running.reduce((sum, view) => sum + (view.state === 'running' ? view.progress : 0), 0) / running.length) *
            100,
        )
      : 0;

  return (
    <NodeViewWrapper className="pc-node-view" {...dropHandlers}>
      <MediaFrame
        label={label}
        selected={selected}
        highlighted={over}
        onKey={(key) => runFrameKey(editor, getPos, key)}
        onRemove={deleteNode}
        className={editingCollage ? 'pc-frame--gallery pc-frame--arranging' : 'pc-frame--gallery'}
        toolbar={
          tools && !editingCollage ? (
            <MediaToolbar label={t('core.frame.tools', { label })}>{tools}</MediaToolbar>
          ) : undefined
        }
      >
        {editingCollage && tools && (
          <div
            className="pc-gallery-bar"
            role="toolbar"
            aria-label={t('core.frame.tools', { label })}
            contentEditable={false}
          >
            {tools}
          </div>
        )}
        <div className="pc-gallery-stage">
          {editingCollage ? (
            <Suspense fallback={<GalleryPreview attrs={{ ...attrs, caption: '' }} t={t} />}>
              <CollageEditor
                editor={editor}
                photos={photos}
                t={t}
                onChange={setPhotos}
                onChangeBackground={() => setManaging(true)}
              />
            </Suspense>
          ) : (
            <GalleryPreview attrs={{ ...attrs, caption: '' }} t={t} />
          )}
          {(running.length > 0 || failed > 0) && (
            <div className="pc-gallery-status" contentEditable={false}>
              {running.length > 0 && (
                <span role="status" className="pc-upload-status">
                  <span className="pc-upload-status__text">
                    {t('media.gallery.uploading', {
                      current: count - running.length - failed + 1,
                      total: count - failed,
                    })}
                  </span>
                  <span className="pc-media-progress" aria-hidden="true">
                    <span className="pc-media-progress__bar" style={{ width: `${Math.max(6, percent)}%` }} />
                  </span>
                </span>
              )}
              {failed > 0 && editable && (
                <button
                  type="button"
                  className="pc-upload-status pc-upload-status--failed pc-upload-status--button"
                  onClick={() => setManaging(true)}
                >
                  <TriangleAlert size={14} strokeWidth={2.4} aria-hidden="true" />
                  {t('media.gallery.failed', { count: failed })}
                </button>
              )}
            </div>
          )}
        </div>
        {editable ? (
          <CaptionField
            value={attrs.caption}
            onChange={(caption) => updateAttributes({ caption })}
            onLeave={() => runFrameKey(editor, getPos, 'after')}
            label={t('media.caption.label')}
            placeholder={t('media.caption.placeholder')}
            className="pc-gallery__caption"
          />
        ) : (
          attrs.caption && <p className="pc-gallery__caption">{attrs.caption}</p>
        )}
      </MediaFrame>
      <Popover
        open={layoutMenu && editable}
        anchor={layoutAnchor}
        onClose={() => setLayoutMenu(false)}
        label={t('media.gallery.layout')}
        role="menu"
        placement="bottom-end"
        className="pc-menu"
      >
        <RadioMenu
          value={attrs.layout}
          options={limits.layouts.map((layout) => ({
            value: layout,
            label: t(`media.layout.${layout}.name`),
            icon: layoutIcons[layout],
          }))}
          onSelect={(layout) => {
            setLayoutMenu(false);
            setLayout(layout);
          }}
        />
      </Popover>
      <Popover
        open={managing && editable}
        anchor={manageAnchor ?? null}
        onClose={() => setManaging(false)}
        label={t('media.manager.title')}
        placement="bottom-end"
        className="pc-media-panel pc-media-panel--wide"
      >
        <GalleryManager
          editor={editor}
          attrs={attrs}
          layouts={limits.layouts}
          maxPhotos={limits.maxPhotos}
          t={t}
          onPhotos={setPhotos}
          onLayout={setLayout}
          onAdd={pick}
          onClose={() => setManaging(false)}
        />
      </Popover>
    </NodeViewWrapper>
  );
}
