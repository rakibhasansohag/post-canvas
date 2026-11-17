'use client';
// The `video` node in the editor: the click-to-load player with its title and description edited where they show.
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { useOptionalPostCanvasContext } from '../../core/react/context';
import { Link2, Trash2 } from 'lucide-react';
import { useLayoutEffect, useRef } from 'react';
import { MediaFrame } from '../../core/react/media-frame';
import { MediaToolbar } from '../../core/react/media-toolbar';
import { ToolButton } from '../../core/react/tool-button';
import { titleMax, videoDescriptionMax } from '../attrs';
import { externalRel, videoRender } from '../render-spec';
import { EmbedPlayer } from '../view/embed-player';
import { embedInputContent } from './actions';
import { runFrameKey, useEditable } from '../../core/react/node-view';
import { embedsStorage } from './storage';

function GrowingTextarea(props: {
  value: string;
  label: string;
  placeholder: string;
  readOnly: boolean;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  }, [props.value]);
  return (
    <textarea
      ref={ref}
      className="pc-embed-description-input"
      rows={1}
      aria-label={props.label}
      placeholder={props.placeholder}
      value={props.value}
      maxLength={videoDescriptionMax}
      readOnly={props.readOnly}
      onChange={(event) => props.onChange(event.target.value)}
    />
  );
}

/** The editor view of a `video` node. */
export function VideoNodeView({
  node,
  editor,
  getPos,
  selected,
  updateAttributes,
  deleteNode,
  extension,
}: NodeViewProps) {
  // From React context first, so a language change re-renders the block; the editor's storage outside a provider.
  const t = useOptionalPostCanvasContext()?.t ?? editor.storage.postCanvasCore.t;
  const editable = useEditable(editor);
  const video = videoRender(node.attrs);
  const id = typeof node.attrs.id === 'string' ? node.attrs.id : '';
  const loading = embedsStorage(editor).pending.has(id);
  const consent =
    embedsStorage(editor).consent ?? (extension.options as { consent?: 'click' | 'auto' }).consent ?? 'click';
  if (!video) return <NodeViewWrapper data-pc-node="video" />;
  const provider = video.provider.label;
  const title = typeof node.attrs.title === 'string' ? node.attrs.title : '';
  const description = typeof node.attrs.description === 'string' ? node.attrs.description : '';
  const label = title ? `${t('embeds.video.label')}: ${title}` : t('embeds.video.label');

  const changeLink = () => {
    const pos = getPos();
    if (typeof pos !== 'number') return;
    editor
      .chain()
      .focus()
      .insertContentAt({ from: pos, to: pos + node.nodeSize }, embedInputContent('video', video.canonical))
      .run();
  };

  return (
    <NodeViewWrapper data-pc-node="video" className="pc-node-embed">
      <MediaFrame
        label={label}
        selected={selected}
        onRemove={deleteNode}
        onKey={(key) => runFrameKey(editor, getPos, key)}
        toolbar={
          editable ? (
            <MediaToolbar label={t('core.frame.tools', { label })}>
              <ToolButton icon={Link2} label={t('embeds.changeLink')} onClick={changeLink} />
              <ToolButton icon={Trash2} label={t('embeds.video.remove')} onClick={deleteNode} />
            </MediaToolbar>
          ) : undefined
        }
      >
        <figure
          className={video.video.vertical ? 'pc-embed pc-video pc-embed-vertical' : 'pc-embed pc-video'}
          aria-busy={loading || undefined}
        >
          <EmbedPlayer
            src={video.frame.src}
            playerTitle={title || t('embeds.video.frameTitle', { provider })}
            allow={video.frame.allow}
            sandbox={video.frame.sandbox}
            aspectRatio={video.frame.aspectRatio}
            height={video.frame.height}
            label={title ? t('embeds.video.playTitled', { title, provider }) : t('embeds.video.play', { provider })}
            badge={provider}
            thumbnail={video.thumbnail}
            consent={consent}
            play
          />
          <figcaption className="pc-embed-caption pc-embed-fields">
            {editable ? (
              <>
                <input
                  className="pc-embed-title-input"
                  aria-label={t('embeds.video.title')}
                  placeholder={t('embeds.video.title')}
                  value={title}
                  maxLength={titleMax}
                  onChange={(event) => updateAttributes({ title: event.target.value })}
                />
                <GrowingTextarea
                  label={t('embeds.video.description')}
                  placeholder={t('embeds.video.descriptionPlaceholder')}
                  value={description}
                  readOnly={false}
                  onChange={(value) => updateAttributes({ description: value })}
                />
              </>
            ) : (
              <>
                {title && <span className="pc-embed-title">{title}</span>}
                {description && <span className="pc-embed-description">{description}</span>}
              </>
            )}
            {loading && (
              <span className="pc-embed-status" role="status">
                {t('embeds.input.lookingUp')}
              </span>
            )}
            <a className="pc-embed-source" href={video.canonical} target="_blank" rel={externalRel}>
              {t('embeds.video.watchOn', { provider })}
            </a>
          </figcaption>
        </figure>
      </MediaFrame>
    </NodeViewWrapper>
  );
}
