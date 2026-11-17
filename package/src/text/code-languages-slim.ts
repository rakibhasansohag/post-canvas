// The CDN build's code block languages: a small common set, so the single-file bundle stays light. `tsdown.config.ts`
// swaps it in for `code-languages.ts`; it must export the same names.
import type { LanguageFn } from 'highlight.js';

/** The languages offered in the code block menu in the CDN build, by lowlight name, in menu order. */
export const codeLanguages: readonly { id: string; label: string }[] = [
  { id: 'bash', label: 'Bash' },
  { id: 'css', label: 'CSS' },
  { id: 'xml', label: 'HTML' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'json', label: 'JSON' },
  { id: 'python', label: 'Python' },
  { id: 'sql', label: 'SQL' },
  { id: 'typescript', label: 'TypeScript' },
];

/** Loads the grammars of `codeLanguages`, in the same order. */
export async function loadLanguageGrammars(): Promise<LanguageFn[]> {
  const modules = await Promise.all([
    import('highlight.js/lib/languages/bash'),
    import('highlight.js/lib/languages/css'),
    import('highlight.js/lib/languages/xml'),
    import('highlight.js/lib/languages/javascript'),
    import('highlight.js/lib/languages/json'),
    import('highlight.js/lib/languages/python'),
    import('highlight.js/lib/languages/sql'),
    import('highlight.js/lib/languages/typescript'),
  ]);
  return modules.map((module) => module.default);
}
