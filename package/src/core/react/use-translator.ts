'use client';
import en from '../../locales/en/index';
import { createTranslator } from '../i18n';
import type { Translator } from '../types';
import { useOptionalPostCanvasContext } from './context';

const english = createTranslator(en);

/** The translator from the nearest `PostCanvasProvider`, or English outside one. */
export function useTranslator(): Translator {
  return useOptionalPostCanvasContext()?.t ?? english;
}
