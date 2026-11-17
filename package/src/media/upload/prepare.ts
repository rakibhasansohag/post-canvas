// Gets a picked or pasted picture ready to upload: what it really is (from its bytes, never its name), HEIC and BMP
// turned into JPEG, very large pictures scaled down, and its size read. A refusal carries a reason code that the caller
// turns into words, so this file has no strings for people.

/** An image format recognised from its first bytes. */
export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'gif' | 'tiff' | 'heic' | 'bmp';

/** Why a file can't be used as a picture. */
export type RefusalReason =
  /** Not a picture we know, by its bytes. */
  | 'not-image'
  /** An SVG, which can carry scripts. */
  | 'svg'
  /** A HEIC photo this browser can't open, and no `convertHeic` was given. */
  | 'heic'
  /** A picture this browser can't decode. */
  | 'unreadable'
  /** Bigger than the adapter's `maxBytes`. */
  | 'too-large';

/** A file that can't be used, with the reason. */
export class MediaRefusal extends Error {
  readonly reason: RefusalReason;

  constructor(reason: RefusalReason) {
    super(reason);
    this.name = 'MediaRefusal';
    this.reason = reason;
  }
}

/** HEIC and HEIF brands. */
const heicBrands = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1']);

/** The format in these first bytes (at least 12), or `null` when it isn't a picture we know. */
export function sniffImage(bytes: Uint8Array): ImageFormat | null {
  if (bytes.length < 12) return null;
  const at = (index: number) => bytes[index] ?? -1;
  const text = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return 'jpeg';
  if (at(0) === 0x89 && text(1, 4) === 'PNG') return 'png';
  if (text(0, 4) === 'RIFF' && text(8, 12) === 'WEBP') return 'webp';
  if (text(0, 6) === 'GIF87a' || text(0, 6) === 'GIF89a') return 'gif';
  if ((text(0, 2) === 'II' && at(2) === 0x2a && at(3) === 0) || (text(0, 2) === 'MM' && at(2) === 0 && at(3) === 0x2a))
    return 'tiff';
  if (text(0, 2) === 'BM' && bytes.length >= 14) return 'bmp';
  if (text(4, 8) === 'ftyp') {
    const declared = ((at(0) << 24) | (at(1) << 16) | (at(2) << 8) | at(3)) >>> 0;
    const boxEnd = Math.min(declared, bytes.length, 64);
    const brands = [text(8, 12)];
    for (let index = 16; index + 4 <= boxEnd; index += 4) brands.push(text(index, index + 4));
    if (brands.some((brand) => brand === 'avif' || brand === 'avis')) return 'avif';
    if (brands.some((brand) => heicBrands.has(brand))) return 'heic';
  }
  return null;
}

/** True when the bytes look like SVG or other XML, so the refusal can say why. */
export function looksLikeSvg(bytes: Uint8Array): boolean {
  const head = new TextDecoder()
    .decode(bytes.subarray(0, 512))
    .replace(/^\ufeff/, '')
    .trimStart()
    .toLowerCase();
  return (
    head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg')) || head.startsWith('<!doctype svg')
  );
}

/** Formats that are turned into JPEG before uploading, because browsers (or apps) can't show them everywhere. */
const converted: ReadonlySet<ImageFormat> = new Set(['heic', 'bmp', 'tiff']);

const mimeOf: Record<ImageFormat, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
  tiff: 'image/tiff',
  heic: 'image/heic',
  bmp: 'image/bmp',
};

/** Decodes and re-encodes pictures. The default uses the browser; tests pass their own. */
export interface ImageCodec {
  /** The picture's upright size in pixels. Throws when it can't be decoded. */
  size(blob: Blob): Promise<{ width: number; height: number }>;
  /** Draws the picture upright at most `maxEdge` on its longest side and encodes it as `type`. */
  encode(blob: Blob, options: { maxEdge: number; type: string; quality: number }): Promise<Blob>;
}

/** Options of `prepareImage`. */
export interface PrepareOptions {
  /** The longest edge to keep, in pixels. Bigger pictures are scaled down. Default 4096. */
  maxEdge?: number;
  /** Size limit after preparing, in bytes. */
  maxBytes?: number;
  /** Turns HEIC into JPEG, for browsers that can't decode it. */
  convertHeic?: (file: File) => Promise<Blob>;
  /** How pictures are decoded and encoded. Default: the browser's. */
  codec?: ImageCodec;
}

/** A picture ready to upload. */
export interface PreparedImage {
  file: File;
  width: number;
  height: number;
  format: ImageFormat;
}

/** The browser's codec: an `img` element to measure, `createImageBitmap` and a canvas to scale and convert. */
export const browserCodec: ImageCodec = {
  size(blob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        if (image.naturalWidth > 0 && image.naturalHeight > 0)
          resolve({ width: image.naturalWidth, height: image.naturalHeight });
        else reject(new Error('empty image'));
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('undecodable image'));
      };
      image.src = url;
    });
  },
  async encode(blob, { maxEdge, type, quality }) {
    const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
    try {
      const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('no canvas');
      if (type === 'image/jpeg') {
        // JPEG has no transparency: a see-through picture gets a white background, not black.
        context.fillStyle = 'white';
        context.fillRect(0, 0, width, height);
      }
      context.drawImage(bitmap, 0, 0, width, height);
      const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
      canvas.width = canvas.height = 0;
      if (!out) throw new Error('no output');
      return out;
    } finally {
      bitmap.close();
    }
  },
};

const baseName = (name: string) => name.replace(/\.[^.]+$/, '') || 'image';

function renamed(blob: Blob, name: string, type: string): File {
  const extension = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
  return new File([blob], `${baseName(name)}.${extension}`, { type, lastModified: Date.now() });
}

/** The format of a file's first bytes, or a refusal. */
export async function detectImage(file: Blob): Promise<ImageFormat> {
  const bytes = new Uint8Array(await file.slice(0, 512).arrayBuffer());
  const format = sniffImage(bytes);
  if (format) return format;
  throw new MediaRefusal(looksLikeSvg(bytes) ? 'svg' : 'not-image');
}

/**
 * Gets a picture ready to upload. Throws `MediaRefusal` when it isn't a picture we know (SVG included, whatever its
 * name), when HEIC can't be converted, when it can't be decoded, or when it's too big after preparing.
 */
export async function prepareImage(file: File, options: PrepareOptions = {}): Promise<PreparedImage> {
  const { maxEdge = 4096, maxBytes, convertHeic, codec = browserCodec } = options;
  let format = await detectImage(file);
  let current: File = file.type === mimeOf[format] ? file : new File([file], file.name, { type: mimeOf[format] });

  if (converted.has(format)) {
    let source: Blob = current;
    if (format === 'heic' && convertHeic) {
      try {
        source = await convertHeic(current);
        await detectImage(source);
      } catch {
        throw new MediaRefusal('heic');
      }
    }
    try {
      current = renamed(
        await codec.encode(source, { maxEdge, type: 'image/jpeg', quality: 0.9 }),
        file.name,
        'image/jpeg',
      );
    } catch {
      throw new MediaRefusal(format === 'heic' ? 'heic' : 'unreadable');
    }
    format = 'jpeg';
  }

  let size: { width: number; height: number };
  try {
    size = await codec.size(current);
  } catch {
    throw new MediaRefusal('unreadable');
  }

  // Scale very large pictures down. Animated GIFs stay as they are: a canvas keeps only the first frame.
  if (Math.max(size.width, size.height) > maxEdge && format !== 'gif') {
    const type = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
    try {
      const smaller = await codec.encode(current, { maxEdge, type, quality: 0.9 });
      const actual = (await detectImage(smaller)) === 'png' ? 'image/png' : smaller.type || type;
      current = renamed(smaller, file.name, actual);
      format = actual === 'image/png' ? 'png' : actual === 'image/webp' ? 'webp' : 'jpeg';
      size = await codec.size(current);
    } catch {
      // Scaling is a nicety: keep the original when the browser can't.
    }
  }

  if (maxBytes !== undefined && current.size > maxBytes) throw new MediaRefusal('too-large');
  return { file: current, width: size.width, height: size.height, format };
}
