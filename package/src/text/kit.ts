// Owner: chat B (text and editor UI). Wave-0 stub: StarterKit with its defaults, so there is something to type in.
// Replace with the text schema extended with commands, shortcuts, input rules and insert items.
import type { AnyExtension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import type { Features } from '../core/types';

/** The editor text extensions for a feature set. */
export function textKit(_features: Features): AnyExtension[] {
  return [StarterKit.configure({ link: { openOnClick: false } })];
}
