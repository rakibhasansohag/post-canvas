/**
 * True in development builds. Bundlers replace `process.env.NODE_ENV`; where nothing does (a plain browser or the CDN
 * bundle), it counts as production, so no dev warnings show.
 */
export const isDev: boolean = (() => {
  try {
    return process.env.NODE_ENV !== 'production';
  } catch {
    return false;
  }
})();

const warned = new Set<string>();

/** Logs a console warning once per `key`, in development only. */
export function warnOnce(key: string, message: string): void {
  if (!isDev || warned.has(key)) return;
  warned.add(key);
  console.warn(`[post-canvas] ${message}`);
}
