'use client';

import { Check, Eraser, FileInput, ZapOff } from 'lucide-react';
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
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useSiteTheme } from '@/components/site/use-site-theme';
import { createFakeAdapters, failNextUpload } from '@/lib/fake-adapters';
import { createSampleContent } from '@/lib/sample-content';
import { PlaygroundOutputs } from './playground-outputs';

const presetNames: PresetName[] = ['social', 'article', 'comment', 'full'];
const locales: Record<string, Locale> = { en, de, es, fr, it, pt };
const localeNames: Record<string, string> = {
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  it: 'Italiano',
  pt: 'Português',
};
const localeFor = (code: string): Locale => locales[code] ?? en;
const themes: PostCanvasTheme[] = ['auto', 'light', 'dark'];

/** The switches shown as toggles, grouped. A heading, gallery or embed switch turns the whole feature on or off. */
const featureGroups: { label: string; keys: (keyof Features)[] }[] = [
  { label: 'Interface', keys: ['toolbar', 'bubbleMenu', 'slashMenu', 'insertButton', 'blockHandle', 'statusBar'] },
  { label: 'Blocks', keys: ['heading', 'blockquote', 'bulletList', 'orderedList', 'taskList', 'codeBlock', 'table'] },
  { label: 'Media', keys: ['image', 'gallery', 'file', 'video', 'embed', 'linkCard'] },
  { label: 'Text', keys: ['mention', 'hashtag', 'link', 'highlight', 'color'] },
  { label: 'Fields', keys: ['title', 'cover'] },
];

/** A labelled single-choice control: a row of pills, keyboard-friendly as a radio group. */
function Segmented<T extends string>({
  label,
  value,
  options,
  names,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  names?: Record<string, string>;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="mb-2 font-mono text-[0.72rem] tracking-[0.14em] text-site-muted uppercase">{label}</legend>
      <div
        className="site-seg grid w-full"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
        role="radiogroup"
        aria-label={label}
      >
        {options.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={value === option}
            className="site-seg-btn justify-center px-1.5"
            onClick={() => onChange(option)}
          >
            {names?.[option] ?? option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Action({ icon, children, onClick }: { icon: ReactNode; children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="site-chip justify-start" onClick={onClick}>
      {icon}
      {children}
    </button>
  );
}

/** The docs site's live editor: pick a preset, theme, language and features, edit, and read every output format. */
export function PlaygroundEditor() {
  const handle = useRef<PostCanvasHandle>(null);
  const adapters = useMemo(() => createFakeAdapters(), []);
  const siteTheme = useSiteTheme();
  const [preset, setPreset] = useState<PresetName>('social');
  const [theme, setTheme] = useState<PostCanvasTheme>('auto');
  const [localeCode, setLocaleCode] = useState('en');
  const [overrides, setOverrides] = useState<FeatureOverrides>({});
  const [json, setJson] = useState<JSONContent | null>(null);
  const [failArmed, setFailArmed] = useState(false);
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
  const onCount = featureGroups.reduce((sum, group) => sum + group.keys.filter((key) => resolved[key]).length, 0);
  const total = featureGroups.reduce((sum, group) => sum + group.keys.length, 0);

  const features = (
    <div className="flex flex-col gap-5">
      {featureGroups.map((group) => (
        <fieldset key={group.label} className="min-w-0">
          <legend className="mb-2 font-mono text-[0.72rem] tracking-[0.14em] text-site-muted uppercase">
            {group.label}
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {group.keys.map((key) => {
              const on = Boolean(resolved[key]);
              return (
                <button
                  key={key}
                  type="button"
                  role="switch"
                  aria-checked={on}
                  onClick={() => toggle(key)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-site-border px-3 font-mono text-[0.8rem] text-site-muted transition-colors duration-200 hover:text-site-ink aria-checked:border-site-accent aria-checked:bg-site-accent-soft aria-checked:text-site-ink pointer-coarse:min-h-11"
                >
                  <span
                    aria-hidden="true"
                    className={`grid size-3.5 place-items-center rounded-[4px] border ${on ? 'border-site-accent bg-site-accent text-white dark:text-[#0e1320]' : 'border-site-border'}`}
                  >
                    {on && <Check size={10} strokeWidth={3} />}
                  </span>
                  {key}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[24rem_minmax(0,1fr)]">
      <aside
        aria-label="Editor options"
        className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto lg:pe-1"
      >
        <div className="flex flex-col gap-6 rounded-[22px] border border-site-border bg-site-surface p-4 sm:p-5">
          <Segmented
            label="Preset"
            value={preset}
            options={presetNames}
            onChange={(value) => {
              setPreset(value);
              setOverrides({});
            }}
          />
          <Segmented label="Theme" value={theme} options={themes} onChange={setTheme} />
          <fieldset className="flex min-w-0 flex-col">
            <legend className="mb-2 font-mono text-[0.72rem] tracking-[0.14em] text-site-muted uppercase">
              Language
            </legend>
            <div className="site-seg grid grid-cols-6" role="radiogroup" aria-label="Language">
              {Object.keys(locales).map((code) => (
                <button
                  key={code}
                  type="button"
                  role="radio"
                  aria-checked={localeCode === code}
                  className="site-seg-btn justify-center px-0"
                  onClick={() => setLocaleCode(code)}
                >
                  <span aria-hidden="true" className="font-mono text-[0.78rem] uppercase">
                    {code}
                  </span>
                  <span className="sr-only">{localeNames[code]}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-col gap-2">
            <p className="font-mono text-[0.72rem] tracking-[0.14em] text-site-muted uppercase">Content</p>
            <div className="grid grid-cols-2 gap-2">
              <Action
                icon={<FileInput size={16} aria-hidden="true" />}
                onClick={() => {
                  // Nodes the current features turn off are dropped, so the sample fits every preset.
                  const sample = createSampleContent(window.location.origin, { video: true });
                  handle.current?.setContent(sanitizeDocument(sample, { features: resolved }).doc);
                }}
              >
                Load sample
              </Action>
              <Action icon={<Eraser size={16} aria-hidden="true" />} onClick={() => handle.current?.clear()}>
                Clear
              </Action>
            </div>
            <button
              type="button"
              aria-pressed={failArmed}
              className="site-chip justify-start aria-pressed:border-site-danger"
              onClick={() => {
                failNextUpload();
                setFailArmed(true);
              }}
            >
              <ZapOff size={16} aria-hidden="true" />
              {failArmed ? 'The next upload will fail' : 'Fail the next upload'}
            </button>
            <p className="text-[0.85rem] leading-snug text-site-muted">
              Uploads, mentions, hashtags and link previews use fake adapters. Nothing you add leaves your browser.
            </p>
          </div>
          <details className="group lg:hidden">
            <summary className="flex min-h-11 items-center justify-between font-semibold">
              Features
              <span className="font-mono text-[0.8rem] text-site-muted">
                {onCount} of {total} on
              </span>
            </summary>
            <div className="pt-3">{features}</div>
          </details>
          <div className="hidden lg:block">
            <p className="mb-4 flex items-baseline justify-between font-semibold">
              Features
              <span className="font-mono text-[0.8rem] font-normal text-site-muted">
                {onCount} of {total} on
              </span>
            </p>
            {features}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col gap-6">
        <div className="site-stage site-fill">
          <PostCanvas
            ref={handle}
            defaultContent={mountContent}
            preset={preset}
            features={overrides}
            adapters={adapters}
            locale={localeFor(localeCode)}
            theme={theme === 'auto' ? siteTheme : theme}
            onChange={({ json: next }) => {
              setJson(next);
              setFailArmed(false);
            }}
          />
        </div>
        <PlaygroundOutputs
          json={json ?? initial}
          features={resolved}
          locale={localeFor(localeCode)}
          theme={theme === 'auto' ? siteTheme : theme}
        />
      </div>
    </div>
  );
}
