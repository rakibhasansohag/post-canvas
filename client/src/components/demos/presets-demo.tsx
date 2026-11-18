'use client';

import { CornerDownLeft, Plus, RotateCcw } from 'lucide-react';
import { PostCanvas, type JSONContent, type PostCanvasHandle, type PresetName } from 'post-canvas';
import { PostCanvasView } from 'post-canvas/render';
import 'post-canvas/styles.css';
import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { LazyStage, StageFallback } from '@/components/site/lazy-stage';
import { LiveNote } from '@/components/site/live-note';
import { useSiteTheme } from '@/components/site/use-site-theme';
import { createFakeAdapters } from '@/lib/fake-adapters';
import { articleSample, socialSample, socialSecondParagraph } from '@/lib/sample-content';
import { useOrigin } from './demo-utils';

type Shown = Exclude<PresetName, 'full'>;

const presets: { id: Shown; label: string; title: string; body: string; points: string[] }[] = [
  {
    id: 'social',
    label: 'Social post',
    title: 'A post that knows when it is an article',
    body: 'Bold, italic, links, mentions, hashtags, photos, galleries, video and embeds. No headings or tables.',
    points: [
      'The status bar names the kind: text, photo, video or embed post.',
      'A second paragraph or a second photo makes it an article, and the title and cover appear.',
    ],
  },
  {
    id: 'article',
    label: 'Article',
    title: 'Long form, with a title and a cover',
    body: 'Every block, plus a title field and a cover photo above the body. Publishing needs a title.',
    points: ['Headings, tables, code, quotes and task lists.', 'The status bar counts words and reading time.'],
  },
  {
    id: 'comment',
    label: 'Comment box',
    title: 'A small box that posts on Enter',
    body: 'Paragraphs, bold, italic, links and mentions, and a 2,000 character limit. Shift and Enter adds a line.',
    points: ['No toolbar: select text for the menu.', 'Each comment renders with the read-only view.'],
  },
];

interface Comment {
  id: string;
  name: string;
  when: string;
  content: JSONContent;
}

const para = (value: string): JSONContent => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: value }] }],
});

const seedComments: Comment[] = [
  { id: 'c1', name: 'Sofia Rossi', when: '2 hours ago', content: para('The glasshouse at nine is the best tip here.') },
  { id: 'c2', name: 'Leo Martins', when: '1 hour ago', content: para('Going on Saturday. Is the gallery stair open?') },
];

function SocialStage({ theme, origin }: { theme: ReturnType<typeof useSiteTheme>; origin: string }) {
  const handle = useRef<PostCanvasHandle>(null);
  const adapters = useMemo(() => createFakeAdapters(), []);
  const [content] = useState(() => socialSample(origin));
  const [grown, setGrown] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <div className="site-stage">
        <PostCanvas ref={handle} defaultContent={content} preset="social" adapters={adapters} theme={theme} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="site-btn site-btn-primary"
          disabled={grown}
          onClick={() => {
            const editor = handle.current?.editor;
            if (!editor) return;
            editor.chain().insertContentAt(editor.state.doc.content.size, socialSecondParagraph).focus('end').run();
            setGrown(true);
          }}
        >
          <span>Add a second paragraph</span>
          <span className="site-btn-tile">
            <Plus size={18} aria-hidden="true" />
          </span>
        </button>
        <button
          type="button"
          className="site-btn site-btn-secondary"
          onClick={() => {
            handle.current?.setContent(socialSample(origin));
            setGrown(false);
          }}
        >
          <span>Start over</span>
          <span className="site-btn-tile">
            <RotateCcw size={17} aria-hidden="true" />
          </span>
        </button>
      </div>
    </div>
  );
}

function ArticleStage({ theme, origin }: { theme: ReturnType<typeof useSiteTheme>; origin: string }) {
  const adapters = useMemo(() => createFakeAdapters(), []);
  const [sample] = useState(() => articleSample(origin));
  return (
    <div className="site-stage">
      <PostCanvas
        defaultContent={sample.content}
        defaultFields={sample.fields}
        preset="article"
        adapters={adapters}
        theme={theme}
      />
    </div>
  );
}

function CommentStage({ theme }: { theme: ReturnType<typeof useSiteTheme> }) {
  const handle = useRef<PostCanvasHandle>(null);
  const adapters = useMemo(() => createFakeAdapters(), []);
  const [comments, setComments] = useState<Comment[]>(seedComments);
  return (
    <div className="site-stage flex flex-col">
      <ol className="flex flex-col divide-y divide-site-border" aria-label="Comments" aria-live="polite">
        {comments.map((comment) => (
          <li key={comment.id} className="flex gap-3 p-4">
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-site-accent-soft text-[0.85rem] font-semibold text-site-accent"
            >
              {comment.name
                .split(' ')
                .map((part) => part[0])
                .join('')}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.9rem]">
                <span className="font-semibold">{comment.name}</span>{' '}
                <span className="text-site-muted">{comment.when}</span>
              </p>
              <PostCanvasView content={comment.content} theme={theme} className="pc-comment-view" />
            </div>
          </li>
        ))}
      </ol>
      <div className="border-t border-site-border">
        <PostCanvas
          ref={handle}
          preset="comment"
          adapters={adapters}
          theme={theme}
          submitOnEnter
          placeholder="Write a comment, then press Enter"
          onSubmit={({ json }) => {
            const text = json.content?.some((block) => (block.content?.length ?? 0) > 0);
            if (!text) return;
            setComments((list) => [...list, { id: `c${Date.now()}`, name: 'You', when: 'just now', content: json }]);
            handle.current?.clear();
          }}
        />
        <p className="flex items-center gap-2 px-4 pb-3 text-[0.85rem] text-site-muted">
          <CornerDownLeft size={14} aria-hidden="true" /> Enter posts, Shift and Enter adds a line.
        </p>
      </div>
    </div>
  );
}

/** The social, article and comment presets, one at a time, on the dark band. */
export function PresetsDemo() {
  const theme = useSiteTheme();
  const origin = useOrigin();
  const [active, setActive] = useState<Shown>('social');
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + presets.length) % presets.length;
    setActive(presets[next]!.id);
    refs.current[next]?.focus();
  };

  return (
    <div className="flex flex-col gap-8">
      <div
        role="tablist"
        aria-label="Presets"
        className="site-seg grid w-full grid-cols-3 sm:inline-flex sm:w-auto sm:self-start"
      >
        {presets.map((preset, index) => (
          <button
            key={preset.id}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`${id}-${preset.id}`}
            aria-selected={active === preset.id}
            aria-controls={`${id}-panel`}
            tabIndex={active === preset.id ? 0 : -1}
            className="site-seg-btn justify-center px-2 sm:px-4"
            onClick={() => setActive(preset.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-${active}`}
        className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-10"
      >
        {presets.map((preset) => (
          <div key={preset.id} hidden={preset.id !== active} className="site-swap flex flex-col gap-3">
            <h3 className="site-h3 text-white">{preset.title}</h3>
            <p className="text-site-deep-muted">{preset.body}</p>
            <ul className="mt-2 flex flex-col gap-2.5">
              {preset.points.map((point) => (
                <li key={point} className="flex gap-3 text-[0.96rem] text-white/90">
                  <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-[#7aa2f7]" />
                  {point}
                </li>
              ))}
            </ul>
            <p className="mt-2 font-mono text-[0.85rem] text-site-deep-muted">
              {'<PostCanvas preset="'}
              <span className="text-white">{preset.id}</span>
              {'" />'}
            </p>
          </div>
        ))}
        <div className="flex min-w-0 flex-col gap-3">
          <LiveNote>Each tab is the same component with a different preset. Type in it.</LiveNote>
          <LazyStage minHeight={['24rem', '28rem']} fallback={<StageFallback />}>
            {active === 'social' && origin && <SocialStage theme={theme} origin={origin} />}
            {active === 'article' && origin && <ArticleStage theme={theme} origin={origin} />}
            {active === 'comment' && <CommentStage theme={theme} />}
          </LazyStage>
        </div>
      </div>
    </div>
  );
}
