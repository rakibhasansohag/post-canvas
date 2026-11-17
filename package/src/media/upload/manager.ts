// Runs the editor's uploads: at most three at once, each with its own AbortSignal and progress, kept by `uploadKey`.
// Nodes in the document only hold the key; everything else (the file, the preview, the progress, the result) lives
// here, so undo and redo never lose a running upload.
import type { UploadAdapter, UploadResult } from '../../core/types';
import { createKey } from '../../core/ids';
import { safeMediaSrc } from '../../core/url';

/** Where an upload stands. */
export type UploadStatus =
  /** Known, but its node isn't in the document yet. */
  | 'staged'
  | 'queued'
  | 'uploading'
  | 'done'
  | 'failed'
  /** Its node left the document, so it was stopped. It starts again if the node comes back (undo). */
  | 'cancelled';

/** One upload. Read it with `UploadManager.get()`; it's replaced, never changed, so React can compare it. */
export interface UploadEntry {
  key: string;
  kind: 'image' | 'file';
  file: File;
  status: UploadStatus;
  /** From 0 to 1. */
  progress: number;
  /** Why it failed, from the adapter, for the console. People see a translated message. */
  error: string | null;
  /** A `blob:` URL of the file, shown while it uploads (images only). */
  preview: string | null;
  /** The adapter's answer once done. */
  result: UploadResult | null;
}

/** What the manager needs from the editor. */
export interface UploadManagerOptions {
  /** Read on every start, so a new adapter takes over at once. */
  getAdapter: () => UploadAdapter | undefined;
  /** At most this many at once. Default 3. */
  concurrency?: number;
  /** Called whenever an upload changes status (not for progress). */
  onChange?: (entry: UploadEntry) => void;
}

/** Keeps every upload of one editor. */
export class UploadManager {
  private readonly entries = new Map<string, UploadEntry>();
  private readonly controllers = new Map<string, AbortController>();
  private readonly queue: string[] = [];
  private readonly listeners = new Set<() => void>();
  private running = 0;
  private destroyed = false;
  private changes = 0;
  private readonly options: UploadManagerOptions;

  constructor(options: UploadManagerOptions) {
    this.options = options;
  }

  /** Registers a file to upload once its node is in the document. Returns its `uploadKey`. */
  stage(file: File, kind: 'image' | 'file', preview?: string | null): string {
    const key = createKey('u');
    const url = preview ?? (kind === 'image' ? URL.createObjectURL(file) : null);
    this.set({ key, kind, file, status: 'staged', progress: 0, error: null, preview: url, result: null });
    return key;
  }

  /** The upload with this key, if this editor knows it. */
  get(key: string | null | undefined): UploadEntry | undefined {
    return key ? this.entries.get(key) : undefined;
  }

  /** Goes up on every change, progress included, so React can tell when to read again. */
  get version(): number {
    return this.changes;
  }

  /** Calls `listener` after any change, progress included. Returns the unsubscribe function. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Starts (or restarts) an upload: staged, failed or cancelled ones are queued again. */
  start(key: string): void {
    const entry = this.entries.get(key);
    if (!entry || this.destroyed) return;
    if (entry.status !== 'staged' && entry.status !== 'failed' && entry.status !== 'cancelled') return;
    this.set({ ...entry, status: 'queued', progress: 0, error: null }, true);
    this.queue.push(key);
    this.pump();
  }

  /** Stops a queued or running upload. */
  cancel(key: string): void {
    const entry = this.entries.get(key);
    if (!entry || (entry.status !== 'queued' && entry.status !== 'uploading')) return;
    const index = this.queue.indexOf(key);
    if (index >= 0) this.queue.splice(index, 1);
    this.controllers.get(key)?.abort();
    this.set({ ...entry, status: 'cancelled', progress: 0 }, true);
  }

  /**
   * Matches the uploads to the keys now in the document: staged and cancelled ones that are present start, and queued
   * or running ones whose node is gone stop.
   */
  sync(present: ReadonlySet<string>): void {
    for (const entry of this.entries.values()) {
      const here = present.has(entry.key);
      if (here && (entry.status === 'staged' || entry.status === 'cancelled')) this.start(entry.key);
      else if (!here && (entry.status === 'queued' || entry.status === 'uploading')) this.cancel(entry.key);
    }
  }

  /** True while any upload is staged, queued or running. */
  get busy(): boolean {
    for (const entry of this.entries.values()) {
      if (entry.status === 'queued' || entry.status === 'uploading') return true;
    }
    return false;
  }

  /** Every finished upload, for patching the document. */
  done(): UploadEntry[] {
    return [...this.entries.values()].filter((entry) => entry.status === 'done');
  }

  /** Stops everything and frees the previews. */
  destroy(): void {
    this.destroyed = true;
    for (const controller of this.controllers.values()) controller.abort();
    for (const entry of this.entries.values()) if (entry.preview) URL.revokeObjectURL(entry.preview);
    this.entries.clear();
    this.controllers.clear();
    this.queue.length = 0;
    this.listeners.clear();
  }

  private set(entry: UploadEntry, statusChanged = false): void {
    this.entries.set(entry.key, entry);
    this.changes++;
    if (statusChanged) this.options.onChange?.(entry);
    for (const listener of this.listeners) listener();
  }

  private pump(): void {
    const limit = this.options.concurrency ?? 3;
    while (this.running < limit && this.queue.length > 0) {
      const key = this.queue.shift();
      if (key) void this.run(key);
    }
  }

  private async run(key: string): Promise<void> {
    const entry = this.entries.get(key);
    if (!entry || entry.status !== 'queued') return;
    const adapter = this.options.getAdapter();
    if (!adapter) {
      this.set({ ...entry, status: 'failed', error: 'No upload adapter.' }, true);
      return;
    }
    const controller = new AbortController();
    this.controllers.set(key, controller);
    this.running++;
    this.set({ ...entry, status: 'uploading', progress: 0 }, true);
    let lastProgress = 0;
    try {
      const result = await adapter.upload(entry.file, {
        kind: entry.kind,
        signal: controller.signal,
        onProgress: (fraction) => {
          const current = this.entries.get(key);
          const value = Math.min(1, Math.max(0, Number.isFinite(fraction) ? fraction : 0));
          // Redraw at most every 1%, so a chatty adapter doesn't flood the node views.
          if (!current || current.status !== 'uploading' || Math.abs(value - lastProgress) < 0.01) return;
          lastProgress = value;
          this.set({ ...current, progress: value });
        },
      });
      const current = this.entries.get(key);
      if (!current || controller.signal.aborted) return;
      if (!result || !safeMediaSrc(result.src, { allowBlob: true }))
        throw new Error('The upload adapter returned no http(s) src.');
      this.set({ ...current, status: 'done', progress: 1, result }, true);
    } catch (error) {
      const current = this.entries.get(key);
      if (!current || controller.signal.aborted || current.status === 'cancelled') return;
      const message = error instanceof Error ? error.message : String(error);
      this.set({ ...current, status: 'failed', error: message }, true);
    } finally {
      // A cancelled run can still be settling after the same key started again: leave the new run's controller alone.
      if (this.controllers.get(key) === controller) this.controllers.delete(key);
      this.running--;
      this.pump();
    }
  }
}
