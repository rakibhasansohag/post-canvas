// The ProseMirror side of uploads: which upload keys the document holds, writing finished uploads into their nodes
// (outside the undo history), and positions that stay right while a file is still being prepared.
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state';
import type { GalleryPhoto, UploadResult } from '../../core/types';
import { safeMediaSrc } from '../../core/url';
import { textLimits } from '../rules';
import { cleanLine, cleanPlaceholder, cleanSrcset } from '../sanitize';
import type { UploadManager } from './manager';

/** Every upload key in the document: image and file nodes, and gallery photos. */
export function uploadKeysIn(doc: PMNode): Set<string> {
  const keys = new Set<string>();
  doc.descendants((node) => {
    const name = node.type.name;
    if (name === 'image' || name === 'file') {
      if (typeof node.attrs.uploadKey === 'string') keys.add(node.attrs.uploadKey);
      return false;
    }
    if (name === 'gallery') {
      for (const photo of (node.attrs.photos ?? []) as GalleryPhoto[]) if (photo.uploadKey) keys.add(photo.uploadKey);
      return false;
    }
    return true;
  });
  return keys;
}

/** A finished upload's fields for a picture. Fields the adapter didn't send keep their current value. */
function pictureResult<
  T extends { src: string; width: number; height: number; srcset: string | null; placeholder: string | null },
>(current: T, result: UploadResult) {
  const width = Number(result.width);
  const height = Number(result.height);
  const sized = width > 0 && height > 0;
  return {
    src: safeMediaSrc(result.src, { allowBlob: true }) ?? current.src,
    width: sized ? Math.round(width) : current.width,
    height: sized ? Math.round(height) : current.height,
    srcset: result.srcset === undefined ? current.srcset : cleanSrcset(result.srcset),
    placeholder: result.placeholder === undefined ? current.placeholder : cleanPlaceholder(result.placeholder),
    uploadId: typeof result.id === 'string' ? result.id : null,
    uploadKey: null,
  };
}

/**
 * Writes every finished upload into the nodes that hold its key, as one transaction kept out of the undo history.
 * `null` when there's nothing to write.
 */
export function patchUploads(state: EditorState, manager: UploadManager): Transaction | null {
  let tr: Transaction | null = null;
  const set = (pos: number, attrs: Record<string, unknown>, node: PMNode) => {
    for (const [name, value] of Object.entries(attrs)) {
      if (node.attrs[name] === value) continue;
      tr ??= state.tr;
      tr.setNodeAttribute(pos, name, value);
    }
  };
  state.doc.descendants((node, pos) => {
    const name = node.type.name;
    if (name === 'image' || name === 'file') {
      const entry = manager.get(node.attrs.uploadKey as string | null);
      if (entry?.status === 'done' && entry.result) {
        const { result } = entry;
        if (name === 'image') {
          set(
            pos,
            pictureResult(
              node.attrs as {
                src: string;
                width: number;
                height: number;
                srcset: string | null;
                placeholder: string | null;
              },
              result,
            ),
            node,
          );
        } else {
          set(
            pos,
            {
              src: safeMediaSrc(result.src, { allowBlob: true }) ?? node.attrs.src,
              name: cleanLine(result.name, textLimits.name) || node.attrs.name,
              size: typeof result.size === 'number' && result.size >= 0 ? Math.round(result.size) : node.attrs.size,
              mimeType: typeof result.mimeType === 'string' ? result.mimeType : node.attrs.mimeType,
              uploadId: typeof result.id === 'string' ? result.id : null,
              uploadKey: null,
            },
            node,
          );
        }
      }
      return false;
    }
    if (name === 'gallery') {
      const photos = (node.attrs.photos ?? []) as GalleryPhoto[];
      let changed = false;
      const next = photos.map((photo) => {
        const entry = manager.get(photo.uploadKey);
        if (entry?.status !== 'done' || !entry.result) return photo;
        changed = true;
        return { ...photo, ...pictureResult(photo, entry.result) };
      });
      if (changed) set(pos, { photos: next }, node);
      return false;
    }
    return true;
  });
  if (tr) (tr as Transaction).setMeta('addToHistory', false).setMeta(uploadPluginKey, 'patch');
  return tr;
}

/** The marker source of a staged upload: see `stagedSrcPrefix` in html.ts. Repeated here to keep this file lean. */
const stagedPrefix = 'https://staged.post-canvas.invalid/';

/**
 * Links pictures that travel as the staged marker (pasted, or copied within the editor) back to their upload: the
 * local preview and the key. A marker this editor doesn't know (say, from a saved draft) keeps its source and gets its
 * key back, so it shows as an interrupted upload to replace or remove. Kept out of the undo history.
 */
export function relinkStaged(state: EditorState, manager: UploadManager): Transaction | null {
  const updates: { pos: number; attrs: Record<string, unknown> }[] = [];
  const keyOf = (src: unknown) => {
    if (typeof src !== 'string' || !src.startsWith(stagedPrefix)) return null;
    const key = src.slice(stagedPrefix.length);
    return /^[a-z0-9_-]{1,40}$/i.test(key) ? key : null;
  };
  const relinked = <T extends { src: string; uploadKey: string | null }>(item: T): T => {
    const key = keyOf(item.src);
    if (key === null) return item;
    const preview = manager.get(key)?.preview;
    if (preview) return { ...item, src: preview, uploadKey: key };
    return item.uploadKey === key ? item : { ...item, uploadKey: key };
  };
  state.doc.descendants((node, pos) => {
    const name = node.type.name;
    if (name === 'image' || name === 'file') {
      const attrs = node.attrs as { src: string; uploadKey: string | null };
      const next = relinked(attrs);
      if (next !== attrs) updates.push({ pos, attrs: { src: next.src, uploadKey: next.uploadKey } });
      return false;
    }
    if (name === 'gallery') {
      const photos = (node.attrs.photos ?? []) as GalleryPhoto[];
      const next = photos.map(relinked);
      if (next.some((photo, index) => photo !== photos[index])) updates.push({ pos, attrs: { photos: next } });
      return false;
    }
    return true;
  });
  if (updates.length === 0) return null;
  const tr = state.tr;
  for (const { pos, attrs } of updates) {
    const node = state.doc.nodeAt(pos);
    for (const [key, value] of Object.entries(attrs))
      if (node?.attrs[key] !== value) tr.setNodeAttribute(pos, key, value);
  }
  if (!tr.docChanged) return null;
  return tr.setMeta('addToHistory', false).setMeta(uploadPluginKey, 'relink');
}

/** The upload plugin's key. A transaction with this meta only reports an upload's status change. */
export const uploadPluginKey = new PluginKey('postCanvasMediaUploads');

/**
 * Starts uploads whose nodes reach the document, stops those whose nodes leave it, and writes finished uploads into
 * nodes that come back through undo or redo.
 */
export function createUploadPlugin(getManager: () => UploadManager | null): Plugin {
  return new Plugin({
    key: uploadPluginKey,
    appendTransaction(transactions, _old, state) {
      const manager = getManager();
      if (!manager || !transactions.some((tr) => tr.docChanged)) return null;
      return relinkStaged(state, manager) ?? patchUploads(state, manager);
    },
    view(view) {
      getManager()?.sync(uploadKeysIn(view.state.doc));
      return {
        update(current, previous) {
          if (current.state.doc.eq(previous.doc)) return;
          getManager()?.sync(uploadKeysIn(current.state.doc));
        },
      };
    },
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// Positions that follow edits, for files that are inserted once they're ready.
// ---------------------------------------------------------------------------------------------------------------------

type Tracked = ReadonlyMap<string, number>;
type TrackMeta = { add?: [string, number][]; remove?: string[] };

/** Key of the plugin that keeps tracked positions. */
export const positionPluginKey = new PluginKey<Tracked>('postCanvasMediaPositions');

/** Keeps positions current through every transaction, so an insert lands where it was asked for. */
export function createPositionPlugin(): Plugin<Tracked> {
  return new Plugin<Tracked>({
    key: positionPluginKey,
    state: {
      init: () => new Map(),
      apply(tr, value) {
        const meta = tr.getMeta(positionPluginKey) as TrackMeta | undefined;
        if (!tr.docChanged && !meta) return value;
        const next = new Map<string, number>();
        for (const [id, pos] of value) next.set(id, tr.mapping.map(pos, -1));
        for (const [id, pos] of meta?.add ?? []) next.set(id, pos);
        for (const id of meta?.remove ?? []) next.delete(id);
        return next;
      },
    },
  });
}
