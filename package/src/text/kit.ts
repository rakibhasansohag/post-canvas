'use client';
// The editor text kit: the text schema plus autolinking, resizable tables, mention and hashtag suggestions, the `/`
// menu, code highlighting, paste cleanup, placeholder, character count, cursors, undo and redo, insert items, limits
// and problems.
import { Extension, type AnyExtension, type Editor } from '@tiptap/core';
import Link, { type LinkOptions } from '@tiptap/extension-link';
import { ListKeymap } from '@tiptap/extension-list';
import Mention, { type MentionOptions } from '@tiptap/extension-mention';
import { Table } from '@tiptap/extension-table';
import { CharacterCount, Dropcursor, Gapcursor, Placeholder, TrailingNode, UndoRedo } from '@tiptap/extensions';
import type { Node as PmNode } from '@tiptap/pm/model';
import { PluginKey, type EditorState } from '@tiptap/pm/state';
import { Suggestion, type SuggestionOptions, type SuggestionProps } from '@tiptap/suggestion';
import { collectInsertItems } from '../core/registry';
import type { Features, PostFields, Problem, SuggestionItem } from '../core/types';
import { classifyEditor } from './classify-editor';
import type { Classifier } from './classify';
import { CodeHighlight } from './code-highlight';
import { deleteBlock, duplicateBlock, moveBlock } from './block-commands';
import { filterInsertItems, textInsertItems } from './insert-items';
import { isInsertCapped, limitProblems, maxMentions, type Limits } from './limits';
import { createMenuStore, type MenuStore, type SuggestionEntry, type SuggestionKind } from './menu-store';
import { PasteCleanup } from './paste';
import { linkSpec, mentionHTML, mentionSpec, mentionText, textExtensions } from './schema';
import { getDocStats } from './stats';
import { safeHref, safeHttpUrl } from '../core/url';
import '../core/extension-fields';

/** What the text kit keeps in `editor.storage.postCanvasText`. `PostCanvas` keeps it current. */
export interface PostCanvasTextStorage {
  /** Between the suggestion plugins and the UI. */
  menu: MenuStore;
  limits: Limits;
  classifier: Classifier | null;
  /** The title and cover, for problems such as a missing title. */
  fields: PostFields;
  /** The empty-document placeholder. `null` uses the locale's. */
  placeholder: string | null;
}

declare module '@tiptap/core' {
  interface Storage {
    /** State of the Post Canvas text kit. */
    postCanvasText: PostCanvasTextStorage;
  }
}

/** Mentions and hashtags in a document. */
export function countMentions(doc: PmNode): number {
  let count = 0;
  doc.descendants((node) => {
    if (node.type.name === 'mention') count++;
    return true;
  });
  return count;
}

const hashtagPattern = /^[\p{L}\p{N}_]{1,50}$/u;

/** Sends a suggestion's state to the menu store, where the UI picks it up. */
function storeRenderer(kind: SuggestionKind): SuggestionOptions<SuggestionEntry, SuggestionEntry>['render'] {
  return () => {
    let store: MenuStore | null = null;
    const push = (props: SuggestionProps<SuggestionEntry, SuggestionEntry>) => {
      store = props.editor.storage.postCanvasText.menu;
      store.setSuggestion({
        kind,
        query: props.query,
        range: props.range,
        entries: props.items,
        loading: props.loading,
        clientRect: props.clientRect ?? null,
        pick: (entry) => props.command(entry),
      });
    };
    return {
      onStart: push,
      onUpdate: push,
      onExit: () => store?.setSuggestion(null),
      onKeyDown: ({ event }) => (event.key === 'Escape' ? false : (store?.handleKey(event) ?? false)),
    };
  };
}

/** Can a mention go at this range? Not past the cap, and only where inline nodes are allowed. */
function mentionAllowed(state: EditorState, from: number): boolean {
  const type = state.schema.nodes.mention;
  if (!type) return false;
  const $from = state.doc.resolve(from);
  return !!$from.parent.type.contentMatch.matchType(type) && countMentions(state.doc) < maxMentions;
}

function mentionSuggestion(
  kind: 'mention' | 'hashtag',
): Omit<SuggestionOptions<SuggestionEntry, SuggestionEntry>, 'editor'> {
  const char = kind === 'mention' ? '@' : '#';
  return {
    char,
    pluginKey: new PluginKey(kind === 'mention' ? 'postCanvasMention' : 'postCanvasHashtag'),
    debounce: 150,
    minQueryLength: kind === 'hashtag' ? 1 : 0,
    allow: ({ state, range, editor }) => editor.isEditable && mentionAllowed(state, range.from),
    items: async ({ query, editor, signal }) => {
      const adapters = editor.storage.postCanvasCore.adapters;
      const source = kind === 'mention' ? adapters.mentions : adapters.hashtags;
      let found: SuggestionItem[];
      try {
        found = source ? (await source.search(query, { signal })).slice(0, 8) : [];
      } catch {
        found = []; // No suggestions is fine: the text stays as typed.
      }
      const entries: SuggestionEntry[] = found.map((item) => ({ kind, item }));
      if (kind === 'hashtag' && hashtagPattern.test(query) && !found.some((item) => item.id === query)) {
        entries.push({ kind, item: { id: query, label: query }, isNew: true });
      }
      return entries;
    },
    command: ({ editor, range, props }) => {
      if (props.kind === 'slash') return;
      if (!mentionAllowed(editor.state, range.from)) return;
      const next = editor.view.state.selection.$to.nodeAfter;
      const to = next?.text?.startsWith(' ') ? range.to + 1 : range.to;
      editor
        .chain()
        .focus()
        .insertContentAt({ from: range.from, to }, [
          { type: 'mention', attrs: { id: props.item.id, label: props.item.label, mentionSuggestionChar: char } },
          { type: 'text', text: ' ' },
        ])
        .run();
    },
    render: storeRenderer(kind),
  };
}

const slashKey = new PluginKey('postCanvasSlash');

/** The `/` menu: every insert item, filtered by what follows the slash. */
const SlashMenu = Extension.create({
  name: 'postCanvasSlashMenu',

  addProseMirrorPlugins() {
    return [
      Suggestion<SuggestionEntry, SuggestionEntry>({
        editor: this.editor,
        char: '/',
        pluginKey: slashKey,
        allow: ({ state, range, editor }) => {
          if (!editor.isEditable) return false;
          const $from = state.doc.resolve(range.from);
          return $from.parent.isTextblock && !$from.parent.type.spec.code;
        },
        items: ({ query, editor }) => {
          const storage = editor.storage.postCanvasText;
          const stats = getDocStats(editor.getJSON());
          return filterInsertItems(collectInsertItems(editor), query)
            .filter((item) => !isInsertCapped(item, stats, storage.limits))
            .map((item) => ({ kind: 'slash', item }));
        },
        command: ({ editor, range, props }) => {
          if (props.kind === 'slash') props.item.run({ editor, range, source: 'slash' });
        },
        render: storeRenderer('slash'),
      }),
    ];
  },
});

/** Problems of the classifier: an article without a title. */
function classifierProblems(editor: Editor): Problem[] {
  const result = classifyEditor(editor);
  const { fields } = editor.storage.postCanvasText;
  const { t } = editor.storage.postCanvasCore;
  if (result?.requireTitle && !fields.title?.trim()) {
    return [{ code: 'title.missing', severity: 'error', message: t('text.problem.title') }];
  }
  return [];
}

/**
 * The text kit's own extension: the menu store, limits, classifier and fields in storage; the text insert items;
 * limit problems; and the shortcuts Mod-K (link), Alt-Shift-Up and Down (move block) and Alt-Shift-D (duplicate).
 */
export const PostCanvasText = Extension.create<Record<string, never>, PostCanvasTextStorage>({
  name: 'postCanvasText',

  addStorage() {
    return { menu: createMenuStore(), limits: {}, classifier: null, fields: {}, placeholder: null };
  },

  postCanvasInsert() {
    const { features, t } = this.editor.storage.postCanvasCore;
    return textInsertItems(features, t);
  },

  postCanvasProblems() {
    const { t } = this.editor.storage.postCanvasCore;
    const stats = getDocStats(this.editor.getJSON());
    return [...limitProblems(stats, this.editor.storage.postCanvasText.limits, t), ...classifierProblems(this.editor)];
  },

  addKeyboardShortcuts() {
    const blockStart = () => {
      const { $from } = this.editor.state.selection;
      return $from.depth === 0 ? $from.pos : $from.before(1);
    };
    return {
      'Mod-k': () => this.editor.storage.postCanvasText.menu.emit('link'),
      'Alt-Shift-ArrowUp': () => moveBlock(this.editor, blockStart(), -1),
      'Alt-Shift-ArrowDown': () => moveBlock(this.editor, blockStart(), 1),
      'Alt-Shift-d': () => duplicateBlock(this.editor, blockStart()),
      'Alt-Shift-Backspace': () => deleteBlock(this.editor, blockStart()),
    };
  },
});

/** The editor's `link`: Tiptap's `Link` (commands, autolinking, paste) with the schema's attributes and output. */
const EditorLink = Link.extend({
  ...linkSpec,
  addOptions() {
    return {
      ...(this.parent?.() as LinkOptions),
      openOnClick: false,
      enableClickSelection: false,
      defaultProtocol: 'https',
      HTMLAttributes: {},
      isAllowedUri: (url: string) => safeHref(url) !== null,
    };
  },
});

/** The editor's `mention`: Tiptap's `Mention` (suggestions, Backspace) with the schema's attributes and output. */
const EditorMention = Mention.extend({ ...mentionSpec }).configure({
  renderText: ({ node }) => mentionText(node.attrs),
  renderHTML: ({ options, node }) => mentionHTML(options.HTMLAttributes, node.attrs),
});

/** The editor text extensions for a feature set. */
export function textKit(features: Features): AnyExtension[] {
  const suggestions = [
    ...(features.mention ? [mentionSuggestion('mention')] : []),
    ...(features.hashtag ? [mentionSuggestion('hashtag')] : []),
  ];
  const list = textExtensions(features, {
    link: EditorLink.configure({
      autolink: true,
      linkOnPaste: true,
      shouldAutoLink: (url: string) => safeHttpUrl(url.includes('://') ? url : `https://${url}`) !== null,
      isAllowedUri: (url: string) => safeHref(url) !== null,
    }),
    table: Table.configure({ resizable: true, allowTableNodeSelection: true }),
    // The mention node's options are typed for its own attrs; the entries carry them and the command builds the node.
    mention: EditorMention.configure({ suggestions: suggestions as unknown as MentionOptions['suggestions'] }),
  });
  if (features.bulletList || features.orderedList || features.taskList) list.push(ListKeymap);
  if (features.codeBlock) list.push(CodeHighlight);
  if (features.slashMenu) list.push(SlashMenu);
  list.push(
    PostCanvasText,
    PasteCleanup,
    Placeholder.configure({
      placeholder: ({ editor }) =>
        editor.storage.postCanvasText?.placeholder ?? editor.storage.postCanvasCore.t('core.editor.placeholder'),
      showOnlyWhenEditable: true,
    }),
    CharacterCount,
    Dropcursor.configure({ class: 'pc-drop-cursor', width: 2 }),
    Gapcursor,
    TrailingNode.configure({ node: 'paragraph' }),
    UndoRedo,
  );
  return list;
}
