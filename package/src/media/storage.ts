// The media extension's storage, typed through Tiptap's `Storage` augmentation.
import type { UploadManager } from './upload/manager';

/** What the media extension keeps in `editor.storage.postCanvasMedia`. */
export interface MediaStorage {
  /** The uploads of this editor. `null` before the editor is created. */
  manager: UploadManager | null;
}

declare module '@tiptap/core' {
  interface Storage {
    /** The media extension's uploads. */
    postCanvasMedia: MediaStorage;
  }
}
