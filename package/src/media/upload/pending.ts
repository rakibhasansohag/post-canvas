import type { JSONContent } from '../../core/types';

const mediaTypes = new Set(['image', 'gallery', 'file']);

import { isStagedSrc } from '../../core/url';

function isPending(source: unknown): boolean {
  if (!source || typeof source !== 'object') return false;
  const { uploadKey, src } = source as { uploadKey?: unknown; src?: unknown };
  return (
    (typeof uploadKey === 'string' && uploadKey !== '') ||
    (typeof src === 'string' && (/^\s*blob:/i.test(src) || isStagedSrc(src)))
  );
}

/**
 * True when the document still has an upload that's running or failed: a media node (or gallery photo) with an
 * `uploadKey`, a `blob:` source that only exists in this browser, or a staged-upload marker source. Save or publish only when this is `false`;
 * `sanitizeDocument` would drop those pictures.
 */
export function hasPendingUploads(json: JSONContent | null | undefined): boolean {
  if (!json || typeof json !== 'object') return false;
  const stack: JSONContent[] = [json];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;
    if (node.type && mediaTypes.has(node.type) && node.attrs) {
      if (isPending(node.attrs)) return true;
      const photos: unknown = node.attrs.photos;
      if (Array.isArray(photos) && photos.some(isPending)) return true;
    }
    if (Array.isArray(node.content)) stack.push(...node.content);
  }
  return false;
}
