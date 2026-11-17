'use client';
import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';
import { FileUp, Trash2 } from 'lucide-react';
import { MediaFrame } from '../../core/react/media-frame';
import { MediaToolbar } from '../../core/react/media-toolbar';
import { ToolButton } from '../../core/react/tool-button';
import { useTranslator } from '../../core/react/use-translator';
import { fileAttrsOf } from '../coerce';
import { fileSpec } from '../html';
import { openFilePicker } from '../upload/picker';
import { uploadFiles } from '../upload/pipeline';
import { specToReact } from '../view/spec-to-react';
import { runFrameKey, useEditable } from '../../core/react/node-view';
import { useUpload } from './node-view-utils';
import { UploadStatus, uploadView } from './upload-status';

/** The `file` block in the editor: its card, with tools to replace and remove it. Read-only, the card downloads it. */
export function FileNodeView({ editor, node, getPos, selected, deleteNode }: ReactNodeViewProps) {
  const t = useTranslator();
  const attrs = fileAttrsOf(node.attrs);
  const entry = useUpload(editor, attrs.uploadKey);
  const editable = useEditable(editor);
  const manager = editor.storage.postCanvasMedia?.manager ?? null;
  const label = t('media.file.label', { name: attrs.name });

  const replace = () => {
    const accept = editor.storage.postCanvasCore.adapters.upload?.accept?.file;
    void openFilePicker(accept ? { accept } : {}).then((files) => {
      if (files.length > 0 && attrs.id) void uploadFiles(editor, files, { type: 'replace', nodeId: attrs.id });
    });
  };

  // While editing, the card is a plain card (a click selects it); read-only, it's the download link.
  const card = specToReact(fileSpec(attrs), (tag, props, children) =>
    editable && tag === 'a' ? (
      <span key={props.key as string | number | undefined} className={props.className as string}>
        {children}
      </span>
    ) : undefined,
  );

  return (
    <NodeViewWrapper className="pc-node-view">
      <MediaFrame
        label={label}
        selected={selected}
        onKey={(key) => runFrameKey(editor, getPos, key)}
        onRemove={deleteNode}
        className="pc-frame--file"
        toolbar={
          editable ? (
            <MediaToolbar label={t('core.frame.tools', { label })}>
              <ToolButton icon={FileUp} label={t('media.file.replace')} onClick={replace} />
              <ToolButton icon={Trash2} label={t('media.file.remove')} onClick={deleteNode} />
            </MediaToolbar>
          ) : undefined
        }
      >
        <div className="pc-file-stage">
          {card}
          <UploadStatus
            view={uploadView(attrs.uploadKey, entry)}
            t={t}
            onRetry={() => attrs.uploadKey && manager?.start(attrs.uploadKey)}
            onReplace={editable ? replace : undefined}
          />
        </div>
      </MediaFrame>
    </NodeViewWrapper>
  );
}
