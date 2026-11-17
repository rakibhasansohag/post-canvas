// Autosave: debounced draft snapshots to `adapters.storage`, with a localStorage default that never throws.
import type { DraftSnapshot, DraftStorage, JSONContent, PostFields } from '../core/types';
import { getDocStats } from './stats';

/** Autosave settings. Pass `true` for the defaults. */
export interface AutosaveOptions {
  /**
   * The storage key. Use one per document, such as `post:new` or `post:42`. Default `draft`, which the localStorage
   * default stores as `post-canvas:draft`; a custom `adapters.storage` receives the key as it is.
   */
  key?: string;
  /** Milliseconds typing must rest before a save. Default 800. */
  delay?: number;
  /** Brings a saved draft back on mount and shows the restore banner. Default `true`. */
  restore?: boolean;
}

const prefix = 'post-canvas:';

/** Drafts in `localStorage`, under `post-canvas:<key>`. Private mode or a full disk just means nothing is kept. */
export const localDraftStorage: DraftStorage = {
  load(key) {
    try {
      const raw = globalThis.localStorage?.getItem(prefix + key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<DraftSnapshot>;
      if (!parsed || typeof parsed !== 'object' || !parsed.content || parsed.content.type !== 'doc') return null;
      return { content: parsed.content, fields: parsed.fields ?? {}, savedAt: String(parsed.savedAt ?? '') };
    } catch {
      return null;
    }
  },
  save(key, snapshot) {
    try {
      globalThis.localStorage?.setItem(prefix + key, JSON.stringify(snapshot));
    } catch {
      // Storage off or full: the draft just isn't kept.
    }
  },
  clear(key) {
    try {
      globalThis.localStorage?.removeItem(prefix + key);
    } catch {
      // Nothing kept to forget.
    }
  },
};

/** A node that only makes sense while editing: an unfinished upload, a `blob:` preview or the embed field. */
function isTransient(node: JSONContent): boolean {
  if (node.type === 'embedInput') return true;
  const attrs = node.attrs ?? {};
  if (typeof attrs.uploadKey === 'string' && attrs.uploadKey) return true;
  return typeof attrs.src === 'string' && attrs.src.startsWith('blob:');
}

/** The document without the parts that can't come back after a reload (uploads in flight, local previews). */
export function storableContent(json: JSONContent): JSONContent {
  const content = (json.content ?? []).flatMap((node): JSONContent[] => {
    if (isTransient(node)) return [];
    if (node.type === 'gallery' && Array.isArray(node.attrs?.photos)) {
      const photos = (node.attrs.photos as JSONContent['attrs'][]).filter((photo) => !isTransient({ attrs: photo }));
      return photos.length > 0 ? [{ ...node, attrs: { ...node.attrs, photos } }] : [];
    }
    return [node];
  });
  return { ...json, content: content.length > 0 ? content : [{ type: 'paragraph' }] };
}

/** Anything worth bringing back: words, media, a title or a cover. */
export function hasDraftContent(content: JSONContent, fields: PostFields = {}): boolean {
  if (fields.title?.trim() || fields.cover) return true;
  const stats = getDocStats(content);
  return stats.words > 0 || stats.mediaBlocks > 0;
}

/** Saves drafts after typing rests. */
export interface AutosaveController {
  /** Schedules a save of this state. */
  schedule(content: JSONContent, fields: PostFields): void;
  /** Saves a scheduled state now, for example before the page unloads. */
  flush(): void;
  /** Cancels a scheduled save and forgets the stored draft. */
  clear(): Promise<void>;
  /** The stored draft, if it's worth restoring. */
  load(): Promise<DraftSnapshot | null>;
  /** Cancels a scheduled save. */
  dispose(): void;
}

/** Runs a storage call and swallows its failure, sync or async: a draft that isn't kept must never break typing. */
function quietly(call: () => void | Promise<void>): Promise<void> {
  try {
    return Promise.resolve(call()).catch(reportStorageError);
  } catch (error) {
    reportStorageError(error);
    return Promise.resolve();
  }
}

function reportStorageError(error: unknown): void {
  console.warn('[post-canvas] The draft storage failed; the draft is not kept.', error);
}

/**
 * Creates an autosave for one storage key. Storage errors, thrown or rejected, are caught and logged as warnings, so a
 * failing `DraftStorage` only means the draft isn't kept.
 */
export function createAutosave(storage: DraftStorage, options: AutosaveOptions = {}): AutosaveController {
  const key = options.key ?? 'draft';
  const delay = options.delay ?? 800;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: { content: JSONContent; fields: PostFields } | null = null;

  const save = () => {
    timer = null;
    const next = pending;
    pending = null;
    if (!next) return;
    const content = storableContent(next.content);
    if (!hasDraftContent(content, next.fields)) {
      void quietly(() => storage.clear(key));
      return;
    }
    void quietly(() => storage.save(key, { content, fields: next.fields, savedAt: new Date().toISOString() }));
  };

  return {
    schedule(content, fields) {
      pending = { content, fields };
      if (timer) clearTimeout(timer);
      timer = setTimeout(save, delay);
    },
    flush() {
      if (timer) clearTimeout(timer);
      save();
    },
    async clear() {
      if (timer) clearTimeout(timer);
      timer = null;
      pending = null;
      await quietly(() => storage.clear(key));
    },
    async load() {
      try {
        const snapshot = await storage.load(key);
        return snapshot && hasDraftContent(snapshot.content, snapshot.fields) ? snapshot : null;
      } catch {
        return null;
      }
    },
    dispose() {
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}
