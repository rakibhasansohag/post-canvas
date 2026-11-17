'use client';
// The headless hook behind `PostCanvas`: a Tiptap editor with the Post Canvas kit, kept in step with its options.
// It bridges React to an imperative editor: refs carry the latest document and callbacks into the editor's construction
// (read once per rebuild), and the editor's own storage is updated in place. The React Compiler rules below don't
// model that, so they're off for this file.
/* eslint-disable react-hooks/refs, react-hooks/preserve-manual-memoization, react-hooks/immutability */
import { Extension, type AnyExtension, type Editor, type FocusPosition, type JSONContent } from '@tiptap/core';
import { Markdown } from '@tiptap/markdown';
import { useEditor } from '@tiptap/react';
import { useEffect, useMemo, useRef } from 'react';
import { updatePostCanvasCore } from '../core/extension';
import { resolveFeatures } from '../core/features';
import { createTranslator } from '../core/i18n';
import { postCanvasKit } from '../core/kit';
import type { Adapters, FeatureOverrides, Features, Locale, NotifyKind, PresetName, Translator } from '../core/types';
import en from '../locales/en/index';
import type { Classifier } from '../text/classify';
import type { Limits } from '../text/limits';
import { presets } from '../text/presets';

/** The format of `defaultContent` when it's a string. */
export type ContentFormat = 'json' | 'html' | 'markdown';

/** What `onChange` and `onSubmit` receive. */
export interface PostCanvasChange {
  json: JSONContent;
  editor: Editor;
}

/** Options of `usePostCanvasEditor`. */
export interface UsePostCanvasEditorOptions {
  /** The starting document: Tiptap JSON, or an HTML or Markdown string (see `contentFormat`). Read on mount. */
  defaultContent?: JSONContent | string;
  /** How to read a string `defaultContent`. Default `html`. */
  contentFormat?: ContentFormat;
  /**
   * Called after changes, at most once per animation frame. There is no controlled `value`: set content through
   * `editor.commands.setContent()` or `PostCanvas`'s `ref.setContent()`. The editor also comes as a second argument,
   * for callers written against the first preview.
   */
  onChange?: (change: PostCanvasChange, editor: Editor) => void;
  /** The starting feature set. Default `full`. */
  preset?: PresetName;
  /** Changes to the preset's features. Changing them rebuilds the editor and keeps the content. */
  features?: FeatureOverrides;
  adapters?: Adapters;
  /** Default English. */
  locale?: Locale;
  /** Default: the preset's limits. */
  limits?: Limits;
  /** Default: the preset's classifier. `null` turns classification off. */
  classify?: Classifier | null;
  readOnly?: boolean;
  autofocus?: FocusPosition;
  /** Shown in an empty document. Default: the locale's placeholder. */
  placeholder?: string;
  /** Enter calls `onSubmit` instead of starting a new paragraph; Shift-Enter adds a line break. */
  submitOnEnter?: boolean;
  onSubmit?: (change: PostCanvasChange) => void;
  /** Called with each new editor instance (also after a features change rebuilds it). */
  onReady?: (editor: Editor) => void;
  /** Receives every notice. `PostCanvas` passes its toasts. Default: the console. */
  notify?: (message: string, kind?: NotifyKind) => void;
  /** Extra Tiptap extensions, added after the kit. Changing them doesn't rebuild the editor. */
  extensions?: AnyExtension[];
}

/** What `usePostCanvasEditor` returns. */
export interface PostCanvasEditorState {
  /** `null` until mounted (the editor renders on the client). */
  editor: Editor | null;
  /** The resolved features. */
  features: Features;
  t: Translator;
  adapters: Adapters;
  limits: Limits;
  classifier: Classifier | null;
}

const noAdapters: Adapters = {};

/** Calls `onSubmit` on Enter while `submitOnEnter` is on and no suggestion list is open. */
function submitExtension(latest: { current: UsePostCanvasEditorOptions }) {
  return Extension.create({
    name: 'postCanvasSubmit',
    // Before the core Enter keymap. It yields while a suggestion list is open, so picking still works.
    priority: 101,
    addKeyboardShortcuts() {
      return {
        Enter: ({ editor }) => {
          const { submitOnEnter, onSubmit } = latest.current;
          if (!submitOnEnter || !onSubmit) return false;
          if (editor.storage.postCanvasText?.menu.getSuggestion()) return false;
          onSubmit({ json: editor.getJSON(), editor });
          return true;
        },
        'Shift-Enter': ({ editor }) => (latest.current.submitOnEnter ? editor.commands.setHardBreak() : false),
      };
    },
  });
}

/**
 * A Post Canvas editor without the chrome: the kit for the preset and features, the translator, adapters, limits and
 * classifier, kept current as the options change. Changing `features`, `preset` or the upload adapter's presence
 * rebuilds the editor and keeps its content; everything else updates in place. Render it with Tiptap's
 * `<EditorContent editor={editor} />`, or use `PostCanvas` for the full editor.
 */
export function usePostCanvasEditor(options: UsePostCanvasEditorOptions = {}): PostCanvasEditorState {
  const {
    defaultContent,
    contentFormat = 'html',
    preset = 'full',
    features,
    adapters = noAdapters,
    locale = en,
    readOnly = false,
    autofocus = false,
    placeholder,
  } = options;
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });

  const t = useMemo(() => createTranslator(locale), [locale]);
  const definition = presets[preset] ?? presets.full;
  // Inline `limits` objects are common too: follow their value.
  const limitsKey = JSON.stringify(options.limits ?? definition.limits);
  const limits = useMemo(() => JSON.parse(limitsKey) as Limits, [limitsKey]);
  const classifier = options.classify === undefined ? definition.classifier : options.classify;

  // Apps often pass new `features` objects on every render, so the editor follows the resolved value.
  const featuresKey = JSON.stringify(resolveFeatures(preset, features, { adapters }));
  const resolved = useMemo(() => JSON.parse(featuresKey) as Features, [featuresKey]);

  // The latest document, so a rebuild keeps it.
  const content = useRef<JSONContent | null>(null);
  const frame = useRef(0);
  const submit = useMemo(() => submitExtension(latest), []);
  const markdown = typeof defaultContent === 'string' && contentFormat === 'markdown';

  const editor = useEditor(
    {
      extensions: [
        ...postCanvasKit(resolved, {
          t,
          adapters,
          notify: (message, kind) => (latest.current.notify ?? consoleNotify)(message, kind),
        }),
        submit,
        ...(markdown ? [Markdown] : []),
        ...(latest.current.extensions ?? []),
      ],
      content: content.current ?? defaultContent ?? '',
      contentType: content.current ? 'json' : markdown ? 'markdown' : undefined,
      editable: !readOnly,
      autofocus,
      immediatelyRender: false,
      shouldRerenderOnTransaction: false,
      editorProps: {
        attributes: {
          class: 'pc-content',
          role: 'textbox',
          'aria-multiline': 'true',
          'aria-label': t('core.editor.label'),
        },
      },
      onCreate: ({ editor: created }) => {
        const storage = created.storage.postCanvasText;
        if (storage) {
          storage.limits = limits;
          storage.classifier = classifier;
          storage.placeholder = placeholder ?? null;
        }
        latest.current.onReady?.(created);
      },
      onUpdate: ({ editor: current }) => {
        content.current = current.getJSON();
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => {
          if (!current.isDestroyed) latest.current.onChange?.({ json: current.getJSON(), editor: current }, current);
        });
      },
    },
    // The schema follows the features, so a feature change rebuilds the editor. Everything else updates in place.
    [resolved],
  );

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  useEffect(() => {
    if (editor && editor.isEditable === readOnly) editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    updatePostCanvasCore(editor, { t, adapters, features: resolved });
    const storage = editor.storage.postCanvasText;
    if (storage) {
      storage.limits = limits;
      storage.classifier = classifier;
      storage.placeholder = placeholder ?? null;
    }
    editor.view.dom.setAttribute('aria-label', t('core.editor.label'));
    // A meta transaction, so the placeholder, problems and status bar pick up the new values.
    editor.view.dispatch(editor.state.tr.setMeta('postCanvasOptions', true).setMeta('addToHistory', false));
  }, [editor, t, adapters, resolved, limits, classifier, placeholder]);

  return { editor, features: resolved, t, adapters, limits, classifier };
}

function consoleNotify(message: string, kind: NotifyKind = 'info'): void {
  if (kind === 'error') console.error(`[post-canvas] ${message}`);
  else console.info(`[post-canvas] ${message}`);
}
