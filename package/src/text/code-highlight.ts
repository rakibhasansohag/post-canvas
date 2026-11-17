'use client';
// Syntax highlighting for code blocks with lowlight. The languages load on first use, through dynamic `import()`, so
// the editor bundle doesn't carry highlight.js until a code block appears.
import { Extension } from '@tiptap/core';
import type { Node as PmNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { createLowlight } from 'lowlight';

type Lowlight = ReturnType<typeof createLowlight>;
type HastNode = { type: string; value?: string; properties?: { className?: string[] }; children?: HastNode[] };

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

const aliases: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  html: 'xml',
  sh: 'bash',
  shell: 'bash',
  py: 'python',
  rb: 'ruby',
  yml: 'yaml',
  md: 'markdown',
  'c++': 'cpp',
  'c#': 'csharp',
  cs: 'csharp',
  kt: 'kotlin',
  rs: 'rust',
};

/** The lowlight name for a stored language, following common aliases. */
export function resolveCodeLanguage(language: string | null): string | null {
  if (!language) return null;
  return aliases[language] ?? language;
}

let loading: Promise<Lowlight> | null = null;

/** Loads lowlight and the menu's languages once, in parallel. */
export function loadLowlight(): Promise<Lowlight> {
  loading ??= (async () => {
    const [{ createLowlight }, ...languages] = await Promise.all([
      import('lowlight'),
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
    const lowlight = createLowlight();
    codeLanguages.forEach(({ id }, index) => lowlight.register(id, languages[index]!.default));
    return lowlight;
  })();
  return loading;
}

function flatten(nodes: HastNode[], classes: string[] = []): { text: string; classes: string[] }[] {
  return nodes.flatMap((node) => {
    if (node.type === 'text') return [{ text: node.value ?? '', classes }];
    if (node.type === 'element' && node.children) {
      return flatten(node.children, [...classes, ...(node.properties?.className ?? [])]);
    }
    return [];
  });
}

function decorate(doc: PmNode, lowlight: Lowlight | null, name: string): DecorationSet {
  if (!lowlight) return DecorationSet.empty;
  const decorations: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name !== name) return true;
    const language = resolveCodeLanguage(node.attrs.language as string | null);
    if (!language || !lowlight.registered(language)) return false;
    let from = pos + 1;
    const tree = lowlight.highlight(language, node.textContent) as unknown as { children: HastNode[] };
    for (const piece of flatten(tree.children)) {
      const to = from + piece.text.length;
      if (piece.classes.length > 0) decorations.push(Decoration.inline(from, to, { class: piece.classes.join(' ') }));
      from = to;
    }
    return false;
  });
  return DecorationSet.create(doc, decorations);
}

const key = new PluginKey<DecorationSet>('postCanvasCodeHighlight');

/** Highlights `codeBlock` nodes with a set language. Loads lowlight once the document has a code block. */
export const CodeHighlight = Extension.create({
  name: 'postCanvasCodeHighlight',

  addProseMirrorPlugins() {
    let lowlight: Lowlight | null = null;
    const nodeName = 'codeBlock';
    const hasCode = (doc: PmNode) => {
      let found = false;
      doc.descendants((node) => {
        if (found) return false;
        if (node.type.name === nodeName) found = true;
        return !found;
      });
      return found;
    };

    return [
      new Plugin<DecorationSet>({
        key,
        state: {
          init: (_, { doc }) => decorate(doc, lowlight, nodeName),
          apply: (tr, set) =>
            tr.docChanged || tr.getMeta(key) ? decorate(tr.doc, lowlight, nodeName) : set.map(tr.mapping, tr.doc),
        },
        props: { decorations: (state) => key.getState(state) },
        view: (view) => {
          let started = false;
          const start = () => {
            if (started || !hasCode(view.state.doc)) return;
            started = true;
            void loadLowlight().then((loaded) => {
              lowlight = loaded;
              if (!view.isDestroyed) view.dispatch(view.state.tr.setMeta(key, true).setMeta('addToHistory', false));
            });
          };
          start();
          return { update: start };
        },
      }),
    ];
  },
});
