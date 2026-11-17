// Runs the editor's classifier on its current document.
import type { Editor } from '@tiptap/core';
import type { Classification } from './classify';
import { getDocStats } from './stats';

/** The current classification, or `null` when the editor has no classifier. */
export function classifyEditor(editor: Editor): Classification | null {
  const classifier = editor.storage.postCanvasText?.classifier;
  if (!classifier) return null;
  const json = editor.getJSON();
  return classifier({ json, stats: getDocStats(json), t: editor.storage.postCanvasCore.t });
}
