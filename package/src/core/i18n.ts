// A tiny ICU message subset, with no dependency: {name}, {n, number}, {n, plural, =0 {...} one {...} other {...}} (with
// # for the number) and {x, select, a {...} other {...}}.
import en from '../locales/en/index';
import { warnOnce } from './dev';
import type { Locale, TranslateValues, Translator } from './types';

type Part =
  | string
  | { kind: 'pound' }
  | { kind: 'arg'; name: string }
  | { kind: 'number'; name: string }
  | { kind: 'plural' | 'select'; name: string; options: Record<string, Part[]> };

const parsed = new Map<string, Part[]>();

function parse(source: string): Part[] {
  let i = 0;

  function readUntil(stop: RegExp): string {
    const start = i;
    while (i < source.length && !stop.test(source.charAt(i))) i++;
    return source.slice(start, i).trim();
  }

  function expect(ch: string): void {
    if (source.charAt(i) !== ch) throw new Error(`Expected "${ch}" at ${i}`);
    i++;
  }

  function parts(inPlural: boolean): Part[] {
    const out: Part[] = [];
    let text = '';
    const flush = () => {
      if (text) out.push(text);
      text = '';
    };
    while (i < source.length) {
      const ch = source.charAt(i);
      if (ch === '}') break;
      if (ch === '{') {
        flush();
        i++;
        out.push(arg(inPlural));
      } else if (ch === '#' && inPlural) {
        flush();
        out.push({ kind: 'pound' });
        i++;
      } else {
        text += ch;
        i++;
      }
    }
    flush();
    return out;
  }

  function arg(inPlural: boolean): Part {
    const name = readUntil(/[,}]/);
    if (source.charAt(i) === '}') {
      i++;
      return { kind: 'arg', name };
    }
    expect(',');
    const type = readUntil(/[,}]/);
    if (source.charAt(i) === '}') {
      i++;
      return type === 'number' ? { kind: 'number', name } : { kind: 'arg', name };
    }
    expect(',');
    if (type !== 'plural' && type !== 'select') throw new Error(`Unknown argument type "${type}"`);
    const options: Record<string, Part[]> = {};
    for (;;) {
      readUntil(/\S/);
      if (source.charAt(i) === '}') {
        i++;
        break;
      }
      const selector = readUntil(/[\s{]/);
      readUntil(/\S/);
      expect('{');
      options[selector] = parts(type === 'plural' || inPlural);
      expect('}');
    }
    return { kind: type, name, options };
  }

  const result = parts(false);
  if (i !== source.length) throw new Error(`Unexpected "}" at ${i}`);
  return result;
}

function compile(message: string): Part[] {
  let result = parsed.get(message);
  if (!result) {
    try {
      result = parse(message);
    } catch (error) {
      warnOnce(`parse:${message}`, `Couldn't parse message "${message}": ${String(error)}`);
      result = [message];
    }
    parsed.set(message, result);
  }
  return result;
}

/**
 * Builds a translator for a locale. A key missing from `locale` falls back to `fallback` (English by default), then to
 * the key itself; in development each missing key warns once.
 *
 * @example
 * const t = createTranslator(de);
 * t('core.frame.handle', { label: 'Photo' });
 */
export function createTranslator(locale: Locale, fallback: Locale = en): Translator {
  const plurals = new Intl.PluralRules(locale.code);
  const numbers = new Intl.NumberFormat(locale.code);

  function render(parts: Part[], values: TranslateValues, pound: number | null): string {
    let out = '';
    for (const part of parts) {
      if (typeof part === 'string') {
        out += part;
      } else if (part.kind === 'pound') {
        out += pound === null ? '#' : numbers.format(pound);
      } else if (part.kind === 'arg') {
        const value = values[part.name];
        out += value === undefined ? `{${part.name}}` : typeof value === 'number' ? numbers.format(value) : value;
      } else if (part.kind === 'number') {
        const value = Number(values[part.name]);
        out += Number.isFinite(value) ? numbers.format(value) : `{${part.name}}`;
      } else if (part.kind === 'plural') {
        const n = Number(values[part.name]);
        const option = part.options[`=${n}`] ?? part.options[plurals.select(n)] ?? part.options.other ?? [];
        out += render(option, values, n);
      } else {
        const option = part.options[String(values[part.name])] ?? part.options.other ?? [];
        out += render(option, values, pound);
      }
    }
    return out;
  }

  return (key, values = {}) => {
    let message = locale.messages[key];
    if (message === undefined) {
      message = fallback.messages[key];
      if (message === undefined) {
        warnOnce(`missing:${key}`, `Missing message "${key}".`);
        return key;
      }
      if (locale.code !== fallback.code) warnOnce(`fallback:${locale.code}:${key}`, `"${key}" isn't in ${locale.code}.`);
    }
    return render(compile(message), values, null);
  };
}
