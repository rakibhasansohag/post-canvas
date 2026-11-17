import { describe, expect, it } from 'vitest';
import { MediaRefusal, prepareImage, sniffImage, type ImageCodec } from './prepare';

const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00]);
const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48]);
const svgText = '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect/></svg>';
const heicBytes = new Uint8Array([
  0,
  0,
  0,
  0x18,
  ...'ftypheic'.split('').map((c) => c.charCodeAt(0)),
  0,
  0,
  0,
  0,
  ...'mif1heic'.split('').map((c) => c.charCodeAt(0)),
]);

/** A codec that never touches a browser: every picture is 2000 × 1000 until it's encoded smaller. */
function fakeCodec(size = { width: 2000, height: 1000 }): ImageCodec & { encoded: string[] } {
  const encoded: string[] = [];
  return {
    encoded,
    size: (blob) => Promise.resolve(blob.size > 100 ? { width: 400, height: 200 } : size),
    encode: (_blob, { type }) => {
      encoded.push(type);
      return Promise.resolve(new Blob([jpegBytes, new Uint8Array(200)], { type }));
    },
  };
}

async function refusal(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof MediaRefusal) return error.reason;
    throw error;
  }
  return 'accepted';
}

describe('prepareImage', () => {
  it('refuses SVG bytes named .png', async () => {
    const file = new File([svgText], 'logo.png', { type: 'image/png' });
    expect(await refusal(prepareImage(file, { codec: fakeCodec() }))).toBe('svg');
  });

  it('recognises a JPEG whatever its name and type', async () => {
    const file = new File([jpegBytes], 'notes.txt', { type: 'text/plain' });
    const prepared = await prepareImage(file, { codec: fakeCodec() });
    expect(prepared.format).toBe('jpeg');
    expect(prepared.file.type).toBe('image/jpeg');
    expect(prepared).toMatchObject({ width: 2000, height: 1000 });
  });

  it('refuses an unknown type', async () => {
    const file = new File([new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14])], 'photo.jpg', {
      type: 'image/jpeg',
    });
    expect(await refusal(prepareImage(file, { codec: fakeCodec() }))).toBe('not-image');
    expect(await refusal(prepareImage(new File([], 'empty.png'), { codec: fakeCodec() }))).toBe('not-image');
  });

  it('refuses HEIC it can neither convert nor decode, and converts it with convertHeic', async () => {
    const file = new File([heicBytes], 'IMG_0001.HEIC', { type: '' });
    const failing: ImageCodec = {
      size: () => Promise.reject(new Error('no')),
      encode: () => Promise.reject(new Error('no')),
    };
    expect(await refusal(prepareImage(file, { codec: failing }))).toBe('heic');

    const codec = fakeCodec();
    const prepared = await prepareImage(file, {
      codec,
      convertHeic: () => Promise.resolve(new Blob([jpegBytes], { type: 'image/jpeg' })),
    });
    expect(prepared.format).toBe('jpeg');
    expect(prepared.file.name).toBe('IMG_0001.jpg');
    expect(codec.encoded).toEqual(['image/jpeg']);
  });

  it('scales down past the max edge and refuses what is still too big', async () => {
    const codec = fakeCodec({ width: 8000, height: 6000 });
    const prepared = await prepareImage(new File([pngBytes], 'big.png', { type: 'image/png' }), {
      codec,
      maxEdge: 4096,
    });
    expect(codec.encoded).toEqual(['image/png']);
    expect(prepared).toMatchObject({ width: 400, height: 200 });
    expect(await refusal(prepareImage(new File([jpegBytes], 'a.jpg'), { codec: fakeCodec(), maxBytes: 4 }))).toBe(
      'too-large',
    );
  });

  it('sniffs the common formats', () => {
    const text = (value: string) => new Uint8Array(value.split('').map((c) => c.charCodeAt(0)));
    expect(sniffImage(text('RIFF\0\0\0\0WEBPVP8 '))).toBe('webp');
    expect(sniffImage(text('GIF89a\0\0\0\0\0\0'))).toBe('gif');
    expect(sniffImage(new Uint8Array([0, 0, 0, 0x1c, ...text('ftypavif'), 0, 0, 0, 0]))).toBe('avif');
    expect(sniffImage(text('<svg></svg>  '))).toBeNull();
  });
});
