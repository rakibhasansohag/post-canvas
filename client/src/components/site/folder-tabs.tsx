'use client';

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface FolderTab {
  label: string;
  content: ReactNode;
}

/**
 * Tabs whose labels sit on the top edge of the panel, like folder tabs. Every panel is in the HTML (inactive ones are
 * `hidden`), so the code in them is readable without JavaScript and by search engines.
 */
export function FolderTabs({
  tabs,
  label,
  className,
  bodyClassName,
  actions,
}: {
  tabs: FolderTab[];
  label: string;
  className?: string;
  bodyClassName?: string;
  actions?: ReactNode;
}) {
  const [active, setActive] = useState(0);
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    const edge = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
    if (!step && edge === null) return;
    event.preventDefault();
    const next = edge ?? (active + step + tabs.length) % tabs.length;
    setActive(next);
    refs.current[next]?.focus();
  };

  return (
    <div className={className}>
      <div className="flex items-end justify-between gap-2">
        <div role="tablist" aria-label={label} className="site-tabs-head relative z-[1] -mb-px">
          {tabs.map((tab, index) => (
            <button
              key={tab.label}
              ref={(node) => {
                refs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`${id}-tab-${index}`}
              aria-selected={active === index}
              aria-controls={`${id}-panel-${index}`}
              tabIndex={active === index ? 0 : -1}
              className="site-tab"
              onClick={() => setActive(index)}
              onKeyDown={onKeyDown}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {actions}
      </div>
      <div className={cn('site-tabs-body', bodyClassName)}>
        {tabs.map((tab, index) => (
          <div
            key={tab.label}
            role="tabpanel"
            id={`${id}-panel-${index}`}
            aria-labelledby={`${id}-tab-${index}`}
            hidden={active !== index}
            tabIndex={0}
          >
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
}
