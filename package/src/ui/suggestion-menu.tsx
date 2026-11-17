'use client';
// The list under `@`, `#` and `/`: a listbox the editor points at with aria-activedescendant, so focus stays in the
// text while the arrow keys move through it. A press keeps the editor's focus, and a click or tap picks.
import { autoUpdate, computePosition, flip, offset, shift, type VirtualElement } from '@floating-ui/dom';
import { Hash } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { safeMediaSrc } from '../core/url';
import { createMenuStore, type MenuStore, type SuggestionEntry, type SuggestionState } from '../text/menu-store';
import { insertGroups } from './controls';
import { useEditorUi } from './ui-context';

const emptyStore = createMenuStore();

function initials(label: string): string {
  return Array.from(label.trim())
    .filter((_, index, chars) => index === 0 || chars[index - 1] === ' ')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** Renders the open suggestion list, if any. */
export function SuggestionMenu() {
  const { editor, t } = useEditorUi();
  // An editor built without the text kit has no store; an empty one keeps the hooks in order.
  const store = (editor.storage.postCanvasText as { menu?: MenuStore } | undefined)?.menu ?? emptyStore;
  const state = useSyncExternalStore(store.subscribe, store.getSuggestion, () => null);
  const announcement = !state
    ? ''
    : state.loading
      ? t('ui.suggest.loading')
      : state.entries.length === 0
        ? t('ui.suggest.none')
        : t('ui.suggest.count', { count: state.entries.length });
  return (
    <>
      {state && <SuggestionList key={`${state.kind}:${state.range.from}`} state={state} />}
      <div className="pc-sr-only" aria-live="polite">
        {announcement}
      </div>
    </>
  );
}

function SuggestionList({ state }: { state: SuggestionState }) {
  const { editor, t } = useEditorUi();
  const id = useId();
  const [active, setActive] = useState(0);
  const { entries } = state;
  const index = entries.length === 0 ? -1 : Math.min(active, entries.length - 1);

  // A new query starts at the top.
  const [query, setQuery] = useState(state.query);
  if (query !== state.query) {
    setQuery(state.query);
    setActive(0);
  }

  // Keys arrive from the suggestion plugin while focus stays in the editor.
  useEffect(() => {
    const store = (editor.storage.postCanvasText as { menu?: MenuStore } | undefined)?.menu ?? emptyStore;
    store.setKeyHandler((event) => {
      if (entries.length === 0) return false;
      if (event.key === 'ArrowDown') {
        setActive((value) => (Math.min(value, entries.length - 1) + 1) % entries.length);
        return true;
      }
      if (event.key === 'ArrowUp') {
        setActive((value) => (Math.min(value, entries.length - 1) - 1 + entries.length) % entries.length);
        return true;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        const entry = entries[index];
        if (!entry) return false;
        state.pick(entry);
        return true;
      }
      return false;
    });
    return () => store.setKeyHandler(null);
  }, [editor, entries, index, state]);

  // Point the editor at the list and the active option.
  useEffect(() => {
    const dom = editor.view.dom;
    dom.setAttribute('aria-controls', id);
    dom.setAttribute('aria-expanded', 'true');
    dom.setAttribute('aria-autocomplete', 'list');
    if (index >= 0) dom.setAttribute('aria-activedescendant', `${id}-${index}`);
    else dom.removeAttribute('aria-activedescendant');
    return () => {
      for (const name of ['aria-controls', 'aria-expanded', 'aria-autocomplete', 'aria-activedescendant'])
        dom.removeAttribute(name);
    };
  }, [editor, id, index]);

  // Keep the active option in view.
  useEffect(() => {
    if (index >= 0) document.getElementById(`${id}-${index}`)?.scrollIntoView({ block: 'nearest' });
  }, [id, index]);

  // Position under the typed trigger, and keep it there while the page scrolls.
  const panel = useRef<HTMLDivElement>(null);
  const rect = useRef(state.clientRect);
  useLayoutEffect(() => {
    rect.current = state.clientRect;
  });
  useLayoutEffect(() => {
    const floating = panel.current;
    if (!floating) return;
    const reference: VirtualElement = {
      getBoundingClientRect: () => rect.current?.() ?? editor.view.dom.getBoundingClientRect(),
      contextElement: editor.view.dom,
    };
    return autoUpdate(reference, floating, () => {
      void computePosition(reference, floating, {
        placement: 'bottom-start',
        strategy: 'fixed',
        middleware: [offset(6), flip({ padding: 8 }), shift({ padding: 8 })],
      }).then(({ x, y }) => {
        floating.style.left = `${x}px`;
        floating.style.top = `${y}px`;
      });
    });
  }, [editor]);

  const label =
    state.kind === 'mention'
      ? t('ui.suggest.people')
      : state.kind === 'hashtag'
        ? t('ui.suggest.tags')
        : t('ui.suggest.blocks');
  // Slash entries come grouped like the insert menus.
  const order = (entry: SuggestionEntry) => (entry.kind === 'slash' ? insertGroups.indexOf(entry.item.group) : 0);
  const showEmpty = !state.loading && entries.length === 0 && (state.kind !== 'mention' || state.query.length > 0);

  return (
    <div
      ref={panel}
      id={id}
      role="listbox"
      aria-label={label}
      className="pc-popover pc-suggest"
      onMouseDown={(event) => event.preventDefault()}
    >
      {entries.map((entry, position) => {
        const previous = entries[position - 1];
        const heading =
          entry.kind === 'slash' && (!previous || order(previous) !== order(entry))
            ? t(`ui.insert.group.${entry.item.group}`)
            : null;
        return (
          <div key={entryKey(entry)} role="presentation">
            {heading && (
              <div className="pc-menu__heading" role="presentation">
                {heading}
              </div>
            )}
            <div
              id={`${id}-${position}`}
              role="option"
              aria-selected={position === index}
              className="pc-suggest__option"
              onPointerEnter={() => setActive(position)}
              onClick={() => state.pick(entry)}
            >
              <EntryView entry={entry} />
            </div>
          </div>
        );
      })}
      {showEmpty && (
        <div className="pc-suggest__empty" role="presentation">
          {t('ui.suggest.none')}
        </div>
      )}
    </div>
  );
}

function entryKey(entry: SuggestionEntry): string {
  return entry.kind === 'slash'
    ? `slash:${entry.item.id}`
    : `${entry.kind}:${entry.item.id}:${entry.isNew ? 'new' : ''}`;
}

function EntryView({ entry }: { entry: SuggestionEntry }) {
  const { t } = useEditorUi();
  if (entry.kind === 'slash') {
    const Icon = entry.item.icon;
    return (
      <>
        <span className="pc-suggest__icon" aria-hidden="true">
          <Icon size={18} />
        </span>
        <span className="pc-suggest__text">
          <span className="pc-suggest__label">{entry.item.label}</span>
          {entry.item.description && <span className="pc-suggest__description">{entry.item.description}</span>}
        </span>
      </>
    );
  }
  const { item } = entry;
  if (entry.kind === 'hashtag') {
    return (
      <>
        <span className="pc-suggest__icon" aria-hidden="true">
          <Hash size={18} />
        </span>
        <span className="pc-suggest__text">
          <span className="pc-suggest__label">
            {entry.isNew ? t('ui.suggest.newTag', { tag: item.label }) : `#${item.label}`}
          </span>
          {item.description && <span className="pc-suggest__description">{item.description}</span>}
        </span>
      </>
    );
  }
  const avatar = item.avatarUrl ? safeMediaSrc(item.avatarUrl) : null;
  return (
    <>
      {avatar ? (
        <img className="pc-suggest__avatar" src={avatar} alt="" width={32} height={32} />
      ) : (
        <span className="pc-suggest__avatar pc-suggest__avatar--initials" aria-hidden="true">
          {initials(item.label)}
        </span>
      )}
      <span className="pc-suggest__text">
        <span className="pc-suggest__label">{item.label}</span>
        {item.description && <span className="pc-suggest__description">{item.description}</span>}
      </span>
    </>
  );
}
