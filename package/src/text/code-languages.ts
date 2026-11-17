// The code block languages: the menu list and their highlight.js grammars, loaded on first use through dynamic
// `import()`. The CDN build swaps this module for `code-languages-slim.ts` (see `tsdown.config.ts`), because an IIFE
// inlines every dynamic import.
import type { LanguageFn } from 'highlight.js';

/** The languages offered in the code block menu, by lowlight name, in menu order. */
export const codeLanguages: readonly { id: string; label: string }[] = [
  { id: 'bash', label: 'Bash' },
  { id: 'c', label: 'C' },
  { id: 'cpp', label: 'C++' },
  { id: 'csharp', label: 'C#' },
  { id: 'css', label: 'CSS' },
  { id: 'go', label: 'Go' },
  { id: 'xml', label: 'HTML' },
  { id: 'java', label: 'Java' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'json', label: 'JSON' },
  { id: 'kotlin', label: 'Kotlin' },
  { id: 'markdown', label: 'Markdown' },
  { id: 'php', label: 'PHP' },
  { id: 'python', label: 'Python' },
  { id: 'ruby', label: 'Ruby' },
  { id: 'rust', label: 'Rust' },
  { id: 'sql', label: 'SQL' },
  { id: 'swift', label: 'Swift' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'yaml', label: 'YAML' },
];

/** Loads the grammars of `codeLanguages`, in the same order. */
export async function loadLanguageGrammars(): Promise<LanguageFn[]> {
  const modules = await Promise.all([
    import('highlight.js/lib/languages/bash'),
    import('highlight.js/lib/languages/c'),
    import('highlight.js/lib/languages/cpp'),
    import('highlight.js/lib/languages/csharp'),
    import('highlight.js/lib/languages/css'),
    import('highlight.js/lib/languages/go'),
    import('highlight.js/lib/languages/xml'),
    import('highlight.js/lib/languages/java'),
    import('highlight.js/lib/languages/javascript'),
    import('highlight.js/lib/languages/json'),
    import('highlight.js/lib/languages/kotlin'),
    import('highlight.js/lib/languages/markdown'),
    import('highlight.js/lib/languages/php'),
    import('highlight.js/lib/languages/python'),
    import('highlight.js/lib/languages/ruby'),
    import('highlight.js/lib/languages/rust'),
    import('highlight.js/lib/languages/sql'),
    import('highlight.js/lib/languages/swift'),
    import('highlight.js/lib/languages/typescript'),
    import('highlight.js/lib/languages/yaml'),
  ]);
  return modules.map((module) => module.default);
}
