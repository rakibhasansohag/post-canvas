// The `post-canvas/extensions` entry. Shared file: each chat edits only its own marked section.

// --- chat 0: core ---
export { PostCanvasCore, updatePostCanvasCore, type PostCanvasCoreOptions } from './core/extension';
export { postCanvasKit, idNodeTypes } from './core/kit';
export { postCanvasSchema } from './core/schema';
export { sanitizersFor } from './core/registry';
// --- end chat 0 ---

// --- chat A: media ---
// --- end chat A ---

// --- chat B: text and UI ---
// --- end chat B ---

// --- chat C: output and embeds ---
// --- end chat C ---
