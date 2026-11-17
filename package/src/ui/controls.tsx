'use client';
// The formatting controls the toolbar and the selection menu share.
import type { Editor } from '@tiptap/core';
import { useEditorState } from '@tiptap/react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Baseline,
  Bold,
  Code,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  ListTodo,
  Pilcrow,
  Plus,
  Quote,
  Redo2,
  Strikethrough,
  Subscript,
  Superscript,
  Table2,
  Underline,
  Undo2,
  type LucideIcon,
} from 'lucide-react';
import { collectInsertItems } from '../core/registry';
import { paletteColors, type InsertGroup, type PaletteColor, type Translator } from '../core/types';
import { turnInto, turnIntoTargets, type TurnIntoTarget } from '../text/block-commands';
import { codeLanguages } from '../text/code-highlight';
import { isInsertCapped } from '../text/limits';
import { getDocStats } from '../text/stats';
import { MenuButton, type MenuEntry } from './menu';
import { useEditorUi } from './ui-context';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** A shortcut written the platform's way: `Mod-B` is ⌘B on Apple and Ctrl+B elsewhere. */
export function shortcut(keys: string): string {
  return keys
    .split('-')
    .map((key) => (key === 'Mod' ? (isMac ? '⌘' : 'Ctrl') : key === 'Shift' ? (isMac ? '⇧' : 'Shift') : key === 'Alt' ? (isMac ? '⌥' : 'Alt') : key))
    .join(isMac ? '' : '+');
}

/** Props of `TbButton`. */
export interface TbButtonProps {
  icon: LucideIcon;
  label: string;
  /** A shortcut such as `Mod-B`, added to the tooltip. */
  keys?: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick: (button: HTMLButtonElement) => void;
}

/** A toolbar icon button. It keeps the editor's selection when pressed. */
export function TbButton({ icon: Icon, label, keys, pressed, disabled, onClick }: TbButtonProps) {
  const title = keys ? `${label} (${shortcut(keys)})` : label;
  return (
    <button
      type="button"
      className="pc-tb-button"
      aria-label={label}
      title={title}
      aria-pressed={pressed}
      aria-keyshortcuts={keys?.replace('Mod', isMac ? 'Meta' : 'Control').replace(/-/g, '+')}
      disabled={disabled}
      data-roving=""
      onMouseDown={(event) => event.preventDefault()}
      onClick={(event) => onClick(event.currentTarget)}
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  );
}

/** A mark toggled by the toolbar and the selection menu. */
export type MarkName = 'bold' | 'italic' | 'underline' | 'strike' | 'code' | 'subscript' | 'superscript';

const markIcons: Record<MarkName, { icon: LucideIcon; keys: string }> = {
  bold: { icon: Bold, keys: 'Mod-B' },
  italic: { icon: Italic, keys: 'Mod-I' },
  underline: { icon: Underline, keys: 'Mod-U' },
  strike: { icon: Strikethrough, keys: 'Mod-Shift-S' },
  code: { icon: Code, keys: 'Mod-E' },
  subscript: { icon: Subscript, keys: 'Mod-,' },
  superscript: { icon: Superscript, keys: 'Mod-.' },
};

function toggleMark(editor: Editor, mark: MarkName): void {
  const chain = editor.chain().focus();
  if (mark === 'bold') chain.toggleBold().run();
  else if (mark === 'italic') chain.toggleItalic().run();
  else if (mark === 'underline') chain.toggleUnderline().run();
  else if (mark === 'strike') chain.toggleStrike().run();
  else if (mark === 'code') chain.toggleCode().run();
  else if (mark === 'subscript') chain.unsetSuperscript().toggleSubscript().run();
  else chain.unsetSubscript().toggleSuperscript().run();
}

/** Toggle buttons for the enabled marks among `marks`. */
export function MarkButtons({ marks }: { marks: MarkName[] }) {
  const { editor, t, features } = useEditorUi();
  const enabled = marks.filter((mark) => features[mark]);
  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => enabled.map((mark) => current.isActive(mark)),
    equalityFn: (a, b) => !!b && a.length === b.length && a.every((value, index) => value === b[index]),
  });
  return (
    <>
      {enabled.map((mark, index) => (
        <TbButton
          key={mark}
          icon={markIcons[mark].icon}
          label={t(`ui.mark.${mark}`)}
          keys={markIcons[mark].keys}
          pressed={active[index] ?? false}
          onClick={() => toggleMark(editor, mark)}
        />
      ))}
    </>
  );
}

/** Undo and redo. */
export function HistoryButtons() {
  const { editor, t } = useEditorUi();
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({ undo: current.can().undo(), redo: current.can().redo() }),
  });
  return (
    <>
      <TbButton
        icon={Undo2}
        label={t('ui.history.undo')}
        keys="Mod-Z"
        disabled={!state.undo}
        onClick={() => editor.chain().focus().undo().run()}
      />
      <TbButton
        icon={Redo2}
        label={t('ui.history.redo')}
        keys="Mod-Shift-Z"
        disabled={!state.redo}
        onClick={() => editor.chain().focus().redo().run()}
      />
    </>
  );
}

const turnIntoIcons: Record<TurnIntoTarget, LucideIcon> = {
  paragraph: Pilcrow,
  'heading-1': Heading1,
  'heading-2': Heading2,
  'heading-3': Heading3,
  'heading-4': Heading4,
  bulletList: List,
  orderedList: ListOrdered,
  taskList: ListTodo,
  blockquote: Quote,
  codeBlock: Code2,
};

/** The label of a "turn into" target. */
export function turnIntoLabel(target: TurnIntoTarget, t: Translator): string {
  if (target.startsWith('heading-')) return t('text.insert.heading', { level: Number(target.slice(-1)) });
  const keys: Record<string, string> = {
    paragraph: 'text.insert.paragraph',
    bulletList: 'text.insert.bulletList',
    orderedList: 'text.insert.orderedList',
    taskList: 'text.insert.taskList',
    blockquote: 'text.insert.quote',
    codeBlock: 'text.insert.codeBlock',
  };
  return t(keys[target]!);
}

/** Menu entries that turn the block at `pos` (or the selection's) into another kind of block. */
export function turnIntoEntries(editor: Editor, t: Translator, current: TurnIntoTarget | null, pos?: number): MenuEntry[] {
  return turnIntoTargets(editor).map((target) => ({
    id: target,
    label: turnIntoLabel(target, t),
    icon: turnIntoIcons[target],
    checked: current === target,
    onSelect: () => void turnInto(editor, target, pos),
  }));
}

/** The innermost "turn into" target at the selection. */
function selectionTarget(editor: Editor): TurnIntoTarget | null {
  for (const name of ['codeBlock', 'taskList', 'orderedList', 'bulletList', 'blockquote'] as const) {
    if (editor.isActive(name)) return name;
  }
  for (const level of [1, 2, 3, 4] as const) if (editor.isActive('heading', { level })) return `heading-${level}`;
  return editor.isActive('paragraph') ? 'paragraph' : null;
}

/** The block type menu: "Text", "Heading 2", "Quote" and so on. */
export function BlockTypeMenu({ compact = false }: { compact?: boolean }) {
  const { editor, t } = useEditorUi();
  const current = useEditorState({ editor, selector: ({ editor: e }) => selectionTarget(e) });
  const label = current ? turnIntoLabel(current, t) : t('ui.blockType.label');
  return (
    <MenuButton
      label={compact ? t('ui.turnInto') : t('ui.blockType.label')}
      text={compact ? t('ui.turnInto') : label}
      entries={turnIntoEntries(editor, t, current)}
      className="pc-tb-block-type"
    />
  );
}

/** The link button: opens the link popover. */
export function LinkButton() {
  const { editor, t, openLink } = useEditorUi();
  const active = useEditorState({ editor, selector: ({ editor: e }) => e.isActive('link') });
  return <TbButton icon={LinkIcon} label={t('ui.link.button')} keys="Mod-K" pressed={active} onClick={openLink} />;
}

/** Text colour and highlight, from the theme palette. */
export function ColorMenu() {
  const { editor, t, features } = useEditorUi();
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      color: (e.getAttributes('textStyle').color as PaletteColor | null | undefined) ?? null,
      highlight: e.isActive('highlight') ? ((e.getAttributes('highlight').color as PaletteColor | null) ?? 'default') : null,
    }),
  });
  const entries: MenuEntry[] = [];
  if (features.color) {
    const group = t('ui.color.text');
    entries.push({
      id: 'color-default',
      group,
      label: t('ui.color.default'),
      checked: state.color === null,
      swatch: <span className="pc-swatch pc-swatch--text" aria-hidden="true">A</span>,
      onSelect: () => void editor.chain().focus().setMark('textStyle', { color: null }).removeEmptyTextStyle().run(),
    });
    for (const color of paletteColors) {
      entries.push({
        id: `color-${color}`,
        group,
        label: t(`ui.color.${color}`),
        checked: state.color === color,
        swatch: (
          <span className={`pc-swatch pc-swatch--text pc-color-${color}`} aria-hidden="true">
            A
          </span>
        ),
        onSelect: () => void editor.chain().focus().setMark('textStyle', { color }).run(),
      });
    }
  }
  if (features.highlight) {
    const group = t('ui.color.highlight');
    entries.push({
      id: 'highlight-none',
      group,
      label: t('ui.color.none'),
      checked: state.highlight === null,
      swatch: <span className="pc-swatch pc-swatch--none" aria-hidden="true" />,
      onSelect: () => void editor.chain().focus().unsetHighlight().run(),
    });
    entries.push({
      id: 'highlight-default',
      group,
      label: t('ui.color.default'),
      checked: state.highlight === 'default',
      swatch: <span className="pc-swatch pc-swatch--mark" aria-hidden="true" />,
      onSelect: () => void editor.chain().focus().unsetHighlight().setMark('highlight', { color: null }).run(),
    });
    for (const color of paletteColors) {
      entries.push({
        id: `highlight-${color}`,
        group,
        label: t(`ui.color.${color}`),
        checked: state.highlight === color,
        swatch: <span className={`pc-swatch pc-swatch--mark pc-highlight-${color}`} aria-hidden="true" />,
        onSelect: () => void editor.chain().focus().setHighlight({ color }).run(),
      });
    }
  }
  if (entries.length === 0) return null;
  return (
    <MenuButton
      label={t('ui.color.label')}
      icon={Baseline}
      entries={entries}
      active={state.color !== null || state.highlight !== null}
      className="pc-tb-color"
    />
  );
}

const alignIcons = { left: AlignLeft, center: AlignCenter, right: AlignRight, justify: AlignJustify } as const;

/** Text alignment. */
export function AlignMenu() {
  const { editor, t } = useEditorUi();
  const current = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      (['center', 'right', 'justify'] as const).find((align) => e.isActive({ textAlign: align })) ?? 'left',
  });
  return (
    <MenuButton
      label={t('ui.align.label')}
      icon={alignIcons[current]}
      entries={(['left', 'center', 'right', 'justify'] as const).map((align) => ({
        id: align,
        label: t(`ui.align.${align}`),
        icon: alignIcons[align],
        checked: current === align,
        onSelect: () =>
          void (align === 'left'
            ? editor.chain().focus().unsetTextAlign().run()
            : editor.chain().focus().setTextAlign(align).run()),
      }))}
    />
  );
}

/** Bullet, numbered and task list toggles. */
export function ListButtons() {
  const { editor, t, features } = useEditorUi();
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      task: e.isActive('taskList'),
    }),
  });
  return (
    <>
      {features.bulletList && (
        <TbButton
          icon={List}
          label={t('text.insert.bulletList')}
          keys="Mod-Shift-8"
          pressed={state.bullet}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
      )}
      {features.orderedList && (
        <TbButton
          icon={ListOrdered}
          label={t('text.insert.orderedList')}
          keys="Mod-Shift-7"
          pressed={state.ordered}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
      )}
      {features.taskList && (
        <TbButton
          icon={ListTodo}
          label={t('text.insert.taskList')}
          keys="Mod-Shift-9"
          pressed={state.task}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        />
      )}
    </>
  );
}

/** The insert item group headings, in menu order. */
export const insertGroups: readonly InsertGroup[] = ['basic', 'lists', 'media', 'embeds', 'advanced'];

/** Every insert item as menu entries, grouped, with media at the cap disabled. */
export function useInsertEntries(onRun: (run: () => void) => void, source: 'toolbar' | 'insert-button'): () => MenuEntry[] {
  const { editor, t, limits } = useEditorUi();
  return () => {
    const stats = getDocStats(editor.getJSON());
    const items = collectInsertItems(editor);
    return insertGroups.flatMap((group) =>
      items
        .filter((item) => item.group === group)
        .map((item) => ({
          id: item.id,
          group: t(`ui.insert.group.${group}`),
          label: item.label,
          icon: item.icon,
          disabled: isInsertCapped(item, stats, limits),
          hint: isInsertCapped(item, stats, limits) ? t('ui.insert.capped') : undefined,
          onSelect: () => onRun(() => item.run({ editor, source })),
        })),
    );
  };
}

/** The toolbar's insert menu: every block every area offers. */
export function InsertMenu() {
  const { editor, t } = useEditorUi();
  // Re-render on every document change, so items at a cap turn disabled.
  useEditorState({ editor, selector: ({ editor: e }) => e.state.doc });
  const entries = useInsertEntries((run) => run(), 'toolbar');
  return <MenuButton label={t('ui.insert.label')} icon={Plus} text={t('ui.insert.short')} entries={entries()} />;
}

/** Row, column and cell commands, shown while the caret is in a table. */
export function TableMenu() {
  const { editor, t } = useEditorUi();
  const inTable = useEditorState({ editor, selector: ({ editor: e }) => e.isActive('table') });
  const can = useEditorState({
    editor,
    selector: ({ editor: e }) => ({ merge: e.can().mergeCells(), split: e.can().splitCell() }),
  });
  if (!inTable) return null;
  const run = (command: (chain: ReturnType<Editor['chain']>) => ReturnType<Editor['chain']>) => () =>
    void command(editor.chain().focus()).run();
  const rows = t('ui.table.rows');
  const columns = t('ui.table.columns');
  const cells = t('ui.table.cells');
  const entries: MenuEntry[] = [
    { id: 'row-before', group: rows, label: t('ui.table.rowBefore'), onSelect: run((c) => c.addRowBefore()) },
    { id: 'row-after', group: rows, label: t('ui.table.rowAfter'), onSelect: run((c) => c.addRowAfter()) },
    { id: 'row-delete', group: rows, label: t('ui.table.rowDelete'), onSelect: run((c) => c.deleteRow()) },
    { id: 'header-row', group: rows, label: t('ui.table.headerRow'), onSelect: run((c) => c.toggleHeaderRow()) },
    { id: 'col-before', group: columns, label: t('ui.table.columnBefore'), onSelect: run((c) => c.addColumnBefore()) },
    { id: 'col-after', group: columns, label: t('ui.table.columnAfter'), onSelect: run((c) => c.addColumnAfter()) },
    { id: 'col-delete', group: columns, label: t('ui.table.columnDelete'), onSelect: run((c) => c.deleteColumn()) },
    { id: 'merge', group: cells, label: t('ui.table.merge'), disabled: !can.merge, onSelect: run((c) => c.mergeCells()) },
    { id: 'split', group: cells, label: t('ui.table.split'), disabled: !can.split, onSelect: run((c) => c.splitCell()) },
    { id: 'delete', group: cells, label: t('ui.table.delete'), onSelect: run((c) => c.deleteTable()) },
  ];
  return <MenuButton label={t('ui.table.label')} icon={Table2} entries={entries} />;
}

/** The code block language, shown while the caret is in a code block. */
export function CodeLanguageMenu() {
  const { editor, t } = useEditorUi();
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      active: e.isActive('codeBlock'),
      language: (e.getAttributes('codeBlock').language as string | null) ?? null,
    }),
  });
  if (!state.active) return null;
  const current = codeLanguages.find((language) => language.id === state.language);
  const entries: MenuEntry[] = [
    {
      id: 'plain',
      label: t('ui.code.plain'),
      checked: !state.language,
      onSelect: () => void editor.chain().focus().updateAttributes('codeBlock', { language: null }).run(),
    },
    ...codeLanguages.map((language) => ({
      id: language.id,
      label: language.label,
      checked: state.language === language.id,
      onSelect: () => void editor.chain().focus().updateAttributes('codeBlock', { language: language.id }).run(),
    })),
  ];
  return (
    <MenuButton
      label={t('ui.code.language')}
      text={current?.label ?? (state.language || t('ui.code.plain'))}
      entries={entries}
    />
  );
}
