// Ids for nodes, photos and uploads. Not secret, only unique.

function randomHex(bytes: number): string {
  const buffer = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(buffer);
  return Array.from(buffer, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** A random UUID v4, for node ids. */
export function createId(): string {
  if (typeof globalThis.crypto.randomUUID === 'function') return globalThis.crypto.randomUUID();
  const hex = randomHex(16);
  const variant = ((parseInt(hex.charAt(16), 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** A short random key, such as a gallery photo's `key` or an upload's `uploadKey`. */
export function createKey(prefix = ''): string {
  return `${prefix}${randomHex(6)}`;
}
