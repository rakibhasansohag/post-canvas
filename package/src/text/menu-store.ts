// A tiny store between the editor plugins (mention, hashtag and `/` suggestions, shortcuts that open UI) and the React
// chrome. The kit writes to it; the UI subscribes. Without the UI, nothing listens and the plugins stay quiet.
import type { Range } from '@tiptap/core';
import type { InsertItem, SuggestionItem } from '../core/types';

/** Which suggestion list is open. */
export type SuggestionKind = 'mention' | 'hashtag' | 'slash';

/** One entry in a suggestion list: a person or tag, or an insert item. */
export type SuggestionEntry =
  | { kind: 'mention' | 'hashtag'; item: SuggestionItem; isNew?: boolean }
  | { kind: 'slash'; item: InsertItem };

/** The open suggestion list. */
export interface SuggestionState {
  kind: SuggestionKind;
  query: string;
  range: Range;
  entries: SuggestionEntry[];
  loading: boolean;
  /** Where the typed trigger is on screen. */
  clientRect: (() => DOMRect | null) | null;
  /** Picks an entry. */
  pick: (entry: SuggestionEntry) => void;
}

/** UI events the editor asks for, such as Mod-K for the link popover. */
export type MenuEvent = 'link';

type Listener = () => void;

/** The store's API. */
export interface MenuStore {
  getSuggestion(): SuggestionState | null;
  setSuggestion(state: SuggestionState | null): void;
  subscribe(listener: Listener): () => void;
  /** The UI registers its key handler for the open list; the plugin forwards keys to it. */
  setKeyHandler(handler: ((event: KeyboardEvent) => boolean) | null): void;
  handleKey(event: KeyboardEvent): boolean;
  /** Asks the UI to open something. Returns `false` when no UI listens. */
  emit(event: MenuEvent): boolean;
  on(event: MenuEvent, handler: () => void): () => void;
}

/** Creates an empty store. One per editor. */
export function createMenuStore(): MenuStore {
  let suggestion: SuggestionState | null = null;
  let keyHandler: ((event: KeyboardEvent) => boolean) | null = null;
  const listeners = new Set<Listener>();
  const handlers = new Map<MenuEvent, Set<() => void>>();

  return {
    getSuggestion: () => suggestion,
    setSuggestion(state) {
      suggestion = state;
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setKeyHandler(handler) {
      keyHandler = handler;
    },
    handleKey: (event) => (keyHandler ? keyHandler(event) : false),
    emit(event) {
      const set = handlers.get(event);
      if (!set || set.size === 0) return false;
      for (const handler of set) handler();
      return true;
    },
    on(event, handler) {
      const set = handlers.get(event) ?? new Set();
      set.add(handler);
      handlers.set(event, set);
      return () => set.delete(handler);
    },
  };
}
