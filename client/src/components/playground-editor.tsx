'use client';

import {
  defaultFeatures,
  PostCanvas,
  resolveFeatures,
  type FeatureOverrides,
  type Features,
  type JSONContent,
  type Locale,
  type PostCanvasHandle,
  type PostCanvasTheme,
  type PresetName,
  en,
} from 'post-canvas';
import de from 'post-canvas/locales/de';
import es from 'post-canvas/locales/es';
import fr from 'post-canvas/locales/fr';
import it from 'post-canvas/locales/it';
import pt from 'post-canvas/locales/pt';
import { sanitizeDocument } from 'post-canvas/render';
import 'post-canvas/styles.css';
import { useMemo, useRef, useState } from 'react';
import { createFakeAdapters, failNextUpload } from '@/lib/fake-adapters';
import { createSampleContent } from '@/lib/sample-content';
import { PlaygroundOutputs } from './playground-outputs';

const presetNames: PresetName[] = ['social', 'article', 'comment', 'full'];
const locales: Record<string, Locale> = { en, de, es, fr, it, pt };
const localeFor = (code: string): Locale => locales[code] ?? en;
const themes: PostCanvasTheme[] = ['auto', 'light', 'dark'];

/** The switches shown as checkboxes, grouped. A heading, gallery or embed switch turns the whole feature on or off. */
const featureGroups: { label: string; keys: (keyof Features)[] }[] = [
  { label: 'Interface', keys: ['toolbar', 'bubbleMenu', 'slashMenu', 'insertButton', 'blockHandle', 'statusBar'] },
  { label: 'Blocks', keys: ['heading', 'blockquote', 'bulletList', 'orderedList', 'taskList', 'codeBlock', 'table'] },
  { label: 'Media', keys: ['image', 'gallery', 'file', 'video', 'embed', 'linkCard'] },
  { label: 'Text', keys: ['mention', 'hashtag', 'link', 'highlight', 'color'] },
  { label: 'Fields', keys: ['title', 'cover'] },
];

function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-fd-muted-foreground">{label}</span>
      <select
        className="rounded-md border bg-fd-background px-2 py-1.5"
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

/** The docs site's live editor: pick a preset, theme, language and features, edit, and read every output format. */
export function PlaygroundEditor() {
  const handle = useRef<PostCanvasHandle>(null);
  const adapters = useMemo(() => createFakeAdapters(), []);
  const [preset, setPreset] = useState<PresetName>('social');
  const [theme, setTheme] = useState<PostCanvasTheme>('auto');
  const [localeCode, setLocaleCode] = useState('en');
  const [overrides, setOverrides] = useState<FeatureOverrides>({});
  const [json, setJson] = useState<JSONContent | null>(null);
  const [initial] = useState<JSONContent>(() => ({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Start typing, or press Load sample.' }] }],
  }));

  const resolved = resolveFeatures(preset, overrides, { adapters });

  // The editor rebuilds itself in place when the features change and keeps the document, cleaned for the new features.
  // `mountContent` is only the first document; later changes come from the editor itself.
  const featuresKey = JSON.stringify(resolved);
  const mountContent = useMemo(
    () => (json ? sanitizeDocument(json, { features: resolved }).doc : initial),
    // The feature set is the only input that matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [featuresKey],
  );

  const toggle = (key: keyof Features) => {
    const on = Boolean(resolved[key]);
    setOverrides((current) => ({ ...current, [key]: on ? false : defaultFeatures[key] }) as FeatureOverrides);
  };

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Editor options" className="grid gap-4 rounded-xl border bg-fd-card p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Select
            label="Preset"
            value={preset}
            options={presetNames}
            onChange={(value) => {
              setPreset(value);
              setOverrides({});
            }}
          />
          <Select label="Theme" value={theme} options={themes} onChange={setTheme} />
          <Select label="Language" value={localeCode} options={Object.keys(locales)} onChange={setLocaleCode} />
          <div className="flex items-end gap-2">
            <button
              type="button"
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-fd-accent"
              onClick={() => {
                // Nodes the current features turn off are dropped, so the sample fits every preset.
                const sample = createSampleContent(window.location.origin, { video: true });
                handle.current?.setContent(sanitizeDocument(sample, { features: resolved }).doc);
              }}
            >
              Load sample
            </button>
            <button
              type="button"
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-fd-accent"
              onClick={() => handle.current?.clear()}
            >
              Clear
            </button>
          </div>
        </div>
        <details>
          <summary className="cursor-pointer text-sm font-medium">Features</summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featureGroups.map((group) => (
              <fieldset key={group.label} className="min-w-0">
                <legend className="mb-1 text-sm text-fd-muted-foreground">{group.label}</legend>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {group.keys.map((key) => (
                    <label key={key} className="flex items-center gap-1.5 text-sm">
                      <input type="checkbox" checked={Boolean(resolved[key])} onChange={() => toggle(key)} />
                      {key}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        </details>
        <p className="text-sm text-fd-muted-foreground">
          Uploads, mentions, hashtags and link previews use fake adapters, so nothing leaves your browser.{' '}
          <button type="button" className="underline" onClick={failNextUpload}>
            Fail the next upload
          </button>{' '}
          to see the retry path.
        </p>
      </section>

      <div className="rounded-xl border">
        <PostCanvas
          ref={handle}
          defaultContent={mountContent}
          preset={preset}
          features={overrides}
          adapters={adapters}
          locale={localeFor(localeCode)}
          theme={theme}
          onChange={({ json: next }) => setJson(next)}
        />
      </div>

      <PlaygroundOutputs json={json ?? initial} features={resolved} locale={localeFor(localeCode)} />
    </div>
  );
}
