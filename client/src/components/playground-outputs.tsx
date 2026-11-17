'use client';

import type { Features, JSONContent, Locale } from 'post-canvas';
import { PostCanvasView, renderToHTML, toMarkdown, toPlainText } from 'post-canvas/render';
import { useMemo, useState } from 'react';

const tabs = ['JSON', 'HTML', 'View', 'Markdown', 'Text'] as const;
type Tab = (typeof tabs)[number];

/** The same document in every output format the package offers. */
export function PlaygroundOutputs({
  json,
  features,
  locale,
}: {
  json: JSONContent;
  features: Features;
  locale: Locale;
}) {
  const [tab, setTab] = useState<Tab>('JSON');

  const text = useMemo(() => {
    switch (tab) {
      case 'JSON':
        return JSON.stringify(json, null, 2);
      case 'HTML':
        return renderToHTML(json, { features, locale });
      case 'Markdown':
        return toMarkdown(json);
      case 'Text':
        return toPlainText(json);
      default:
        return '';
    }
  }, [tab, json, features, locale]);

  return (
    <section aria-label="Output" className="overflow-hidden rounded-xl border">
      <div role="tablist" aria-label="Output format" className="flex overflow-x-auto border-b bg-fd-card">
        {tabs.map((name) => (
          <button
            key={name}
            role="tab"
            type="button"
            id={`output-tab-${name}`}
            aria-selected={tab === name}
            aria-controls="output-panel"
            className="px-4 py-2 text-sm aria-selected:border-b-2 aria-selected:border-fd-primary aria-selected:font-medium"
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <div
        id="output-panel"
        role="tabpanel"
        aria-labelledby={`output-tab-${tab}`}
        className="max-h-[32rem] overflow-auto p-4"
      >
        {tab === 'View' ? (
          <PostCanvasView content={json} features={features} locale={locale} />
        ) : (
          <pre className="text-sm break-words whitespace-pre-wrap">
            <code>{text}</code>
          </pre>
        )}
      </div>
    </section>
  );
}
