'use client';
// The `embed` node in the editor: the provider's player behind a consent facade (or straight away with consent "auto").
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Link2, Trash2 } from 'lucide-react';
import { MediaFrame } from '../../core/react/media-frame';
import { MediaToolbar } from '../../core/react/media-toolbar';
import { ToolButton } from '../../core/react/tool-button';
import { embedRender, externalRel } from '../render-spec';
import { EmbedPlayer } from '../view/embed-player';
import { embedInputContent } from './actions';
import { runFrameKey, useEditable } from './frame';
import { embedsStorage } from './storage';

/** The editor view of an `embed` node. */
export function EmbedNodeView({ node, editor, getPos, selected, deleteNode, extension }: NodeViewProps) {
  const { t } = editor.storage.postCanvasCore;
  const editable = useEditable(editor);
  const embed = embedRender(node.attrs);
  const consent =
    embedsStorage(editor).consent ?? (extension.options as { consent?: 'click' | 'auto' }).consent ?? 'click';
  if (!embed) return <NodeViewWrapper data-pc-node="embed" />;
  const provider = embed.provider.label;
  const label = `${t('embeds.embed.label')}: ${embed.title || provider}`;

  const changeLink = () => {
    const pos = getPos();
    if (typeof pos !== 'number') return;
    editor
      .chain()
      .focus()
      .insertContentAt({ from: pos, to: pos + node.nodeSize }, embedInputContent('embed', embed.canonical))
      .run();
  };

  return (
    <NodeViewWrapper data-pc-node="embed" className="pc-node-embed">
      <MediaFrame
        label={label}
        selected={selected}
        onRemove={deleteNode}
        onKey={(key) => runFrameKey(editor, getPos, key)}
        toolbar={
          editable ? (
            <MediaToolbar label={t('core.frame.tools', { label })}>
              <ToolButton icon={Link2} label={t('embeds.changeLink')} onClick={changeLink} />
              <ToolButton icon={Trash2} label={t('embeds.embed.remove')} onClick={deleteNode} />
            </MediaToolbar>
          ) : undefined
        }
      >
        <figure className={`pc-embed pc-embed-${embed.provider.name}`}>
          <EmbedPlayer
            src={embed.frame.src}
            playerTitle={embed.title || t('embeds.embed.frameTitle', { provider })}
            allow={embed.frame.allow}
            sandbox={embed.frame.sandbox}
            aspectRatio={embed.frame.aspectRatio}
            height={embed.frame.height}
            label={t('embeds.embed.load', { provider })}
            badge={provider}
            thumbnail={embed.thumbnail}
            note={t('embeds.embed.consent', { provider })}
            consent={consent}
          />
          <figcaption className="pc-embed-caption">
            {embed.title && <span className="pc-embed-title">{embed.title}</span>}
            <a className="pc-embed-source" href={embed.canonical} target="_blank" rel={externalRel}>
              {t('embeds.embed.openOn', { provider })}
            </a>
          </figcaption>
        </figure>
      </MediaFrame>
    </NodeViewWrapper>
  );
}
