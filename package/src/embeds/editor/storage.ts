// The embeds' editor state: lookups in flight, so the problems list can say "still loading" and a cancel can abort.
import type { Editor } from '@tiptap/core';

/** Shared state of the embed editor extensions, in `editor.storage.postCanvasEmbeds`. */
export interface EmbedsStorage {
  /** Node ids with a metadata or preview lookup running. */
  pending: Set<string>;
  /** Abort controllers by node id. */
  controllers: Map<string, AbortController>;
  /** Whether players load before a click: `click` (default) or `auto`. */
  consent: 'click' | 'auto';
}

declare module '@tiptap/core' {
  interface Storage {
    /** State of the Post Canvas embed extensions. */
    postCanvasEmbeds: EmbedsStorage;
  }
}

/** The embeds storage, or a fresh one when the extension isn't loaded. */
export function embedsStorage(editor: Editor): EmbedsStorage {
  const storage = (editor.storage as Partial<Record<'postCanvasEmbeds', EmbedsStorage>>).postCanvasEmbeds;
  return storage ?? { pending: new Set(), controllers: new Map(), consent: 'click' };
}

/** Marks a lookup as started or finished, and nudges the editor so problem lists update. */
export function setPending(editor: Editor, id: string, pending: boolean, controller?: AbortController): void {
  const storage = embedsStorage(editor);
  if (pending) {
    storage.pending.add(id);
    if (controller) storage.controllers.set(id, controller);
  } else {
    storage.pending.delete(id);
    storage.controllers.delete(id);
  }
  if (!editor.isDestroyed)
    editor.view.dispatch(editor.state.tr.setMeta('postCanvasEmbeds', { id, pending }).setMeta('addToHistory', false));
}

/** Aborts a running lookup for a node. */
export function abortLookup(editor: Editor, id: string): void {
  embedsStorage(editor).controllers.get(id)?.abort();
}

/**
 * Sets whether third-party players load in the editor before a click (`click`, the default, or `auto`), and redraws
 * the embeds. `PostCanvas` and `createPostCanvas` call it for their `embedConsent` option.
 */
export function setEmbedConsent(editor: Editor, consent: 'click' | 'auto'): void {
  const storage = (editor.storage as Partial<Record<'postCanvasEmbeds', EmbedsStorage>>).postCanvasEmbeds;
  if (!storage || storage.consent === consent) return;
  storage.consent = consent;
  if (!editor.isDestroyed) editor.view.dispatch(editor.state.tr.setMeta('addToHistory', false));
}
