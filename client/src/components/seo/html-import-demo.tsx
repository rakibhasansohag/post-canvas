'use client';

import { ArrowRight, FileCode2, RotateCcw } from 'lucide-react';
import { PostCanvas, type PresetName } from 'post-canvas';
import { fromHTML } from 'post-canvas/render';
import 'post-canvas/styles.css';
import { useId, useMemo, useState } from 'react';
import { useOrigin } from '@/components/demos/demo-utils';
import { LazyStage, StageFallback } from '@/components/site/lazy-stage';
import { LiveNote } from '@/components/site/live-note';
import { useSiteTheme } from '@/components/site/use-site-theme';
import { createFakeAdapters } from '@/lib/fake-adapters';
import { basePath } from '@/lib/shared';

/** `{photos}` in a sample stands for the site's sample photo folder, because imported images need absolute URLs. */
const photoToken = /\{photos\}/g;

interface Converted {
  doc: ReturnType<typeof fromHTML>;
  left: string[];
  run: number;
}

function convert(html: string, run: number): Converted | { error: string; run: number } {
  const left: string[] = [];
  try {
    const doc = fromHTML(html, {
      onRemoved: (removed, omitted) => {
        for (const item of removed) left.push(item.type ?? item.reason);
        if (omitted > 0) left.push(`${omitted} more`);
      },
    });
    return { doc, left, run };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error), run };
  }
}

/**
 * Old editor HTML on the left, `fromHTML()` on it, and the result in a live editor on the right. The visitor can edit
 * the HTML or paste their own and convert again. Everything runs in the browser.
 */
export function HtmlImportDemo({
  html,
  source,
  preset = 'full',
}: {
  /** The starting HTML, as the old editor saved it. */
  html: string;
  /** The old editor's name, for the labels: "TinyMCE". */
  source: string;
  preset?: PresetName;
}) {
  const origin = useOrigin();
  const theme = useSiteTheme();
  const adapters = useMemo(() => createFakeAdapters(), []);
  const inputId = useId();
  const sample = useMemo(
    () => (origin ? html.replace(photoToken, `${origin}${basePath}/samples`) : null),
    [origin, html],
  );
  const [draft, setDraft] = useState<string | null>(null);
  const [run, setRun] = useState(0);
  const value = draft ?? sample ?? '';
  // The editor is rebuilt from the converted document each time Convert is pressed, so it is keyed by the run.
  const [converted, setConverted] = useState<ReturnType<typeof convert> | null>(null);
  const initial = useMemo(() => (sample ? convert(sample, 0) : null), [sample]);
  const result = converted ?? initial;

  const onConvert = () => {
    const next = run + 1;
    setRun(next);
    setConverted(convert(value, next));
  };

  const onReset = () => {
    setDraft(null);
    const next = run + 1;
    setRun(next);
    setConverted(sample ? convert(sample, next) : null);
  };

  return (
    <div>
      <LiveNote className="mb-4">Edit the {source} HTML or paste your own, then convert it.</LiveNote>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="flex min-w-0 flex-col gap-3">
          <label htmlFor={inputId} className="flex items-center gap-2 font-semibold">
            <FileCode2 size={18} className="text-site-accent" aria-hidden="true" />
            HTML as {source} saved it
          </label>
          <textarea
            id={inputId}
            value={value}
            spellCheck={false}
            onChange={(event) => setDraft(event.target.value)}
            className="h-[20rem] w-full resize-none rounded-2xl border border-site-border bg-site-surface p-4 font-mono text-[0.8rem] leading-relaxed transition-colors duration-200 outline-none focus:border-site-accent md:h-[26rem]"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="site-btn site-btn-primary" onClick={onConvert}>
              <span>Convert with fromHTML()</span>
              <span className="site-btn-tile">
                <ArrowRight size={18} strokeWidth={2.2} aria-hidden="true" />
              </span>
            </button>
            <button
              type="button"
              className="inline-flex min-h-11 items-center gap-2 text-[0.92rem] font-medium text-site-accent underline-offset-4 hover:underline"
              onClick={onReset}
            >
              <RotateCcw size={16} aria-hidden="true" />
              Reset the sample
            </button>
          </div>
          <div className="rounded-2xl border border-site-border p-4" aria-live="polite">
            <p className="mb-2 font-mono text-[0.75rem] tracking-[0.12em] text-site-muted uppercase">
              Left out by fromHTML()
            </p>
            {!result ? (
              <p className="text-[0.9rem] text-site-muted">Converting the sample.</p>
            ) : 'error' in result ? (
              <p className="text-[0.9rem] text-site-danger">{result.error}</p>
            ) : result.left.length === 0 ? (
              <p className="text-[0.9rem] text-site-muted">
                No elements. Fonts, sizes and colours outside the palette are dropped without a record.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {result.left.map((item, index) => (
                  <li
                    key={`${item}-${index}`}
                    className="rounded-full border border-site-border px-2.5 py-0.5 font-mono text-[0.8rem]"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <p className="flex items-center gap-2 font-semibold">
            <span className="site-live-dot" aria-hidden="true" />
            The same post in Post Canvas
          </p>
          <LazyStage minHeight={['26rem', '30rem']} className="site-stage overflow-hidden" fallback={<StageFallback />}>
            {result && 'doc' in result && (
              <PostCanvas
                key={result.run}
                defaultContent={result.doc}
                preset={preset}
                adapters={adapters}
                theme={theme}
              />
            )}
          </LazyStage>
        </div>
      </div>
    </div>
  );
}
