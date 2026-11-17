// Adds Post Canvas's own fields to Tiptap's extension configs. `core/registry.ts` reads them.
import type { Editor } from '@tiptap/core';
import type { AttrsSanitizer, InsertItem, PostCanvasCoreStorage, Problem } from './types';

declare module '@tiptap/core' {
  interface Storage {
    /** Shared state of the Post Canvas core extension. */
    postCanvasCore: PostCanvasCoreStorage;
  }

  interface NodeConfig<Options, Storage> {
    /**
     * Cleans this node's attributes from untrusted JSON. Pure: it runs on the server. Returns `null` to drop the node.
     * Put it on the schema extension so the server sees it.
     */
    postCanvasSanitize?: AttrsSanitizer;
    /** Items this node adds to the `+` and `/` menus. Put it on the editor extension. */
    postCanvasInsert?: (this: { name: string; editor: Editor; options: Options; storage: Storage }) => InsertItem[];
    /** What this node reports as blocking or warning before publishing. Put it on the editor extension. */
    postCanvasProblems?: (this: { name: string; editor: Editor; options: Options; storage: Storage }) => Problem[];
  }

  interface MarkConfig<Options, Storage> {
    /** Cleans this mark's attributes from untrusted JSON. Pure. Returns `null` to drop the mark. */
    postCanvasSanitize?: AttrsSanitizer;
    /** Items this mark adds to the `+` and `/` menus. */
    postCanvasInsert?: (this: { name: string; editor: Editor; options: Options; storage: Storage }) => InsertItem[];
    /** What this mark reports before publishing. */
    postCanvasProblems?: (this: { name: string; editor: Editor; options: Options; storage: Storage }) => Problem[];
  }

  interface ExtensionConfig<Options, Storage> {
    /** Items this extension adds to the `+` and `/` menus. */
    postCanvasInsert?: (this: { name: string; editor: Editor; options: Options; storage: Storage }) => InsertItem[];
    /** What this extension reports before publishing. */
    postCanvasProblems?: (this: { name: string; editor: Editor; options: Options; storage: Storage }) => Problem[];
  }
}

export {};
