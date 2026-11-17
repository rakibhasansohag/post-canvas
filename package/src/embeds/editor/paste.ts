// The paste rule: a bare link pasted into an empty paragraph becomes a video, an embed or a link card. The link is
// inserted first, as its own undo step, so Undo turns the embed back into the plain link.
import { Extension, type Editor } from '@tiptap/core';
import { closeHistory } from '@tiptap/pm/history';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { createKey } from '../../core/ids';
import { classifyLink, fetchEmbedMetadata, fetchLinkCard, linkParagraph } from './actions';

const key = new PluginKey('postCanvasEmbedPaste');

/** The single link in pasted text, or `null` when the text is anything more. */
function pastedLink(text: string): string | null {
  const value = text.trim();
  return value && !/\s/.test(value) && value.length <= 2048 && /^https?:\/\//i.test(value) ? value : null;
}

/** Inserts the link into the empty paragraph at the cursor, then turns the paragraph into the embed node. */
function pasteLink(editor: Editor, url: string): boolean {
  const target = classifyLink(editor, url);
  if (target.kind === 'invalid' || target.kind === 'unsupported') return false;
  const { features, adapters } = editor.storage.postCanvasCore;
  const canCard = target.kind === 'link' && features.linkCard && !!adapters.links && !!editor.schema.nodes.linkCard;
  if (target.kind === 'link' && !canCard) return false;

  const { state } = editor;
  const { $from } = state.selection;
  const from = $from.before();
  const paragraph = linkParagraph(editor, target.kind === 'link' ? target.url : url);
  const linkNode = state.schema.nodeFromJSON(paragraph);
  editor.view.dispatch(state.tr.replaceWith(from, from + $from.parent.nodeSize, linkNode).scrollIntoView());

  const replace = (content: Parameters<Editor['schema']['nodeFromJSON']>[0], expected: string) => {
    const now = editor.state;
    const node = now.doc.nodeAt(from);
    // Only if the writer hasn't changed the pasted link meanwhile.
    if (!node || node.type.name !== 'paragraph' || node.textContent !== expected) return;
    const tr = closeHistory(now.tr).replaceWith(from, from + node.nodeSize, now.schema.nodeFromJSON(content));
    editor.view.dispatch(tr.scrollIntoView());
  };

  if (target.kind === 'video' || target.kind === 'embed') {
    replace(target.node, url);
    void fetchEmbedMetadata(editor, target.node);
    return true;
  }
  const id = createKey('paste-');
  fetchLinkCard(editor, id, target.url)
    .then((card) => replace(card, target.url))
    .catch(() => {
      // The plain link stays: nothing to undo.
    });
  return true;
}

/** Turns a bare link pasted into an empty top-level paragraph into an embed or link card. */
export const EmbedPaste = Extension.create({
  name: 'postCanvasEmbedPaste',

  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        key,
        props: {
          handlePaste(view, event) {
            const url = pastedLink(event.clipboardData?.getData('text/plain') ?? '');
            if (!url || !editor.isEditable) return false;
            const { selection } = view.state;
            const { $from } = selection;
            if (!selection.empty || $from.depth !== 1 || $from.parent.type.name !== 'paragraph') return false;
            if ($from.parent.content.size > 0) return false;
            return pasteLink(editor, url);
          },
        },
      }),
    ];
  },
});
