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
