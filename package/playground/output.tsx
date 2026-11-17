// Playground for chat C: embeds, the sanitizer and every output format, side by side with the editor.
import type { Editor } from '@tiptap/core';
import { StrictMode, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { setEmbedConsent } from '../src/extensions';
import {
  PostCanvas,
  collectProblems,
  parseVideoUrl,
  matchEmbedUrl,
  type Adapters,
  type EmbedMetadataResolver,
  type JSONContent,
  type PostCanvasHandle,
  type PostCanvasTheme,
  type Problem,
} from '../src/index';
import {
  PostCanvasView,
  fromHTML,
  renderToHTML,
  sanitizeDocument,
  toMarkdown,
  toPlainText,
  excerpt,
  type EmbedRenderMode,
} from '../src/render';
import '../src/styles/index.css';
import styles from '../src/styles/index.css?inline';
import { fakeAdapters } from './shared/fake-adapters';
import './shared/playground.css';

const yt = 'dQw4w9WgXcQ';

const samples: [string, string][] = [
  ['YouTube', `https://www.youtube.com/watch?v=${yt}`],
  ['YouTube Short', 'https://www.youtube.com/shorts/aqz-KE-bpKQ'],
  ['Vimeo', 'https://vimeo.com/76979871'],
  ['Spotify', 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC'],
  ['SoundCloud', 'https://soundcloud.com/forss/flickermood'],
  ['X', 'https://x.com/jack/status/20'],
  ['Instagram', 'https://www.instagram.com/p/C0Lk3pQvQ8m/'],
  ['TikTok', 'https://www.tiktok.com/@scout2015/video/6718335390845095173'],
  ['CodePen', 'https://codepen.io/team/codepen/pen/PNaGbb'],
  ['Loom', 'https://www.loom.com/share/0281766fa2d04bb788eaf19e65135184'],
  ['Figma', 'https://www.figma.com/design/OaP3FEXt4bTL9dIhYsBPUk/Example'],
  ['Maps', 'https://www.google.com/maps/place/Brandenburg+Gate/@52.5163,13.3777,17z'],
  ['Any page', 'https://example.com/articles/hello-world'],
  ['Lookalike', `https://youtube.com.evil.example/watch?v=${yt}`],
];

/** A canned metadata lookup: no network. */
const fakeEmbeds: EmbedMetadataResolver = async (url, { signal }) => {
  await new Promise((resolve) => setTimeout(resolve, 400));
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
  const video = parseVideoUrl(url);
  const name = video?.provider ?? matchEmbedUrl(url)?.provider.label ?? 'embed';
  return {
    title: `A canned ${name} title`,
    description: video ? 'The playground fills this in without fetching anything. Edit it inline.' : undefined,
  };
};

const adapters: Adapters = { ...fakeAdapters, embeds: fakeEmbeds };

const starter: JSONContent = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Output and embeds' }] },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Paste a link into an empty line, use the buttons above, or open ' },
        { type: 'text', marks: [{ type: 'code' }], text: '/' },
        { type: 'text', text: ' and pick Video, Embed or Link card.' },
      ],
    },
    {
      type: 'video',
      attrs: {
        id: 'demo-video',
        provider: 'youtube',
        videoId: yt,
        title: 'A video facade',
        description: 'Click to load the player.',
      },
    },
    { type: 'paragraph' },
  ],
};

/** A hostile document: every vector the sanitizer must remove. */
const xssFixture: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      attrs: { onclick: 'alert(1)' },
      content: [{ type: 'text', text: '<script>alert("text")</script>' }],
    },
    ...[
      'javascript:alert(1)',
      'JaVaScRiPt:alert(1)',
      '&#106;avascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
    ].map((href, index): JSONContent => ({
      type: 'paragraph',
      content: [{ type: 'text', text: `Hostile link ${index + 1}`, marks: [{ type: 'link', attrs: { href } }] }],
    })),
    { type: 'iframe', attrs: { srcdoc: '<script>alert(1)</script>' } },
    { type: 'video', attrs: { provider: 'youtube', videoId: '"><img src=x onerror=alert(1)>' } },
    {
      type: 'embed',
      attrs: { provider: 'spotify', ref: { type: 'track', id: '4uLU6hMCjMI75M1A2tKUQC' }, url: 'javascript:alert(1)' },
    },
    { type: 'linkCard', attrs: { url: 'javascript:alert(1)', title: 'bad card' } },
    { type: 'embedInput', attrs: { value: 'transient' } },
  ],
};

const tinymce = `<h1>Release notes</h1>
<p style="text-align: center;"><strong>Bold</strong>, <em>italic</em> and <a href="https://example.com" target="_blank" rel="noopener">a link</a>.</p>
<ul><li>First</li><li>Second<ul><li>Nested</li></ul></li></ul>
<ol start="3"><li>Three</li></ol>
<blockquote><p>Quoted text</p></blockquote>
<table border="1" style="border-collapse: collapse; width: 100%;"><tbody><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></tbody></table>
<p><iframe src="https://www.youtube.com/embed/${yt}" width="560" height="315" allowfullscreen></iframe></p>
<p><a href="javascript:alert(1)" onclick="alert(1)">a hostile link</a></p>`;

type Tab = 'html' | 'view' | 'markdown' | 'text' | 'json';
const tabs: [Tab, string][] = [
  ['html', 'renderToHTML'],
  ['view', 'PostCanvasView'],
  ['markdown', 'Markdown'],
  ['text', 'Plain text'],
  ['json', 'JSON'],
];

function App() {
  const editorRef = useRef<PostCanvasHandle>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [source, setSource] = useState<JSONContent>(starter);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [theme, setTheme] = useState<PostCanvasTheme>('auto');
  const [consent, setConsent] = useState<'click' | 'auto'>('click');
  const [mode, setMode] = useState<EmbedRenderMode>('facade');
  const [tab, setTab] = useState<Tab>('html');
  const [jsonDraft, setJsonDraft] = useState('');
  const [html, setHtml] = useState(tinymce);
  const dark = theme === 'dark';

  const sanitized = useMemo(() => sanitizeDocument(source), [source]);
  const output = useMemo(() => renderToHTML(source, { embeds: mode }), [source, mode]);
  const frameDoc = `<!doctype html><html data-pc-theme="${theme}"><head><meta charset="utf-8"><style>${styles} body{margin:0;padding:16px;background:var(--pc-background);color:var(--pc-text)}</style></head><body>${output.replace('class="pc-view"', `class="pc-view" data-pc-theme="${theme}"`)}</body></html>`;

  const addLink = (url: string) => {
    if (!editor) return;
    editor.chain().focus('end').insertEmbedInput({ value: url }).run();
  };

  return (
    <div className={dark ? 'pg-page pg-dark' : 'pg-page'}>
      <header className="pg-bar">
        <h1>Output and embeds</h1>
        <a href="./index.html">All pages</a>
        <label>
          Theme{' '}
          <select value={theme} onChange={(event) => setTheme(event.target.value as PostCanvasTheme)}>
            <option value="auto">Auto</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label>
          Editor consent{' '}
          <select
            value={consent}
            onChange={(event) => {
              const next = event.target.value as 'click' | 'auto';
              setConsent(next);
              if (editor) setEmbedConsent(editor, next);
            }}
          >
            <option value="click">click</option>
            <option value="auto">auto</option>
          </select>
        </label>
        <label>
          Output embeds{' '}
          <select value={mode} onChange={(event) => setMode(event.target.value as EmbedRenderMode)}>
            <option value="facade">facade</option>
            <option value="iframe">iframe</option>
            <option value="link">link</option>
          </select>
        </label>
        <button type="button" onClick={() => setSource(xssFixture)} data-testid="xss">
          Load the XSS fixture
        </button>
      </header>

      <section className="pg-panel pg-pad" aria-label="Links to try">
        <p className="pg-note">
          Each button opens a paste-a-link field with the link and adds it. Or copy one and paste it into an empty line.
        </p>
        <div className="pg-chips">
          {samples.map(([label, url]) => (
            <button key={label} type="button" title={url} onClick={() => addLink(url)}>
              {label}
            </button>
          ))}
        </div>
      </section>

      <div className="pg-grid">
        <section className="pg-panel" aria-label="Editor">
          <PostCanvas
            ref={editorRef}
            defaultContent={starter}
            adapters={adapters}
            theme={theme}
            onReady={(instance) => {
              setEditor(instance);
              setEmbedConsent(instance, consent);
              setProblems(collectProblems(instance));
            }}
            onChange={({ json, editor: instance }) => {
              setSource(json);
              setProblems(collectProblems(instance));
            }}
          />
          <div className="pg-pad">
            <h2 className="pg-h2">Problems</h2>
            {problems.length === 0 ? (
              <p className="pg-note">None.</p>
            ) : (
              <ul data-testid="problems">
                {problems.map((problem, index) => (
                  <li key={`${problem.code}-${index}`}>
                    <code>{problem.code}</code> ({problem.severity}): {problem.message}
                  </li>
                ))}
              </ul>
            )}
            <h2 className="pg-h2">Import HTML</h2>
            <textarea
              className="pg-textarea"
              value={html}
              onChange={(event) => setHtml(event.target.value)}
              rows={8}
              aria-label="HTML to import"
            />
            <button type="button" onClick={() => editorRef.current?.setContent(fromHTML(html))}>
              Import into the editor
            </button>
          </div>
        </section>

        <section className="pg-panel" aria-label="Output">
          <div className="pg-tabs" role="tablist" aria-label="Output format">
            {tabs.map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </div>
          <div className="pg-pad" role="tabpanel">
            <p className="pg-note" data-testid="removed">
              Sanitizer removed {sanitized.removed.length} item(s)
              {sanitized.removed.length > 0 &&
                `: ${[...new Set(sanitized.removed.map((item) => `${item.reason} ${item.type ?? ''}`.trim()))].join(', ')}`}
              . Excerpt: “{excerpt(sanitized.doc, 80)}”
            </p>
            {tab === 'html' && (
              <>
                <iframe
                  className="pg-frame"
                  title="renderToHTML output"
                  sandbox="allow-popups allow-popups-to-escape-sandbox"
                  srcDoc={frameDoc}
                />
                <details>
                  <summary>HTML source</summary>
                  <pre className="pg-json">{output}</pre>
                </details>
              </>
            )}
            {tab === 'view' && <PostCanvasView content={source} embeds={mode} theme={theme} />}
            {tab === 'markdown' && <pre className="pg-json">{toMarkdown(sanitized.doc)}</pre>}
            {tab === 'text' && <pre className="pg-json">{toPlainText(sanitized.doc)}</pre>}
            {tab === 'json' && (
              <>
                <textarea
                  className="pg-textarea pg-mono"
                  rows={18}
                  aria-label="Document JSON"
                  value={jsonDraft || JSON.stringify(source, null, 2)}
                  onChange={(event) => setJsonDraft(event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => {
                    try {
                      setSource(JSON.parse(jsonDraft || '{}') as JSONContent);
                      setJsonDraft('');
                    } catch {
                      window.alert('That JSON does not parse.');
                    }
                  }}
                >
                  Render this JSON
                </button>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

const root = document.getElementById('app');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
