'use client';

import {
  AtSign,
  ClipboardPaste,
  ListChecks,
  MousePointerClick,
  SquareSlash,
  Table2,
  type LucideIcon,
} from 'lucide-react';
import { PostCanvas, type PostCanvasHandle } from 'post-canvas';
import 'post-canvas/styles.css';
import { useMemo, useRef, useState } from 'react';
import { LazyStage, StageFallback } from '@/components/site/lazy-stage';
import { useSiteTheme } from '@/components/site/use-site-theme';
import { createFakeAdapters } from '@/lib/fake-adapters';
import { richTextContent } from '@/lib/sample-content';
import { caretAtEmptyEnd, selectText, simulatePaste, type Editor } from './demo-utils';

// Word's clipboard HTML, trimmed: Office namespaces, class names, inline styles and empty spans.
const wordHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta name=Generator content="Microsoft Word 15"><style>p.MsoNormal{margin:0cm;font-family:"Calibri",sans-serif}</style></head><body lang=EN-GB><!--StartFragment--><p class=MsoNormal style='margin-bottom:8.0pt;line-height:107%'><b><span style='font-size:14.0pt;line-height:107%;font-family:"Georgia",serif;color:#C00000'>Pasted from Word</span></b><span style='mso-spacerun:yes'> </span><o:p></o:p></p><p class=MsoListParagraphCxSpFirst style='text-indent:-18.0pt;mso-list:l0 level1 lfo1'><![if !supportLists]><span style='font-family:Symbol'>·<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;</span></span><![endif]>Fonts, colours and Office markup are gone<o:p></o:p></p><p class=MsoListParagraphCxSpLast style='text-indent:-18.0pt;mso-list:l0 level1 lfo1'><![if !supportLists]><span style='font-family:Symbol'>·<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;</span></span><![endif]>The list is a <i>real</i> list again<o:p></o:p></p><!--EndFragment--></body></html>`;

const paragraph = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const row = (type: 'tableHeader' | 'tableCell', cells: string[]) => ({
  type: 'tableRow',
  content: cells.map((text) => ({
    type,
    attrs: { colspan: 1, rowspan: 1, colwidth: null },
    content: [paragraph(text)],
  })),
});
const table = {
  type: 'table',
  content: [
    row('tableHeader', ['Stop', 'Miles', 'Café']),
    row('tableCell', ['Harbour', '0', 'Yes']),
    row('tableCell', ['Lighthouse', '12', 'No']),
  ],
};

interface Tool {
  title: string;
  body: string;
  icon: LucideIcon;
  run: (editor: Editor) => void;
}

const tools: Tool[] = [
  {
    title: 'Selection menu',
    body: 'Select text for bold, italic, links, highlight and colour, right where you are.',
    icon: MousePointerClick,
    run: (editor) => void selectText(editor, 'two good cafés'),
  },
  {
    title: 'Slash menu',
    body: 'Type / for headings, lists, tables, code, photos, video and embeds. Filter as you type.',
    icon: SquareSlash,
    run: (editor) => {
      caretAtEmptyEnd(editor);
      editor.commands.insertContent('/');
    },
  },
  {
    title: 'Mentions and hashtags',
    body: 'Type @ or # and pick from your own people and tags, loaded from your API.',
    icon: AtSign,
    run: (editor) => {
      caretAtEmptyEnd(editor);
      editor.commands.insertContent('@');
    },
  },
  {
    title: 'Task lists',
    body: 'Checklists that save their ticks. Press Tab to nest, and Enter on an empty item to leave.',
    icon: ListChecks,
    run: (editor) => {
      caretAtEmptyEnd(editor);
      editor.commands.insertContent({
        type: 'taskList',
        content: [{ type: 'taskItem', attrs: { checked: false }, content: [paragraph('Charge the camera batteries')] }],
      });
    },
  },
  {
    title: 'Tables',
    body: 'Insert, resize and merge cells, with a header row. Tab moves to the next cell.',
    icon: Table2,
    run: (editor) => {
      caretAtEmptyEnd(editor);
      editor.commands.insertContent(table);
    },
  },
  {
    title: 'Clean paste',
    body: 'Paste from Word or Google Docs and keep the structure, without their fonts, colours and markup.',
    icon: ClipboardPaste,
    run: (editor) => {
      caretAtEmptyEnd(editor);
      simulatePaste(editor, { html: wordHtml, text: 'Pasted from Word' });
    },
  },
];

/** The writing tools, each with a "Try it" that runs it in the live editor beside the list. */
export function RichTextDemo() {
  const handle = useRef<PostCanvasHandle>(null);
  const adapters = useMemo(() => createFakeAdapters(), []);
  const theme = useSiteTheme();
  const [content] = useState(richTextContent);
  const [last, setLast] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-8">
      <ul className="grid content-start gap-2.5 sm:grid-cols-2 lg:grid-cols-1" aria-label="Writing tools">
        {tools.map((tool) => (
          <li key={tool.title}>
            <button
              type="button"
              className="site-card group flex w-full items-start gap-4 p-4 text-left aria-pressed:border-site-accent"
              aria-pressed={last === tool.title}
              onClick={() => {
                const editor = handle.current?.editor;
                if (!editor) return;
                tool.run(editor);
                setLast(tool.title);
              }}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-site-accent-soft text-site-accent transition-transform duration-500 ease-(--ease-out) group-hover:-rotate-6">
                <tool.icon size={19} strokeWidth={2} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold">{tool.title}</span>
                  <span className="font-mono text-[0.75rem] tracking-[0.08em] text-site-accent uppercase">Try it</span>
                </span>
                <span className="mt-1 block text-[0.94rem] leading-snug text-site-muted">{tool.body}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <LazyStage
        minHeight={['27rem', '26rem']}
        className="site-stage self-start lg:sticky lg:top-20"
        fallback={<StageFallback />}
      >
        <PostCanvas ref={handle} defaultContent={content} preset="full" adapters={adapters} theme={theme} />
      </LazyStage>
    </div>
  );
}
