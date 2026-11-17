import type { Locale } from '../../core/types';
import core from './core.json';
import embeds from './embeds.json';
import media from './media.json';
import text from './text.json';
import ui from './ui.json';

/** The en locale: every namespace's messages merged. */
const locale: Locale = {
  code: 'en',
  messages: { ...core, ...media, ...text, ...ui, ...embeds },
};

export default locale;
