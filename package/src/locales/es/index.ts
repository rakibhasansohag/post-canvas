import type { Locale } from '../../core/types';
import core from './core.json';
import embeds from './embeds.json';
import media from './media.json';
import text from './text.json';
import ui from './ui.json';

/** The es locale: every namespace's messages merged. */
const locale: Locale = {
  code: 'es',
  messages: { ...core, ...media, ...text, ...ui, ...embeds },
};

export default locale;
