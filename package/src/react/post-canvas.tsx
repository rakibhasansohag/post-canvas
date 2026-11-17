'use client';
// Wave-0 shell, owned by chat B from wave 1: the full prop contract, toolbar, menus and fields belong there.
import type { Editor, JSONContent } from '@tiptap/core';
import { Placeholder } from '@tiptap/extensions';
import { EditorContent, useEditor } from '@tiptap/react';
import { useEffect, useMemo } from 'react';
import { updatePostCanvasCore } from '../core/extension';
import { createTranslator } from '../core/i18n';
import { resolveFeatures } from '../core/features';
import { postCanvasKit } from '../core/kit';
import { PostCanvasProvider } from '../core/react/context';
import type { Adapters, FeatureOverrides, Features, Locale, PresetName } from '../core/types';
import en from '../locales/en/index';

/** Light, dark, or following the reader's system setting. */
export type PostCanvasTheme = 'light' | 'dark' | 'auto';

/** Props of `PostCanvas`. */
export interface PostCanvasProps {
  /** The starting document: Tiptap JSON or an HTML string. Read once, on mount. */
  defaultContent?: JSONContent | string;
  /** Called with the document's JSON after every change. */
  onChange?: (json: JSONContent, editor: Editor) => void;
  /** The starting feature set. Default `full`. */
  preset?: PresetName;
  /** Changes to the preset's features. */
  features?: FeatureOverrides;
  /** How the editor talks to the app: uploads, mentions, previews and storage. */
  adapters?: Adapters;
  /** Default English. */
  locale?: Locale;
  /** Default `auto`. */
  theme?: PostCanvasTheme;
  readOnly?: boolean;
  /** Shown in an empty document. Defaults to the locale's placeholder. */
  placeholder?: string;
}

const noAdapters: Adapters = {};

/** The Post Canvas editor. */
export function PostCanvas({
  defaultContent,
  onChange,
  preset = 'full',
  features,
  adapters = noAdapters,
  locale = en,
  theme = 'auto',
  readOnly = false,
  placeholder,
}: PostCanvasProps) {
  const t = useMemo(() => createTranslator(locale), [locale]);
  // Apps often pass new `features` and `adapters` objects on every render, so the editor follows the resolved value, not
  // the object identity.
  const featuresKey = JSON.stringify(resolveFeatures(preset, features, { adapters }));
  const resolved = useMemo(() => JSON.parse(featuresKey) as Features, [featuresKey]);

  const editor = useEditor(
    {
      extensions: [
        ...postCanvasKit(resolved, { t, adapters }),
        Placeholder.configure({ placeholder: placeholder ?? t('core.editor.placeholder') }),
      ],
      content: defaultContent ?? '',
      editable: !readOnly,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: 'pc-content',
          role: 'textbox',
          'aria-multiline': 'true',
          'aria-label': t('core.editor.label'),
        },
      },
      onUpdate: ({ editor: current }) => onChange?.(current.getJSON(), current),
    },
    // The schema follows the features, so a feature change rebuilds the editor. Everything else updates in place.
    [resolved],
  );

  useEffect(() => {
    if (editor && editor.isEditable === readOnly) editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (editor) updatePostCanvasCore(editor, { t, adapters, features: resolved });
  }, [editor, t, adapters, resolved]);

  const context = useMemo(() => ({ editor, t, adapters, features: resolved }), [editor, t, adapters, resolved]);

  return (
    <PostCanvasProvider value={context}>
      <div className="pc-root" data-pc-theme={theme}>
        <EditorContent editor={editor} />
      </div>
    </PostCanvasProvider>
  );
}
