'use client';
// The sticky toolbar. Its groups follow the features; groups that don't fit move into a "More" panel.
import { MoreHorizontal } from 'lucide-react';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Popover } from '../core/react/popover';
import {
  AlignMenu,
  BlockTypeMenu,
  CodeLanguageMenu,
  ColorMenu,
  HistoryButtons,
  InsertMenu,
  LinkButton,
  ListButtons,
  MarkButtons,
  TableMenu,
} from './controls';
import { useRovingFocus } from './roving';
import { useEditorUi } from './ui-context';

interface Group {
  id: string;
  node: ReactNode;
}

function useGroups(): Group[] {
  const { features } = useEditorUi();
  const groups: Group[] = [{ id: 'history', node: <HistoryButtons /> }];
  const blockTypes = features.heading || features.blockquote || features.codeBlock;
  if (blockTypes) groups.push({ id: 'block', node: <BlockTypeMenu /> });
  groups.push({ id: 'marks', node: <MarkButtons marks={['bold', 'italic', 'underline', 'strike', 'code']} /> });
  if (features.subscript || features.superscript)
    groups.push({ id: 'script', node: <MarkButtons marks={['subscript', 'superscript']} /> });
  if (features.link) groups.push({ id: 'link', node: <LinkButton /> });
  if (features.color || features.highlight) groups.push({ id: 'color', node: <ColorMenu /> });
  if (features.textAlign) groups.push({ id: 'align', node: <AlignMenu /> });
  if (features.bulletList || features.orderedList || features.taskList)
    groups.push({ id: 'lists', node: <ListButtons /> });
  groups.push({ id: 'insert', node: <InsertMenu /> });
  if (features.table) groups.push({ id: 'table', node: <TableMenu /> });
  if (features.codeBlock) groups.push({ id: 'code', node: <CodeLanguageMenu /> });
  return groups;
}

/** The editor toolbar: sticky, keyboard-operated with arrow keys, with an overflow panel on narrow screens. */
export function Toolbar() {
  const { t } = useEditorUi();
  const groups = useGroups();
  const bar = useRef<HTMLDivElement>(null);
  const measure = useRef<HTMLDivElement>(null);
  const roving = useRovingFocus(bar);
  const moreRoving = useRovingFocus(useRef<HTMLDivElement>(null));
  const [visible, setVisible] = useState(groups.length);
  const [moreOpen, setMoreOpen] = useState(false);
  const [moreButton, setMoreButton] = useState<HTMLButtonElement | null>(null);
  const groupKey = groups.map((group) => group.id).join(',');

  // Measure every group in an invisible copy, then show as many as fit.
  useLayoutEffect(() => {
    const container = bar.current;
    const copy = measure.current;
    if (!container || !copy) return;
    const fit = () => {
      const width = container.clientWidth;
      const widths = Array.from(copy.children).map((child) => (child as HTMLElement).offsetWidth);
      const gap = 6;
      const more = 44;
      const total = widths.reduce((sum, w) => sum + w + gap, 0);
      if (total <= width) {
        setVisible(widths.length);
        return;
      }
      let used = more;
      let count = 0;
      for (const w of widths) {
        if (used + w + gap > width) break;
        used += w + gap;
        count++;
      }
      setVisible(Math.max(1, count));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(container);
    observer.observe(copy);
    return () => observer.disconnect();
  }, [groupKey]);

  const shown = groups.slice(0, visible);
  const hidden = groups.slice(visible);

  return (
    <div className="pc-toolbar-wrap">
      <div ref={bar} className="pc-toolbar" role="toolbar" aria-label={t('ui.toolbar.label')} {...roving}>
        {shown.map((group) => (
          <div key={group.id} className="pc-toolbar__group" data-group={group.id}>
            {group.node}
          </div>
        ))}
        {hidden.length > 0 && (
          <div className="pc-toolbar__group">
            <button
              ref={setMoreButton}
              type="button"
              className="pc-tb-button"
              aria-label={t('ui.toolbar.more')}
              title={t('ui.toolbar.more')}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              data-roving=""
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setMoreOpen((open) => !open)}
            >
              <MoreHorizontal size={18} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
      <Popover
        open={moreOpen && hidden.length > 0}
        anchor={moreButton}
        onClose={() => setMoreOpen(false)}
        label={t('ui.toolbar.more')}
        placement="bottom-end"
        className="pc-toolbar-more"
      >
        <div className="pc-toolbar pc-toolbar--panel" role="toolbar" aria-label={t('ui.toolbar.more')} {...moreRoving}>
          {hidden.map((group) => (
            <div key={group.id} className="pc-toolbar__group" data-group={group.id}>
              {group.node}
            </div>
          ))}
        </div>
      </Popover>
      {/* An invisible, inert copy that measures every group's width. */}
      <div ref={measure} className="pc-toolbar pc-toolbar--measure" aria-hidden="true" inert>
        {groups.map((group) => (
          <div key={group.id} className="pc-toolbar__group">
            {group.node}
          </div>
        ))}
      </div>
    </div>
  );
}
