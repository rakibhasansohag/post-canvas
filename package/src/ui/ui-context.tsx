'use client';
// What the editor chrome shares: the editor, translator, features, limits and the link popover opener.
import type { ReferenceElement } from '@floating-ui/dom';
import type { Editor } from '@tiptap/core';
import { useEditorState } from '@tiptap/react';
import { createContext, useContext } from 'react';
import { collectProblems } from '../core/registry';
import type { Features, Problem, Translator } from '../core/types';
import type { Classification } from '../text/classify';
import { classifyEditor } from '../text/classify-editor';
import type { Limits } from '../text/limits';
import { getDocStats, type DocStats } from '../text/stats';

/** Shared by the toolbar, menus, fields and status bar. */
export interface EditorUi {
  editor: Editor;
  t: Translator;
  features: Features;
  limits: Limits;
  /** Opens the link popover, anchored to an element or, by default, the selection. */
  openLink: (anchor?: ReferenceElement | null) => void;
}

const UiContext = createContext<EditorUi | null>(null);

/** Provides the editor chrome's shared state. */
export const EditorUiProvider = UiContext.Provider;

/** Reads the editor chrome's shared state. */
export function useEditorUi(): EditorUi {
  const value = useContext(UiContext);
  if (!value) throw new Error('[post-canvas] Editor UI used outside <PostCanvas>.');
  return value;
}

/** Statistics, classification and problems of the current document, updated on every change. */
export interface DocInfo {
  stats: DocStats;
  classification: Classification | null;
  problems: Problem[];
}

const emptyInfo: DocInfo = { stats: getDocStats(null), classification: null, problems: [] };

/** Reads `DocInfo`, recomputed only when the document (or nothing else the editor reports) changes. */
export function useDocInfo(editor: Editor | null): DocInfo {
  return (
    useEditorState({
      editor,
      selector: ({ editor: current }): DocInfo => {
        if (!current || current.isDestroyed) return emptyInfo;
        return {
          stats: getDocStats(current.getJSON()),
          classification: classifyEditor(current),
          problems: collectProblems(current),
        };
      },
      equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b),
    }) ?? emptyInfo
  );
}
