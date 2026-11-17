import { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  PostCanvas,
  en,
  getProblems,
  type JSONContent,
  type Limits,
  type Locale,
  type PostCanvasHandle,
  type PostCanvasTheme,
  type PostFields,
  type PresetName,
  type Problem,
} from '../src/index';
import de from '../src/locales/de/index';
import es from '../src/locales/es/index';
import fr from '../src/locales/fr/index';
import it from '../src/locales/it/index';
import pt from '../src/locales/pt/index';
import '../src/styles/index.css';
import googleDocs from './fixtures/google-docs.html?raw';
import word from './fixtures/word.html?raw';
import { fakeAdapters } from './shared/fake-adapters';
import './shared/playground.css';

const locales: Record<string, Locale> = { en, de, es, fr, it, pt };
// Drafts go to the default localStorage storage here, so autosave survives a reload.
const { storage: _memoryStorage, ...adapters } = fakeAdapters;
const presetNames: PresetName[] = ['full', 'article', 'social', 'comment'];

const starter: JSONContent = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Text and editor UI' }] },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Select text for the menu, type ' },
        { type: 'text', marks: [{ type: 'code' }], text: '/' },
        { type: 'text', text: ' for blocks, ' },
        { type: 'text', marks: [{ type: 'code' }], text: '@' },
        { type: 'text', text: ' to mention and ' },
        { type: 'text', marks: [{ type: 'code' }], text: '#' },
        { type: 'text', text: ' for tags. Try ' },
        { type: 'text', marks: [{ type: 'bold' }], text: '**bold**' },
        { type: 'text', text: ', ' },
        {
          type: 'text',
          marks: [{ type: 'link', attrs: { href: 'https://example.com', target: '_blank' } }],
          text: 'a link',
        },
        { type: 'text', text: ' and the handle on the left.' },
      ],
    },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Lists, tasks and quotes' }] }],
        },
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Tables and code' }] }] },
      ],
    },
    {
      type: 'codeBlock',
      attrs: { language: 'typescript' },
      content: [{ type: 'text', text: "const greeting: string = 'hello';\nconsole.log(greeting);" }],
    },
  ],
};

const limitOptions: Record<string, Limits> = {
  none: {},
  words: { maxWords: 50 },
  characters: { maxCharacters: 280 },
  media: { maxMedia: 1, maxPhotos: 4 },
};

function App() {
  const editorRef = useRef<PostCanvasHandle>(null);
  const [json, setJson] = useState<JSONContent>(starter);
  const [fields, setFields] = useState<PostFields>({});
  const [problems, setProblems] = useState<Problem[]>([]);
  const [theme, setTheme] = useState<PostCanvasTheme>('auto');
  const [preset, setPreset] = useState<PresetName>('full');
  const [locale, setLocale] = useState('en');
  const [limits, setLimits] = useState('none');
  const [readOnly, setReadOnly] = useState(false);
  const [autosave, setAutosave] = useState(true);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const dark = theme === 'dark';

  const paste = (html: string) => {
    const editor = editorRef.current?.editor;
    if (!editor) return;
    editor.commands.focus('end');
    editor.view.pasteHTML(html);
  };
  const copy = async (html: string) => {
    const item = new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([html.replace(/<[^>]+>/g, ' ')], { type: 'text/plain' }),
    });
    await navigator.clipboard.write([item]);
  };

  return (
    <div className={dark ? 'pg-page pg-dark' : 'pg-page'}>
      <header className="pg-bar">
        <h1>
          <a href="./index.html">Playground</a> · text and editor UI
        </h1>
        <label>
          Preset{' '}
          <select value={preset} onChange={(event) => setPreset(event.target.value as PresetName)}>
            {presetNames.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label>
          Theme{' '}
          <select value={theme} onChange={(event) => setTheme(event.target.value as PostCanvasTheme)}>
            <option value="auto">Auto</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label>
          Locale{' '}
          <select value={locale} onChange={(event) => setLocale(event.target.value)}>
            {Object.keys(locales).map((code) => (
              <option key={code}>{code}</option>
            ))}
          </select>
        </label>
        <label>
          Limits{' '}
          <select value={limits} onChange={(event) => setLimits(event.target.value)}>
            <option value="none">None (preset default)</option>
            <option value="words">50 words</option>
            <option value="characters">280 characters</option>
            <option value="media">1 media, 4 photos</option>
          </select>
        </label>
        <label>
          <input type="checkbox" checked={readOnly} onChange={(event) => setReadOnly(event.target.checked)} /> Read only
        </label>
        <label>
          <input type="checkbox" checked={autosave} onChange={(event) => setAutosave(event.target.checked)} /> Autosave
        </label>
      </header>
      <div className="pg-bar">
        <button type="button" onClick={() => paste(word)}>
          Paste Word fixture
        </button>
        <button type="button" onClick={() => paste(googleDocs)}>
          Paste Google Docs fixture
        </button>
        <button type="button" onClick={() => void copy(word)}>
          Copy Word fixture
        </button>
        <button type="button" onClick={() => void copy(googleDocs)}>
          Copy Google Docs fixture
        </button>
        <button type="button" onClick={() => editorRef.current?.clear()}>
          Clear (as after saving)
        </button>
        <button type="button" onClick={() => editorRef.current?.setContent(starter)}>
          Reset content
        </button>
      </div>
      <div className="pg-grid">
        <section className="pg-panel" aria-label="Editor">
          <PostCanvas
            key={`${preset}`}
            ref={editorRef}
            preset={preset}
            defaultContent={preset === 'comment' || preset === 'social' ? '' : starter}
            adapters={adapters}
            locale={locales[locale]}
            theme={theme}
            readOnly={readOnly}
            limits={limits === 'none' ? undefined : limitOptions[limits]}
            autosave={autosave ? { key: `playground-text-${preset}` } : false}
            fields={fields}
            onFieldsChange={setFields}
            submitOnEnter={preset === 'comment'}
            onSubmit={({ editor }) => {
              setSubmitted(editor.getText());
              editor.commands.clearContent(true);
            }}
            onChange={({ json: next, editor }) => {
              setJson(next);
              setProblems(getProblems(editor));
            }}
            slots={{
              footer:
                preset === 'comment' ? (
                  <p className="pg-note">
                    Enter sends, Shift+Enter adds a line. Last sent: {submitted ?? 'nothing yet'}
                  </p>
                ) : undefined,
            }}
          />
        </section>
        <section className="pg-panel" aria-label="Document JSON and problems">
          <h2 className="pg-heading">Problems</h2>
          {problems.length === 0 ? (
            <p className="pg-note">None.</p>
          ) : (
            <ul data-testid="problems">
              {problems.map((problem) => (
                <li key={problem.code}>
                  {problem.severity}: {problem.message}
                </li>
              ))}
            </ul>
          )}
          <h2 className="pg-heading">Fields</h2>
          <pre className="pg-json">{JSON.stringify(fields, null, 2)}</pre>
          <h2 className="pg-heading">JSON</h2>
          <pre className="pg-json" data-testid="json">
            {JSON.stringify(json, null, 2)}
          </pre>
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
