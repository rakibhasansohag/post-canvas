'use client';
// The `linkCard` node in the editor: the card as readers see it, with tools to change the link, show it as a plain
// link, or remove it.
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Link2, Trash2, Unlink } from 'lucide-react';
import { MediaFrame } from '../../core/react/media-frame';
import { MediaToolbar } from '../../core/react/media-toolbar';
import { ToolButton } from '../../core/react/tool-button';
import { linkCardRender } from '../render-spec';
import { embedInputContent, linkParagraph } from './actions';
import { runFrameKey, useEditable } from './frame';

/** The editor view of a `linkCard` node. */
export function LinkCardNodeView({ node, editor, getPos, selected, deleteNode }: NodeViewProps) {
  const { t } = editor.storage.postCanvasCore;
  const editable = useEditable(editor);
  const card = linkCardRender(node.attrs);
  if (!card) return <NodeViewWrapper data-pc-node="linkCard" />;
  const label = `${t('embeds.linkCard.label')}: ${card.title}`;

  const replace = (content: Parameters<typeof editor.commands.insertContentAt>[1]) => {
    const pos = getPos();
    if (typeof pos !== 'number') return;
    editor
      .chain()
      .focus()
      .insertContentAt({ from: pos, to: pos + node.nodeSize }, content)
      .run();
  };

  return (
    <NodeViewWrapper data-pc-node="linkCard" className="pc-node-embed">
      <MediaFrame
        label={label}
        selected={selected}
        onRemove={deleteNode}
        onKey={(key) => runFrameKey(editor, getPos, key)}
        toolbar={
          editable ? (
            <MediaToolbar label={t('core.frame.tools', { label })}>
              <ToolButton
                icon={Link2}
                label={t('embeds.changeLink')}
                onClick={() => replace(embedInputContent('link', card.url))}
              />
              <ToolButton
                icon={Unlink}
                label={t('embeds.linkCard.toLink')}
                onClick={() => replace(linkParagraph(editor, card.url))}
              />
              <ToolButton icon={Trash2} label={t('embeds.linkCard.remove')} onClick={deleteNode} />
            </MediaToolbar>
          ) : undefined
        }
      >
        <div className={card.image ? 'pc-link-card' : 'pc-link-card pc-link-card-text'}>
          <div className="pc-link-card-anchor">
            {card.image && (
              <img className="pc-link-card-image" src={card.image} alt="" loading="lazy" decoding="async" />
            )}
            <span className="pc-link-card-body">
              <span className="pc-link-card-site">
                {card.favicon && (
                  <img className="pc-link-card-favicon" src={card.favicon} alt="" width={16} height={16} />
                )}
                {card.site}
              </span>
              <span className="pc-link-card-title">{card.title}</span>
              {card.description && <span className="pc-link-card-description">{card.description}</span>}
            </span>
          </div>
        </div>
      </MediaFrame>
    </NodeViewWrapper>
  );
}
