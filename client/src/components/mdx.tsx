import defaultMdxComponents from 'fumadocs-ui/mdx';
import { createGenerator } from 'fumadocs-typescript';
import { AutoTypeTable, type AutoTypeTableProps } from 'fumadocs-typescript/ui';
import type { MDXComponents } from 'mdx/types';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { Callout } from 'fumadocs-ui/components/callout';
import { Figure, Figures } from '@/components/docs/figure';
import { LiveDemo } from '@/components/docs/live-demo';

// The reference tables are generated from the TSDoc comments in the package source, at build time.
const generator = createGenerator({ tsconfigPath: '../package/tsconfig.json' });

/** `<TypeTable path="react/post-canvas.tsx" name="PostCanvasProps" />`: paths are relative to `package/src/`. */
function TypeTable({ path, ...props }: Omit<AutoTypeTableProps, 'generator'>) {
  return <AutoTypeTable generator={generator} path={path ? `../package/src/${path}` : undefined} {...props} />;
}

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    TypeTable,
    Tab,
    Tabs,
    Step,
    Steps,
    Callout,
    Figure,
    Figures,
    LiveDemo,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
