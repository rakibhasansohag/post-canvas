// The schema extensions the renderers use: `postCanvasSchema(features)` with the embed nodes configured for a render
// mode and a language. Built once per combination.
import type { AnyExtension } from '@tiptap/core';
import { defaultFeatures } from '../core/features';
import { createTranslator } from '../core/i18n';
import { postCanvasSchema } from '../core/schema';
import type { Features, Locale, Translator } from '../core/types';
import type { EmbedRenderMode } from '../embeds/render-spec';
import en from '../locales/en/index';

const embedNodes = new Set(['video', 'embed', 'linkCard']);
const cache = new Map<string, { extensions: AnyExtension[]; t: Translator }>();

/** The render extensions and translator for a feature set, embed mode and locale. */
export function renderExtensions(
  features: Features = defaultFeatures,
  mode: EmbedRenderMode = 'facade',
  locale: Locale = en,
): { extensions: AnyExtension[]; t: Translator } {
  const key = `${mode}|${locale.code}|${JSON.stringify(features)}`;
  const hit = cache.get(key);
  // A different Locale object with the same code still gets its own messages.
  if (hit && hit.t === translators.get(locale)) return hit;
  const t = translatorFor(locale);
  const extensions = postCanvasSchema(features).map((extension) =>
    embedNodes.has(extension.name) ? extension.configure({ render: mode, t }) : extension,
  );
  const entry = { extensions, t };
  if (cache.size > 50) cache.clear();
  cache.set(key, entry);
  return entry;
}

const translators = new WeakMap<Locale, Translator>();

/** One translator per Locale object. */
export function translatorFor(locale: Locale = en): Translator {
  let t = translators.get(locale);
  if (!t) {
    t = createTranslator(locale);
    translators.set(locale, t);
  }
  return t;
}

const merged = new WeakMap<AnyExtension[], WeakMap<AnyExtension[], AnyExtension[]>>();

/** `mergeExtensions(base, extra)`, built once per pair of arrays so the sanitizer's schema cache hits. */
export function mergedFor(base: AnyExtension[], extra: AnyExtension[]): AnyExtension[] {
  let byBase = merged.get(extra);
  if (!byBase) {
    byBase = new WeakMap();
    merged.set(extra, byBase);
  }
  let result = byBase.get(base);
  if (!result) {
    result = mergeExtensions(base, extra);
    byBase.set(base, result);
  }
  return result;
}

/** `base` with every extension in `extra` replacing the one with the same name, or added at the end. */
export function mergeExtensions(base: AnyExtension[], extra: AnyExtension[]): AnyExtension[] {
  const names = new Set(extra.map((extension) => extension.name));
  return [...base.filter((extension) => !names.has(extension.name)), ...extra];
}
