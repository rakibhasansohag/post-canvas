'use client';
// What every media node view shares: reading uploads. The frame keys, the editable state and the stop-event rule are
// in `core/react/node-view.ts`, shared with the embed node views.
import type { Editor } from '@tiptap/core';
import { useSyncExternalStore } from 'react';
import '../storage';
import type { UploadEntry, UploadManager } from '../upload/manager';

const noop = () => {};
const managerOf = (editor: Editor): UploadManager | null => editor.storage.postCanvasMedia?.manager ?? null;

/** Re-renders on every upload change and returns the manager. */
export function useUploads(editor: Editor): UploadManager | null {
  const manager = managerOf(editor);
  useSyncExternalStore(
    (listener) => manager?.subscribe(listener) ?? noop,
    () => manager?.version ?? 0,
    () => 0,
  );
  return manager;
}

/** One upload, kept current. */
export function useUpload(editor: Editor, key: string | null): UploadEntry | undefined {
  return useUploads(editor)?.get(key);
}
