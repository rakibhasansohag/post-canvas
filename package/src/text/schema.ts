// Owner: chat B (text and editor UI). Wave-0 stub: StarterKit with its defaults, so there is something to type in.
// Replace with explicit, features-driven text extensions.
import type { AnyExtension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import type { Features } from '../core/types';

/** The render-safe text extensions for a feature set. */
export function textSchema(_features: Features): AnyExtension[] {
  return [StarterKit];
}
