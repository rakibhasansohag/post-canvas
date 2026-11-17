// From picked, pasted or dropped files to media nodes: check and prepare each file, stage its upload, and insert the
// nodes where they were asked for. The upload itself starts once the node is in the document (see plugin.ts).
import type { Editor, JSONContent } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { createKey } from '../../core/ids';
import type { Features, GalleryAttrs, GalleryLayout, GalleryPhoto } from '../../core/types';
import { formatBytes } from '../rules';
import { galleryLimitsFrom, normalizePlaces } from '../sanitize';
import '../storage';
import { detectImage, MediaRefusal, prepareImage, type RefusalReason } from './prepare';
import { positionPluginKey } from './plugin';

/** Where uploaded files go. */
export type UploadTarget =
  /** At the selection, replacing it. `as` forces a single image, a gallery or file blocks. Default `auto`. */
  | { type: 'cursor'; as?: 'auto' | 'image' | 'gallery' | 'file' }
  /** At a document position, such as a drop point. */
  | { type: 'at'; pos: number }
  /** Into the gallery with this node id. */
  | { type: 'gallery'; nodeId: string }
  /** Replaces the picture or file of the image or file node with this id. */
  | { type: 'replace'; nodeId: string };


/** A node and its position. */
export interface Found {
  node: PMNode;
  pos: number;
}

/** The media node with this `id`, if the document has it. */
export function findNode(doc: PMNode, id: string): Found | null {
  let found: Found | null = null;
  doc.descendants((node, pos) => {
    if (found) return false;
    if (node.attrs.id === id) {
      found = { node, pos };
      return false;
    }
    return !node.isAtom;
  });
  return found;
}

const imageNamePattern = /\.(jpe?g|png|gif|webp|avif|heic|heif|bmp|tiff?|svg)$/i;

/** Looks like the person meant a picture, by its type or name. */
const claimsImage = (file: File) => file.type.startsWith('image/') || imageNamePattern.test(file.name);

interface Refused {
  name: string;
  reason: RefusalReason | 'no-files' | 'no-images';
  /** The size limit that was passed, for `too-large`. */
  max?: number;
}

interface Picture {
  index: number;
  file: File;
  width: number;
  height: number;
}

const refusalKeys: Record<Refused['reason'], string> = {
  'not-image': 'media.refused.notImage',
  svg: 'media.refused.svg',
  heic: 'media.refused.heic',
  unreadable: 'media.refused.unreadable',
  'too-large': 'media.refused.tooLarge',
  'no-files': 'media.refused.noFiles',
  'no-images': 'media.refused.noImages',
};

/** Runs `task` over `items`, at most `limit` at a time. */
async function pool<T>(items: readonly T[], limit: number, task: (item: T, index: number) => Promise<void>) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      const item = items[index];
      if (item !== undefined) await task(item, index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

/** Remembers a position until the files are ready. Returns the id to read it back with `takePosition`. */
function trackPosition(editor: Editor, pos: number): string {
  const id = createKey('pos');
  editor.view.dispatch(editor.state.tr.setMeta(positionPluginKey, { add: [[id, pos]] }).setMeta('addToHistory', false));
  return id;
}

function takePosition(editor: Editor, id: string): number | null {
  const pos = positionPluginKey.getState(editor.state)?.get(id);
  editor.view.dispatch(editor.state.tr.setMeta(positionPluginKey, { remove: [id] }).setMeta('addToHistory', false));
  return pos ?? null;
}

/** A new gallery photo for a staged upload. */
export function stagedPhoto(picture: { width: number; height: number }, preview: string, uploadKey: string): GalleryPhoto {
  return {
    key: createKey('p'),
    src: preview,
    width: picture.width,
    height: picture.height,
    alt: '',
    srcset: null,
    placeholder: null,
    uploadId: null,
    uploadKey,
    place: null,
  };
}

/** The layout a new gallery starts with: the first one the features allow. */
export function firstLayout(features: Features): GalleryLayout {
  return galleryLimitsFrom(features.gallery).layouts[0] ?? 'carousel';
}

/**
 * Checks, prepares and uploads files, and puts them where `target` says. Pictures become an image (one) or a gallery
 * (several); other files become file blocks. Files that can't be used are named in a notice with the reason, and so
 * are photos past the gallery's limit.
 */
export async function uploadFiles(editor: Editor, files: readonly File[], target: UploadTarget): Promise<void> {
  const core = editor.storage.postCanvasCore;
  const manager = editor.storage.postCanvasMedia?.manager;
  const { t, notify, features } = core;
  const adapter = core.adapters.upload;
  if (files.length === 0 || !manager || editor.isDestroyed) return;
  if (!adapter) {
    notify(t('media.upload.noAdapter'), 'error');
    return;
  }

  const as = target.type === 'cursor' ? (target.as ?? 'auto') : 'auto';
  const imagesOnly = target.type === 'gallery' || as === 'image' || as === 'gallery';
  let markers: [string, string] | null = null;
  if (target.type === 'cursor') {
    const { from, to } = editor.state.selection;
    markers = [trackPosition(editor, from), trackPosition(editor, to)];
  } else if (target.type === 'at') {
    const id = trackPosition(editor, target.pos);
    markers = [id, id];
  }

  const pictures: Picture[] = [];
  const attachments: { index: number; file: File }[] = [];
  const refused: Refused[] = [];
  const replacing = target.type === 'replace' ? findNode(editor.state.doc, target.nodeId) : null;
  const wantsFile = replacing?.node.type.name === 'file';

  await pool(wantsFile ? [] : files, 3, async (file, index) => {
    try {
      await detectImage(file);
    } catch (error) {
      const reason = error instanceof MediaRefusal ? error.reason : 'unreadable';
      if (!imagesOnly && reason === 'not-image' && !claimsImage(file)) attachments.push({ index, file });
      else refused.push({ name: file.name, reason });
      return;
    }
    try {
      const prepared = await prepareImage(file, {
        maxBytes: adapter.maxBytes?.image,
        convertHeic: adapter.convertHeic,
      });
      pictures.push({ index, file: prepared.file, width: prepared.width, height: prepared.height });
    } catch (error) {
      const reason = error instanceof MediaRefusal ? error.reason : 'unreadable';
      refused.push({ name: file.name, reason, max: adapter.maxBytes?.image });
    }
  });
  if (wantsFile) files.forEach((file, index) => attachments.push({ index, file }));
  pictures.sort((a, b) => a.index - b.index);
  attachments.sort((a, b) => a.index - b.index);

  const positions = markers ? ([takePosition(editor, markers[0]), takePosition(editor, markers[1])] as const) : null;
  if (editor.isDestroyed) return;

  const keepFile = (file: File) => {
    const max = adapter.maxBytes?.file;
    if (max !== undefined && file.size > max) {
      refused.push({ name: file.name, reason: 'too-large', max });
      return false;
    }
    return true;
  };

  const limits = galleryLimitsFrom(features.gallery);
  const cutToLimit = (list: Picture[], room: number) => {
    if (list.length <= room) return list;
    notify(t('media.gallery.limit', { max: limits.maxPhotos, count: list.length - Math.max(0, room) }), 'info');
    return list.slice(0, Math.max(0, room));
  };
  const stagePicture = (picture: Picture) => {
    const key = manager.stage(picture.file, 'image');
    return { key, preview: manager.get(key)?.preview ?? '' };
  };

  if (target.type === 'gallery') {
    const found = findNode(editor.state.doc, target.nodeId);
    if (found && found.node.type.name === 'gallery') {
      const attrs = found.node.attrs as GalleryAttrs;
      const room = limits.maxPhotos - attrs.photos.length;
      const added = cutToLimit(pictures, room).map((picture) => {
        const { key, preview } = stagePicture(picture);
        return stagedPhoto(picture, preview, key);
      });
      if (added.length > 0) {
        const photos = normalizePlaces([...attrs.photos, ...added], attrs.layout);
        editor.view.dispatch(editor.state.tr.setNodeAttribute(found.pos, 'photos', photos));
      }
    }
  } else if (target.type === 'replace') {
    const found = findNode(editor.state.doc, target.nodeId);
    if (found?.node.type.name === 'image' && pictures[0]) {
      const { key, preview } = stagePicture(pictures[0]);
      const { node, pos } = found;
      editor.view.dispatch(
        editor.state.tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          src: preview,
          width: pictures[0].width,
          height: pictures[0].height,
          alt: '',
          srcset: null,
          placeholder: null,
          uploadId: null,
          uploadKey: key,
        }),
      );
    } else if (found?.node.type.name === 'file' && attachments[0] && keepFile(attachments[0].file)) {
      const { file } = attachments[0];
      const key = manager.stage(file, 'file', URL.createObjectURL(file));
      editor.view.dispatch(
        editor.state.tr.setNodeMarkup(found.pos, undefined, {
          ...found.node.attrs,
          src: manager.get(key)?.preview ?? '',
          name: file.name,
          size: file.size,
          mimeType: file.type || null,
          uploadId: null,
          uploadKey: key,
        }),
      );
    }
  } else if (positions) {
    const content: JSONContent[] = [];
    if (pictures.length > 0) {
      const single = as === 'image' || (as === 'auto' && pictures.length === 1 && features.image);
      if (single && features.image) {
        const picture = pictures[0];
        if (picture) {
          const { key, preview } = stagePicture(picture);
          content.push({
            type: 'image',
            attrs: { src: preview, width: picture.width, height: picture.height, uploadKey: key, align: 'center' },
          });
        }
      } else if (features.gallery) {
        const photos = cutToLimit(pictures, limits.maxPhotos).map((picture) => {
          const { key, preview } = stagePicture(picture);
          return stagedPhoto(picture, preview, key);
        });
        const layout = firstLayout(features);
        content.push({ type: 'gallery', attrs: { layout, photos: normalizePlaces(photos, layout) } });
      } else if (features.image) {
        for (const picture of pictures) {
          const { key, preview } = stagePicture(picture);
          content.push({
            type: 'image',
            attrs: { src: preview, width: picture.width, height: picture.height, uploadKey: key, align: 'center' },
          });
        }
      } else {
        for (const picture of pictures) refused.push({ name: picture.file.name, reason: 'no-images' });
      }
    }
    for (const { file } of attachments) {
      if (!features.file) {
        refused.push({ name: file.name, reason: 'no-files' });
        continue;
      }
      if (!keepFile(file)) continue;
      const key = manager.stage(file, 'file', URL.createObjectURL(file));
      content.push({
        type: 'file',
        attrs: {
          src: manager.get(key)?.preview ?? '',
          name: file.name,
          size: file.size,
          mimeType: file.type || null,
          uploadKey: key,
        },
      });
    }
    if (content.length > 0) {
      const size = editor.state.doc.content.size;
      const from = Math.min(Math.max(0, positions[0] ?? 0), size);
      const to = Math.min(Math.max(from, positions[1] ?? from), size);
      editor.chain().insertContentAt({ from, to }, content).run();
    }
  }

  for (const item of refused) {
    notify(t(refusalKeys[item.reason], { name: item.name, size: formatBytes(item.max ?? null) }), 'error');
  }
}
