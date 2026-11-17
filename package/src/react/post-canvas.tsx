'use client';
// The Post Canvas editor: the editor from `usePostCanvasEditor`, with its toolbar, menus, fields, status bar,
// notifications and autosave.
import type { Editor, FocusPosition, JSONContent } from '@tiptap/core';
import { EditorContent } from '@tiptap/react';
import { X } from 'lucide-react';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { PostCanvasProvider } from '../core/react/context';
import type { PostFields } from '../core/types';
import type { PostCanvasTextStorage } from '../text/kit';
import { createAutosave, localDraftStorage, type AutosaveController, type AutosaveOptions } from '../text/autosave';
import { BlockHandle } from '../ui/block-handle';
import { SelectionMenu } from '../ui/bubble-menu';
import { Fields } from '../ui/fields';
import { InsertButton } from '../ui/insert-button';
import { LinkBubble, LinkPopover, selectionAnchor } from '../ui/link-popover';
import { NotificationArea, useNotifications } from '../ui/notifications';
import { StatusBar } from '../ui/status-bar';
import { SuggestionMenu } from '../ui/suggestion-menu';
import { Toolbar } from '../ui/toolbar';
import { EditorUiProvider, useDocInfo, type EditorUi } from '../ui/ui-context';
import {
  usePostCanvasEditor,
  type ContentFormat,
  type PostCanvasChange,
  type UsePostCanvasEditorOptions,
} from './use-post-canvas-editor';
import type { ReferenceElement } from '@floating-ui/dom';

/** Light, dark, or following the reader's system setting. */
export type PostCanvasTheme = 'light' | 'dark' | 'auto';

/** Places for the app's own content around the canvas. */
export interface PostCanvasSlots {
  /** Between the fields and the canvas. */
  beforeContent?: ReactNode;
  /** Between the canvas and the status bar. */
  afterContent?: ReactNode;
  /** Under the status bar, such as a publish button. */
  footer?: ReactNode;
}

/** Props of `PostCanvas`. */
export interface PostCanvasProps extends Omit<UsePostCanvasEditorOptions, 'notify' | 'extensions' | 'autofocus'> {
  /** The title and cover, controlled. Leave out to let the editor keep them (see `defaultFields`). */
  fields?: PostFields;
  /** The starting title and cover when `fields` isn't set. Read on mount. */
  defaultFields?: PostFields;
  /** Called when the title or cover changes. Which fields show is up to the preset and features. */
  onFieldsChange?: (fields: PostFields) => void;
  /** Default `auto`. */
  theme?: PostCanvasTheme;
  /** Saves drafts as you type and brings them back. `true` for the defaults. Uses `adapters.storage`, else localStorage. */
  autosave?: boolean | AutosaveOptions;
  /** Puts the caret in the editor on mount: `true`, `'start'`, `'end'` or a position. */
  autofocus?: FocusPosition;
  className?: string;
  slots?: PostCanvasSlots;
}

/** What `ref` exposes. */
export interface PostCanvasHandle {
  /** The Tiptap editor, or `null` before mount. */
  readonly editor: Editor | null;
  /** Puts the caret in the editor. */
  focus: (position?: FocusPosition) => void;
  /** Empties the document and the fields, and forgets the autosaved draft. Call it after the app has saved. */
  clear: () => void;
  /** Replaces the document. Strings are HTML, or Markdown with `format: 'markdown'`. */
  setContent: (content: JSONContent | string, format?: ContentFormat) => void;
  /** Forgets the autosaved draft only. */
  clearDraft: () => Promise<void>;
}

/**
 * The Post Canvas editor. Content is uncontrolled: pass `defaultContent` and read changes in `onChange` (at most once
 * per animation frame). To replace the content later, use the `ref`'s `setContent()`. There is no controlled `value`
 * prop, because round-tripping the document through React state on every keystroke loses the selection and costs a
 * full re-parse.
 *
 * @example
 * <PostCanvas preset="social" adapters={adapters} onChange={({ json }) => save(json)} />
 */
export const PostCanvas = forwardRef<PostCanvasHandle, PostCanvasProps>(function PostCanvas(props, ref) {
  const {
    fields: controlledFields,
    defaultFields,
    onFieldsChange,
    theme = 'auto',
    autosave,
    className,
    slots,
    readOnly = false,
    onChange,
    ...editorOptions
  } = props;
  const notifications = useNotifications();
  const [internalFields, setInternalFields] = useState<PostFields>(defaultFields ?? {});
  const fields = controlledFields ?? internalFields;
  const fieldsRef = useRef(fields);
  const autosaveRef = useRef<AutosaveController | null>(null);
  // Nothing is saved until a stored draft has had its chance to come back, so an empty start never overwrites it.
  const saving = useRef(false);
  const [restored, setRestored] = useState(false);

  const handleChange = useCallback(
    (change: PostCanvasChange) => {
      if (saving.current) autosaveRef.current?.schedule(change.json, fieldsRef.current);
      onChange?.(change, change.editor);
    },
    [onChange],
  );

  const { editor, features, t, adapters, limits } = usePostCanvasEditor({
    ...editorOptions,
    readOnly,
    onChange: handleChange,
    notify: notifications.notify,
  });

  // Fields: mirrored into the editor, so problems such as a missing title see them.
  const controlled = controlledFields !== undefined;
  const setFields = useCallback(
    (next: PostFields) => {
      if (!controlled) setInternalFields(next);
      onFieldsChange?.(next);
    },
    [controlled, onFieldsChange],
  );
  useEffect(() => {
    fieldsRef.current = fields;
    if (!editor || editor.isDestroyed) return;
    const text = editor.storage.postCanvasText as PostCanvasTextStorage | undefined;
    if (text) text.fields = fields;
    editor.view.dispatch(editor.state.tr.setMeta('postCanvasFields', true).setMeta('addToHistory', false));
    if (saving.current) autosaveRef.current?.schedule(editor.getJSON(), fields);
  }, [editor, fields]);

  // Autosave: one controller per key and storage. Restores once, on the first editor.
  const autosaveOptions = useMemo<AutosaveOptions | null>(
    () => (autosave ? (autosave === true ? {} : autosave) : null),
    // Follow the options' values, not the object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(autosave ?? null)],
  );
  const storage = adapters.storage ?? localDraftStorage;
  const restoreTried = useRef(false);
  useEffect(() => {
    if (!autosaveOptions) {
      autosaveRef.current = null;
      return;
    }
    const controller = createAutosave(storage, autosaveOptions);
    autosaveRef.current = controller;
    const flush = () => controller.flush();
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      controller.flush();
      controller.dispose();
      if (autosaveRef.current === controller) autosaveRef.current = null;
    };
  }, [autosaveOptions, storage]);
  useEffect(() => {
    const controller = autosaveRef.current;
    if (!editor || !controller || restoreTried.current) return;
    if (autosaveOptions?.restore === false || readOnly) {
      restoreTried.current = true;
      saving.current = true;
      return;
    }
    // Only a live editor counts: under StrictMode (or a quick rebuild) the first instance can go before the draft loads.
    let live = true;
    void controller.load().then((snapshot) => {
      if (!live || editor.isDestroyed || restoreTried.current) return;
      restoreTried.current = true;
      if (snapshot) {
        editor.commands.setContent(snapshot.content, { emitUpdate: true });
        if (snapshot.fields) setFields(snapshot.fields);
        setRestored(true);
      }
      saving.current = true;
    });
    return () => {
      live = false;
    };
  }, [editor, autosaveOptions, readOnly, setFields]);

  const discardDraft = () => {
    setRestored(false);
    void autosaveRef.current?.clear();
    if (!editor) return;
    editor.commands.setContent(props.defaultContent ?? '', {
      emitUpdate: true,
      contentType:
        typeof props.defaultContent === 'string' && props.contentFormat === 'markdown' ? 'markdown' : undefined,
    });
    setFields(defaultFields ?? {});
    // The reset above schedules a save of the empty state; forget the draft after it too.
    void autosaveRef.current?.clear();
  };

  // The link popover, opened from the toolbar, the selection menu, the link bar or Mod-K.
  const [link, setLink] = useState<{ anchor: ReferenceElement } | null>(null);
  const openLink = useCallback(
    (anchor?: ReferenceElement | null) => {
      if (!editor) return;
      setLink({ anchor: anchor ?? selectionAnchor(editor) });
    },
    [editor],
  );
  useEffect(() => {
    if (!editor) return;
    const text = editor.storage.postCanvasText as PostCanvasTextStorage | undefined;
    return text?.menu.on('link', () => {
      if (features.link) openLink();
    });
  }, [editor, features.link, openLink]);

  useImperativeHandle(
    ref,
    () => ({
      get editor() {
        return editor;
      },
      focus: (position) => void editor?.commands.focus(position ?? 'end'),
      clear: () => {
        editor?.commands.clearContent(true);
        setFields({});
        setRestored(false);
        void autosaveRef.current?.clear();
      },
      setContent: (content, format) =>
        void editor?.commands.setContent(content, {
          emitUpdate: true,
          contentType: typeof content === 'string' ? (format === 'markdown' ? 'markdown' : 'html') : 'json',
        }),
      clearDraft: async () => {
        setRestored(false);
        await autosaveRef.current?.clear();
      },
    }),
    [editor, setFields],
  );

  const info = useDocInfo(editor);
  const canvas = useRef<HTMLDivElement>(null);
  // Narrow canvases put the handle in a right-hand gutter, so it never sits on top of the +.
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setNarrow(element.clientWidth < 560));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const chrome = !readOnly && editor !== null;
  const fieldsGated = info.classification !== null;
  const showFields = !fieldsGated || info.classification?.showFields === true;
  const titleMissing = info.problems.some((problem) => problem.code === 'title.missing');

  const context = useMemo(() => ({ editor, t, adapters, features }), [editor, t, adapters, features]);
  const ui = useMemo<EditorUi | null>(
    () => (editor ? { editor, t, features, limits, openLink } : null),
    [editor, t, features, limits, openLink],
  );

  const rootClass = ['pc-root', className].filter(Boolean).join(' ');
  return (
    <PostCanvasProvider value={context}>
      <div
        className={rootClass}
        data-pc-theme={theme}
        data-readonly={readOnly || undefined}
        data-gutter={(chrome && (features.insertButton || features.blockHandle)) || undefined}
        data-narrow={(chrome && narrow && (features.insertButton || features.blockHandle)) || undefined}
      >
        {ui && chrome && features.toolbar && (
          <EditorUiProvider value={ui}>
            <Toolbar />
          </EditorUiProvider>
        )}
        {restored && !readOnly && (
          <div className="pc-banner" role="status">
            <span>{t('ui.draft.restored')}</span>
            <button type="button" className="pc-button pc-button--quiet" onClick={discardDraft}>
              {t('ui.draft.discard')}
            </button>
            <button
              type="button"
              className="pc-banner__close"
              aria-label={t('ui.draft.dismiss')}
              onClick={() => setRestored(false)}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        )}
        <Fields
          fields={fields}
          onChange={setFields}
          editor={editor}
          t={t}
          showTitle={features.title && showFields}
          showCover={features.cover && showFields}
          titleMissing={titleMissing}
          readOnly={readOnly}
        />
        {slots?.beforeContent}
        <div ref={canvas} className="pc-canvas">
          <EditorContent editor={editor} />
          {ui && chrome && (
            <EditorUiProvider value={ui}>
              {features.insertButton && <InsertButton canvas={canvas} />}
              {features.blockHandle && <BlockHandle canvas={canvas} narrow={narrow} />}
              {features.bubbleMenu && <SelectionMenu />}
              {features.link && <LinkBubble />}
              {features.link && (
                <LinkPopover open={link !== null} anchor={link?.anchor ?? null} onClose={() => setLink(null)} />
              )}
              <SuggestionMenu />
            </EditorUiProvider>
          )}
        </div>
        {slots?.afterContent}
        {ui && chrome && features.statusBar && (
          <EditorUiProvider value={ui}>
            <StatusBar info={info} />
          </EditorUiProvider>
        )}
        {slots?.footer}
        <NotificationArea notifications={notifications} t={t} />
      </div>
    </PostCanvasProvider>
  );
});
