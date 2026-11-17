'use client';
// The text blocks offered in the `+` and `/` menus and the toolbar's insert menu.
import type { Editor, Range } from '@tiptap/core';
import {
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Pilcrow,
  Quote,
  Table2,
} from 'lucide-react';
import type { Features, InsertItem, Translator } from '../core/types';

const headingIcons = { 1: Heading1, 2: Heading2, 3: Heading3, 4: Heading4 } as const;

/** A chain that first removes the typed `/query`, when there is one. */
function start(editor: Editor, range?: Range) {
  const chain = editor.chain().focus();
  return range ? chain.deleteRange(range) : chain;
}

/** The text insert items for a feature set: `basic`, `lists` and `advanced` groups. */
export function textInsertItems(features: Features, t: Translator): InsertItem[] {
  const items: InsertItem[] = [
    {
      id: 'paragraph',
      group: 'basic',
      label: t('text.insert.paragraph'),
      description: t('text.insert.paragraphHint'),
      keywords: ['text', 'paragraph', 'plain', 'p'],
      icon: Pilcrow,
      run: ({ editor, range }) => void start(editor, range).clearNodes().setParagraph().run(),
    },
  ];
  if (features.heading) {
    for (const level of features.heading.levels) {
      items.push({
        id: `heading-${level}`,
        group: 'basic',
        label: t('text.insert.heading', { level }),
        keywords: ['heading', 'title', `h${level}`, '#'.repeat(level)],
        icon: headingIcons[level],
        run: ({ editor, range }) => void start(editor, range).clearNodes().setHeading({ level }).run(),
      });
    }
  }
  if (features.blockquote) {
    items.push({
      id: 'blockquote',
      group: 'basic',
      label: t('text.insert.quote'),
      keywords: ['quote', 'blockquote', 'citation', '>'],
      icon: Quote,
      run: ({ editor, range }) => void start(editor, range).clearNodes().setBlockquote().run(),
    });
  }
  if (features.horizontalRule) {
    items.push({
      id: 'horizontal-rule',
      group: 'basic',
      label: t('text.insert.divider'),
      keywords: ['divider', 'rule', 'line', 'separator', 'hr', '---'],
      icon: Minus,
      run: ({ editor, range }) => void start(editor, range).setHorizontalRule().run(),
    });
  }
  if (features.bulletList) {
    items.push({
      id: 'bullet-list',
      group: 'lists',
      label: t('text.insert.bulletList'),
      keywords: ['bullet', 'list', 'unordered', 'ul', '-'],
      icon: List,
      run: ({ editor, range }) => void start(editor, range).clearNodes().toggleBulletList().run(),
    });
  }
  if (features.orderedList) {
    items.push({
      id: 'ordered-list',
      group: 'lists',
      label: t('text.insert.orderedList'),
      keywords: ['numbered', 'ordered', 'list', 'ol', '1.'],
      icon: ListOrdered,
      run: ({ editor, range }) => void start(editor, range).clearNodes().toggleOrderedList().run(),
    });
  }
  if (features.taskList) {
    items.push({
      id: 'task-list',
      group: 'lists',
      label: t('text.insert.taskList'),
      keywords: ['task', 'todo', 'checklist', 'checkbox', '[]'],
      icon: ListTodo,
      run: ({ editor, range }) => void start(editor, range).clearNodes().toggleTaskList().run(),
    });
  }
  if (features.codeBlock) {
    items.push({
      id: 'code-block',
      group: 'advanced',
      label: t('text.insert.codeBlock'),
      keywords: ['code', 'snippet', 'pre', 'program', '```'],
      icon: Code2,
      run: ({ editor, range }) => void start(editor, range).clearNodes().setCodeBlock().run(),
    });
  }
  if (features.table) {
    items.push({
      id: 'table',
      group: 'advanced',
      label: t('text.insert.table'),
      keywords: ['table', 'grid', 'rows', 'columns', 'spreadsheet'],
      icon: Table2,
      run: ({ editor, range }) =>
        void start(editor, range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    });
  }
  return items;
}

/** Items whose label, id or keywords match `query`, best matches first. */
export function filterInsertItems(items: InsertItem[], query: string): InsertItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  const scored = items
    .map((item, index) => {
      const label = item.label.toLowerCase();
      const score = label.startsWith(q)
        ? 0
        : label.includes(q)
          ? 1
          : item.keywords.some((word) => word.toLowerCase().startsWith(q)) || item.id.startsWith(q)
            ? 2
            : item.keywords.some((word) => word.toLowerCase().includes(q))
              ? 3
              : -1;
      return { item, score, index };
    })
    .filter((entry) => entry.score >= 0);
  scored.sort((a, b) => a.score - b.score || a.index - b.index);
  return scored.map((entry) => entry.item);
}
