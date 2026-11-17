import { Extension } from '@tiptap/core';
import en from '../locales/en/index';
import { defaultFeatures } from './features';
import { createTranslator } from './i18n';
import type { Adapters, Features, NotifyKind, PostCanvasCoreStorage, Translator } from './types';
import './extension-fields';

/** Options of the `postCanvasCore` extension. */
export interface PostCanvasCoreOptions {
  /** Defaults to English. */
  t: Translator;
  adapters: Adapters;
  /** The resolved features. Defaults to `defaultFeatures`. */
  features: Features;
  /** Called for every notice. Defaults to the console. The UI replaces it with a live region and toasts. */
  notify: (message: string, kind?: NotifyKind) => void;
}

function consoleNotify(message: string, kind: NotifyKind = 'info'): void {
  if (kind === 'error') console.error(`[post-canvas] ${message}`);
  else console.info(`[post-canvas] ${message}`);
}

/**
 * The extension every Post Canvas editor starts with. It holds the translator, the adapters, the resolved features and
 * `notify()` in `editor.storage.postCanvasCore`, where any extension can read them. `PostCanvas` keeps them current
 * when its props change.
 */
export const PostCanvasCore = Extension.create<PostCanvasCoreOptions, PostCanvasCoreStorage>({
  name: 'postCanvasCore',

  addOptions() {
    return {
      t: createTranslator(en),
      adapters: {},
      features: defaultFeatures,
      notify: consoleNotify,
    };
  },

  addStorage() {
    return {
      t: this.options.t,
      adapters: this.options.adapters,
      features: this.options.features,
      notify: this.options.notify,
    };
  },
});
