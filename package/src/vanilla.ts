/**
 * The `post-canvas/vanilla` entry and the CDN bundle: the editor on any page, without writing React. It mounts
 * `<PostCanvas>` into an element with its own React root. From the CDN, the same functions are on the global
 * `PostCanvas`: `PostCanvas.create(element, options)`, `PostCanvas.renderToHTML(json)`, `PostCanvas.locales.de` and
 * `PostCanvas.activateEmbeds(root)`.
 *
 * @example
 * ```html
 * <link rel="stylesheet" href="https://unpkg.com/post-canvas/dist/cdn/post-canvas.css" />
 * <div id="editor"></div>
 * <script src="https://unpkg.com/post-canvas/dist/cdn/post-canvas.iife.js"></script>
 * <script>
 *   const canvas = PostCanvas.create(document.getElementById('editor'), { preset: 'article' });
 *   canvas.on('change', (json) => console.log(json));
 * </script>
 * ```
 *
 * @packageDocumentation
 */
import type { Editor, JSONContent } from '@tiptap/core';
import { createElement, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { Locale, PostFields } from './core/types';
import { setEmbedConsent } from './embeds/editor/storage';
import de from './locales/de/index';
import en from './locales/en/index';
import es from './locales/es/index';
import fr from './locales/fr/index';
import it from './locales/it/index';
import pt from './locales/pt/index';
import { renderToHTML } from './output/html';
import { PostCanvas, type PostCanvasHandle, type PostCanvasProps } from './react/post-canvas';

/** Options of `createPostCanvas()`: `PostCanvas`'s props, minus the callbacks (use `on()`), plus `embedConsent`. */
export type CreatePostCanvasOptions = Omit<PostCanvasProps, 'onChange' | 'onReady' | 'onFieldsChange' | 'slots'> & {
  /** `click` (default) shows a placeholder until the writer clicks a player; `auto` loads players straight away. */
  embedConsent?: 'click' | 'auto';
};

/** What `on()` can listen to, and what each listener receives. */
export interface PostCanvasEvents {
  /** The document changed. At most once per animation frame. */
  change: JSONContent;
  /** The title or cover changed. */
  fieldsChange: PostFields;
  /** The editor mounted. */
  ready: Editor;
}

/** A mounted editor. */
export interface PostCanvasInstance {
  /** The Tiptap editor, or `null` until it has mounted (see `ready`). */
  readonly editor: Editor | null;
  /** Resolves with the editor once it has mounted. */
  readonly ready: Promise<Editor>;
  /** The document as Tiptap JSON. Save this. */
  getJSON(): JSONContent;
  /** The document as sanitized HTML, without the `.pc-view` wrapper. */
  getHTML(): string;
  /** Replaces the document: Tiptap JSON, HTML, or Markdown with `format: 'markdown'`. */
  setContent(content: JSONContent | string, format?: 'html' | 'markdown'): void;
  /** Changes options, such as `theme`, `readOnly`, `locale` or `features`, and re-renders. */
  update(options: Partial<CreatePostCanvasOptions>): void;
  /** Listens to an event. Returns a function that stops listening. */
  on<K extends keyof PostCanvasEvents>(event: K, listener: (value: PostCanvasEvents[K]) => void): () => void;
  /** Unmounts the editor and empties the element. */
  destroy(): void;
}

const emptyDoc: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] };

/**
 * Mounts the editor into `element`. Content is uncontrolled: pass `defaultContent`, listen to `change`, and call
 * `getJSON()` when saving.
 */
export function createPostCanvas(element: HTMLElement, options: CreatePostCanvasOptions = {}): PostCanvasInstance {
  const listeners: { [K in keyof PostCanvasEvents]: Set<(value: PostCanvasEvents[K]) => void> } = {
    change: new Set(),
    fieldsChange: new Set(),
    ready: new Set(),
  };
  const emit = <K extends keyof PostCanvasEvents>(event: K, value: PostCanvasEvents[K]) => {
    for (const listener of listeners[event]) listener(value);
  };
  const handle = createRef<PostCanvasHandle>();
  let current: CreatePostCanvasOptions = { ...options };
  let editor: Editor | null = null;
  let destroyed = false;
  let resolveReady: (editor: Editor) => void = () => undefined;
  const ready = new Promise<Editor>((resolve) => {
    resolveReady = resolve;
  });
  const root: Root = createRoot(element);

  const render = () => {
    const { embedConsent, ...props } = current;
    root.render(
      createElement(PostCanvas, {
        ...props,
        ref: handle,
        onChange: ({ json }) => emit('change', json),
        onFieldsChange: (fields) => emit('fieldsChange', fields),
        onReady: (instance) => {
          editor = instance;
          if (embedConsent) setEmbedConsent(instance, embedConsent);
          resolveReady(instance);
          emit('ready', instance);
        },
      }),
    );
  };
  render();

  return {
    get editor() {
      return editor;
    },
    ready,
    getJSON: () => editor?.getJSON() ?? emptyDoc,
    getHTML: () =>
      editor
        ? renderToHTML(editor.getJSON(), { features: editor.storage.postCanvasCore.features, wrapper: false })
        : '',
    setContent: (content, format = 'html') => {
      if (handle.current) handle.current.setContent(content, format);
      else void ready.then(() => handle.current?.setContent(content, format));
    },
    update: (changes) => {
      if (destroyed) return;
      current = { ...current, ...changes };
      if (editor && changes.embedConsent) setEmbedConsent(editor, changes.embedConsent);
      render();
    },
    on: (event, listener) => {
      listeners[event].add(listener);
      return () => {
        listeners[event].delete(listener);
      };
    },
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      root.unmount();
      editor = null;
      for (const set of Object.values(listeners)) set.clear();
    },
  };
}

/** Every built-in language, by code. */
export const locales: Record<'en' | 'de' | 'es' | 'fr' | 'it' | 'pt', Locale> = { en, de, es, fr, it, pt };

/** `createPostCanvas`, under the short name the CDN global uses: `PostCanvas.create(element, options)`. */
export const create = createPostCanvas;

export { renderToHTML, type RenderHTMLOptions } from './output/html';
export { activateEmbeds } from './output/activate-embeds';
export { sanitizeDocument } from './output/sanitize';
export { registerEmbedProvider, defineEmbedProvider, type EmbedProvider } from './embeds/providers/index';
