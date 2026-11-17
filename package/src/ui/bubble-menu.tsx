'use client';
// The selection menu: marks, link, colour and "turn into", over a text selection.
import { isTextSelection } from '@tiptap/core';
import { BubbleMenu } from '@tiptap/react/menus';
import { useRef } from 'react';
import { BlockTypeMenu, ColorMenu, LinkButton, MarkButtons } from './controls';
import { useRovingFocus } from './roving';
import { useEditorUi } from './ui-context';

/** Shown over a non-empty text selection outside code blocks. */
export function SelectionMenu() {
  const { editor, t, features } = useEditorUi();
  const root = useRef<HTMLDivElement>(null);
  const roving = useRovingFocus(root);
  return (
    <BubbleMenu
      ref={root}
      editor={editor}
      pluginKey="postCanvasSelectionMenu"
      shouldShow={({ editor: e, state, from, to }) => {
        if (!e.isEditable || from === to || !isTextSelection(state.selection)) return false;
        if (e.isActive('codeBlock')) return false;
        return state.doc.textBetween(from, to).trim().length > 0;
      }}
      options={{ placement: 'top', offset: 8 }}
      className="pc-bubble"
      role="toolbar"
      aria-label={t('ui.selection.label')}
      {...roving}
    >
      <MarkButtons marks={['bold', 'italic', 'underline', 'strike', 'code']} />
      {features.link && <LinkButton />}
      {(features.color || features.highlight) && <ColorMenu />}
      <BlockTypeMenu compact />
    </BubbleMenu>
  );
}
