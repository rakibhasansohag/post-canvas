// Everything that blocks or warns before publishing, from every area's extensions.
import type { Editor } from '@tiptap/core';
import { collectProblems } from '../core/registry';
import type { Problem } from '../core/types';

/**
 * What blocks publishing right now: limits broken, a missing article title, uploads still running and every other
 * problem the editor's extensions report. Empty when the document is ready.
 */
export function getProblems(editor: Editor): Problem[] {
  return collectProblems(editor);
}
