import { flattenExtensions, getExtensionField, type AnyExtension, type Editor } from '@tiptap/core';
import type { AttrsSanitizer, InsertItem, Problem } from './types';
import './extension-fields';

type Collector<T> = (this: { name: string; editor: Editor; options: unknown; storage: unknown }) => T[];

function collect<T>(editor: Editor, field: 'postCanvasInsert' | 'postCanvasProblems'): T[] {
  return editor.extensionManager.extensions.flatMap((extension) => {
    const read = getExtensionField<Collector<T> | undefined>(extension, field, {
      name: extension.name,
      editor,
      options: extension.options,
      storage: extension.storage,
    });
    return read ? read() : [];
  });
}

/** Every insert item the editor's extensions offer, in extension order. The `+` and `/` menus read this. */
export function collectInsertItems(editor: Editor): InsertItem[] {
  return collect<InsertItem>(editor, 'postCanvasInsert');
}

/** Every problem the editor's extensions report right now. */
export function collectProblems(editor: Editor): Problem[] {
  return collect<Problem>(editor, 'postCanvasProblems');
}

/** The attribute sanitizers of a list of extensions (nested ones included), by node or mark name. */
export function sanitizersFor(extensions: AnyExtension[]): Record<string, AttrsSanitizer> {
  const sanitizers: Record<string, AttrsSanitizer> = {};
  for (const extension of flattenExtensions(extensions)) {
    if (extension.type !== 'node' && extension.type !== 'mark') continue;
    const sanitize = getExtensionField<AttrsSanitizer | undefined>(extension, 'postCanvasSanitize');
    if (sanitize) sanitizers[extension.name] = sanitize;
  }
  return sanitizers;
}
