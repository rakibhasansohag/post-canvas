'use client';

import { ShieldCheck, TriangleAlert } from 'lucide-react';
import { PostCanvas, resolveFeatures, type FeatureOverrides, type JSONContent } from 'post-canvas';
import { PostCanvasView, renderToHTML, sanitizeDocument, toMarkdown, toPlainText } from 'post-canvas/render';
import 'post-canvas/styles.css';
import { useDeferredValue, useId, useMemo, useState } from 'react';
import { FolderTabs } from '@/components/site/folder-tabs';
import { LazyStage, StageFallback } from '@/components/site/lazy-stage';
import { useSiteTheme } from '@/components/site/use-site-theme';
import { createFakeAdapters } from '@/lib/fake-adapters';
import { hostileSample, outputContent } from '@/lib/sample-content';
import { useOrigin } from './demo-utils';

const features: FeatureOverrides = { statusBar: false, insertButton: false, blockHandle: false };

function Code({ children }: { children: string }) {
  return (
    <pre className="h-full overflow-auto p-4 font-mono text-[0.8rem] leading-relaxed break-words whitespace-pre-wrap">
      <code>{children}</code>
    </pre>
  );
}

/** One document, every format: edit it on the left and read it as JSON, HTML, Markdown, text or the React view. */
export function FormatsDemo() {
  const adapters = useMemo(() => createFakeAdapters(), []);
  const origin = useOrigin();
  const theme = useSiteTheme();
  const start = useMemo(() => (origin ? outputContent(origin) : null), [origin]);
  const [json, setJson] = useState<JSONContent | null>(null);
  const doc = useDeferredValue(json ?? start);
  const resolved = useMemo(() => resolveFeatures('full', features, { adapters }), [adapters]);

  const outputs = useMemo(() => {
    if (!doc) return null;
    return {
      json: JSON.stringify(doc, null, 2),
      html: renderToHTML(doc, { features: resolved }),
      markdown: toMarkdown(doc),
      text: toPlainText(doc),
    };
  }, [doc, resolved]);

  const panel = 'h-[22rem] md:h-[26rem]';
  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
      <LazyStage minHeight={['24rem', '28.5rem']} className="site-stage" fallback={<StageFallback />}>
        {start && (
          <PostCanvas
            defaultContent={start}
            preset="full"
            features={features}
            adapters={adapters}
            theme={theme}
            onChange={({ json: next }) => setJson(next)}
          />
        )}
      </LazyStage>
      <FolderTabs
        label="Output format"
        bodyClassName={panel}
        tabs={[
          { label: 'JSON', content: <Code>{outputs?.json ?? ''}</Code> },
          { label: 'HTML', content: <Code>{outputs?.html ?? ''}</Code> },
          { label: 'Markdown', content: <Code>{outputs?.markdown ?? ''}</Code> },
          { label: 'Text', content: <Code>{outputs?.text ?? ''}</Code> },
          {
            label: 'View',
            content: (
              <div className={`${panel} overflow-auto p-4`}>
                {doc && <PostCanvasView content={doc} features={resolved} theme={theme} />}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

const hostileJson = JSON.stringify(hostileSample, null, 2);

const reasons: Record<string, string> = {
  'unknown-node': 'not in the schema',
  'unknown-mark': 'not in the schema',
  rejected: 'unsafe value',
  'invalid-attrs': 'bad attributes',
  'invalid-node': 'not a valid node',
  'invalid-content': 'does not fit here',
  transient: 'editor-only state',
};

/** A hostile document from a client, and what `sanitizeDocument` keeps, removes and renders. */
export function SanitizerDemo() {
  const [input, setInput] = useState(hostileJson);
  const deferred = useDeferredValue(input);
  const inputId = useId();
  const theme = useSiteTheme();

  const result = useMemo(() => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(deferred);
    } catch {
      return { error: 'That is not valid JSON yet.' } as const;
    }
    const clean = sanitizeDocument(parsed);
    return { clean, html: renderToHTML(clean.doc, { sanitize: false }) } as const;
  }, [deferred]);

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
      <div className="flex flex-col gap-3">
        <label htmlFor={inputId} className="flex items-center gap-2 font-semibold">
          <TriangleAlert size={18} className="text-site-danger" aria-hidden="true" />
          From the client: a javascript: link, an unsafe photo, an iframe, a script in a video id
        </label>
        <textarea
          id={inputId}
          value={input}
          spellCheck={false}
          onChange={(event) => setInput(event.target.value)}
          className="h-[24rem] w-full resize-none rounded-2xl border border-site-border bg-site-surface p-4 font-mono text-[0.8rem] leading-relaxed transition-colors duration-200 outline-none focus:border-site-accent md:h-[28rem]"
        />
        <button
          type="button"
          className="self-start text-[0.9rem] font-medium text-site-accent underline-offset-4 hover:underline"
          onClick={() => setInput(hostileJson)}
        >
          Reset the sample
        </button>
      </div>
      <div className="flex flex-col gap-3">
        <p className="flex items-center gap-2 font-semibold">
          <ShieldCheck size={18} className="text-site-ok" aria-hidden="true" />
          After <code className="font-mono text-[0.92em]">sanitizeDocument()</code>
        </p>
        <div className="flex h-[24rem] flex-col overflow-hidden rounded-2xl border border-site-border md:h-[28rem]">
          {'error' in result ? (
            <p className="p-4 text-site-muted">{result.error}</p>
          ) : (
            <>
              <div className="border-b border-site-border p-4">
                <p className="mb-2 font-mono text-[0.75rem] tracking-[0.12em] text-site-muted uppercase">
                  Removed ({result.clean.removed.length + result.clean.omitted})
                </p>
                <ul className="flex max-h-36 flex-col gap-1.5 overflow-auto text-[0.86rem]" aria-live="polite">
                  {result.clean.removed.map((item) => (
                    <li key={`${item.path}-${item.reason}`} className="flex flex-wrap gap-x-2">
                      <code className="font-mono text-[0.82rem] text-site-ink">{item.type ?? 'value'}</code>
                      <span className="text-site-muted">
                        {reasons[item.reason] ?? item.reason} at <code className="font-mono">{item.path}</code>
                      </span>
                    </li>
                  ))}
                  {result.clean.removed.length === 0 && <li className="text-site-muted">Nothing. It was clean.</li>}
                </ul>
              </div>
              <div className="min-h-0 flex-1 overflow-auto p-4">
                <p className="mb-2 font-mono text-[0.75rem] tracking-[0.12em] text-site-muted uppercase">Renders as</p>
                <PostCanvasView content={result.clean.doc} sanitize={false} theme={theme} />
                <p className="mt-4 mb-2 font-mono text-[0.75rem] tracking-[0.12em] text-site-muted uppercase">HTML</p>
                <pre className="font-mono text-[0.78rem] leading-relaxed break-words whitespace-pre-wrap text-site-muted">
                  <code>{result.html}</code>
                </pre>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
