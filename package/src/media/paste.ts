// Pasted content: `data:` pictures inside pasted HTML, and telling a picture paste apart from a document paste.
import { sniffImage, type ImageFormat } from './upload/prepare';

/** The biggest `data:` picture taken from pasted HTML, in bytes. */
const maxDataBytes = 25 * 1024 * 1024;

const extensions: Record<ImageFormat, string> = {
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
  avif: 'avif',
  gif: 'gif',
  tiff: 'tiff',
  heic: 'heic',
  bmp: 'bmp',
};

/**
 * A pasted `data:` picture as a file, or `null` when it isn't base64, isn't a JPEG, PNG, WebP, GIF or AVIF by its bytes
 * (SVG, HEIC, TIFF and BMP included), or is too big. The type comes from the bytes, never from the URL.
 */
export function dataUrlToFile(dataUrl: string, name: string): File | null {
  const match = /^data:([a-z0-9.+/-]*)(?:;[a-z0-9=-]+)*;base64,([a-z0-9+/=\s]+)$/i.exec(dataUrl.trim());
  if (!match?.[2]) return null;
  const base64 = match[2].replace(/\s+/g, '');
  if ((base64.length * 3) / 4 > maxDataBytes) return null;
  let bytes: Uint8Array<ArrayBuffer>;
  try {
    const binary = atob(base64);
    bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  } catch {
    return null;
  }
  const format = sniffImage(bytes);
  // Formats every browser shows. HEIC, TIFF and BMP need converting, which only a picked file goes through.
  if (format !== 'jpeg' && format !== 'png' && format !== 'webp' && format !== 'gif' && format !== 'avif') return null;
  const safeName =
    name
      .replace(/[^\p{L}\p{N} ._-]/gu, '')
      .trim()
      .slice(0, 60) || 'image';
  return new File([bytes], `${safeName}.${extensions[format]}`, { type: `image/${format}` });
}

/**
 * True when pasted HTML is a document (it has text), not just a copied picture. Browsers put both a file and an `<img>`
 * on the clipboard for "Copy image"; office apps put a picture of the selection next to the real HTML.
 */
export function htmlHasText(html: string): boolean {
  if (!html) return false;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('style, script, meta, title, head').forEach((element) => element.remove());
  return (doc.body.textContent ?? '').trim().length > 0;
}
