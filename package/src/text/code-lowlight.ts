// Builds the lowlight instance for code blocks. Loaded lazily by `code-highlight.ts`. The static, named import of
// `createLowlight` lets bundlers drop lowlight's `all` and `common` grammar sets (about 1.2 MB), which a dynamic
// `import('lowlight')` would keep.
import { createLowlight } from 'lowlight';
import { codeLanguages, loadLanguageGrammars } from './code-languages';

/** A lowlight instance with every language in `codeLanguages` registered. */
export async function createCodeLowlight(): Promise<ReturnType<typeof createLowlight>> {
  const grammars = await loadLanguageGrammars();
  const lowlight = createLowlight();
  codeLanguages.forEach(({ id }, index) => lowlight.register(id, grammars[index]!));
  return lowlight;
}
