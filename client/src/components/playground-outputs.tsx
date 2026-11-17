'use client';

import type { Features, JSONContent, Locale, PostCanvasTheme } from 'post-canvas';
import { PostCanvasView, renderToHTML, toMarkdown, toPlainText } from 'post-canvas/render';
import { useDeferredValue, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';

const tabs = ['JSON', 'HTML', 'View', 'Markdown', 'Text'] as const;
type Tab = (typeof tabs)[number];

/** The same document in every output format the package offers. Only the open tab is computed. */
export function PlaygroundOutputs({
  json,
  features,
  locale,
  theme,
}: {
  json: JSONContent;
  features: Features;
  locale: Locale;
  theme: PostCanvasTheme;
}) {
  const [tab, setTab] = useState<Tab>('JSON');
  const doc = useDeferredValue(json);
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const text = useMemo(() => {
    switch (tab) {
      case 'JSON':
        return JSON.stringify(doc, null, 2);
      case 'HTML':
        return renderToHTML(doc, { features, locale });
      case 'Markdown':
        return toMarkdown(doc);
      case 'Text':
        return toPlainText(doc);
      default:
        return '';
    }
  }, [tab, doc, features, locale]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + tabs.length) % tabs.length;
    setTab(tabs[next]!);
    refs.current[next]?.focus();
  };

  return (
    <section aria-label="Output">
      <div role="tablist" aria-label="Output format" className="site-tabs-head relative z-[1] -mb-px">
        {tabs.map((name, index) => (
          <button
            key={name}
            ref={(node) => {
              refs.current[index] = node;
            }}
            role="tab"
            type="button"
            id={`${id}-${name}`}
            aria-selected={tab === name}
            aria-controls={`${id}-panel`}
            tabIndex={tab === name ? 0 : -1}
            className="site-tab"
            onClick={() => setTab(name)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {name}
          </button>
        ))}
      </div>
      <div
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-${tab}`}
        tabIndex={0}
        className="site-tabs-body max-h-[32rem] min-h-[14rem] overflow-auto p-4"
      >
        {tab === 'View' ? (
          <PostCanvasView content={doc} features={features} locale={locale} theme={theme} />
        ) : (
          <pre className="font-mono text-[0.82rem] leading-relaxed break-words whitespace-pre-wrap">
            <code>{text}</code>
          </pre>
        )}
      </div>
    </section>
  );
}
