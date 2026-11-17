'use client';
import type { Editor } from '@tiptap/core';
import { createContext, useContext, type ReactNode } from 'react';
import type { Adapters, Features, Translator } from '../types';

/** What every Post Canvas component reads from `usePostCanvasContext()`. */
export interface PostCanvasContextValue {
  /** `null` until the editor has mounted. */
  editor: Editor | null;
  t: Translator;
  adapters: Adapters;
  /** The resolved features. */
  features: Features;
}

const PostCanvasContext = createContext<PostCanvasContextValue | null>(null);

/** Provides the editor, translator, adapters and features to the components inside it. `PostCanvas` renders one. */
export function PostCanvasProvider({ value, children }: { value: PostCanvasContextValue; children: ReactNode }) {
  return <PostCanvasContext.Provider value={value}>{children}</PostCanvasContext.Provider>;
}

/** Reads the nearest `PostCanvasProvider`. Throws outside one. */
export function usePostCanvasContext(): PostCanvasContextValue {
  const value = useContext(PostCanvasContext);
  if (!value) throw new Error('[post-canvas] usePostCanvasContext() must be used inside <PostCanvasProvider>.');
  return value;
}

/** Reads the nearest `PostCanvasProvider`, or `null` outside one. */
export function useOptionalPostCanvasContext(): PostCanvasContextValue | null {
  return useContext(PostCanvasContext);
}
