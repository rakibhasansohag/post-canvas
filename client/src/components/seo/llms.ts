import { appDescription, appName, basePath, npmUrl, repoUrl, siteUrl } from '@/lib/shared';
import { seoPages } from './pages';

const page = (path: string) => `${siteUrl}${basePath}${path}`;

/** The top of llms.txt and llms-full.txt: what Post Canvas is, and the site pages outside the docs. */
export function llmsIntro(): string {
  const comparisons = seoPages.map((entry) => `- [${entry.title}](${page(`/${entry.slug}/`)}): ${entry.description}`);
  return `# ${appName}

> ${appDescription}

Post Canvas is MIT licensed and published on npm as \`post-canvas\` (${npmUrl}). The source is on GitHub (${repoUrl}). It needs React 18.2 or 19 and runs with no API key or licence key. Real-time collaboration, comments and track changes, Vue and Angular wrappers, and right-to-left layouts are not supported yet.

## Site

- [Home](${page('/')}): the live editor, the feature tour, a comparison with TinyMCE, Froala, Tiptap and Lexical, and the FAQ.
- [Playground](${page('/playground/')}): an online rich text editor with every preset, theme, language and feature switch, and the JSON, HTML, Markdown and text output.
- [Examples](${page('/examples/')}): a social composer, an article editor and a comment thread, each live, with the source file that runs it.

## Comparisons and guides

${comparisons.join('\n')}

`;
}

/** Replaces the Fumadocs heading (`# Post Canvas`) with the intro above, keeping the docs list under its own heading. */
export function withIntro(body: string, docsHeading = '## Docs'): string {
  return `${llmsIntro()}${docsHeading}\n\n${body.replace(/^# [^\n]*\n+/, '')}`;
}
