import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PostCanvas, type JSONContent, type PostCanvasTheme } from '../src/index';
import '../src/styles/index.css';
import { fakeAdapters, failNextUpload } from './shared/fake-adapters';
import './shared/playground.css';

// Every playground page, found at build time, so a new page shows up here without an edit.
const pages = Object.keys(import.meta.glob('./*.html'))
  .map((path) => path.replace('./', ''))
  .filter((file) => file !== 'index.html')
  .sort();

const starter: JSONContent = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Post Canvas playground' }] },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Type here. Try ' },
        { type: 'text', marks: [{ type: 'bold' }], text: 'Cmd+B' },
        { type: 'text', text: ', undo and redo. The JSON updates as you go.' },
      ],
    },
  ],
};

function App() {
  const [json, setJson] = useState<JSONContent>(starter);
  const [theme, setTheme] = useState<PostCanvasTheme>('auto');
  const dark = theme === 'dark';

  return (
    <div className={dark ? 'pg-page pg-dark' : 'pg-page'}>
      <header className="pg-bar">
        <h1>Post Canvas playground</h1>
        <nav aria-label="Playground pages">
          <ul className="pg-links">
            {pages.map((page) => (
              <li key={page}>
                <a href={`./${page}`}>{page.replace('.html', '')}</a>
              </li>
            ))}
          </ul>
        </nav>
        <label>
          Theme{' '}
          <select value={theme} onChange={(event) => setTheme(event.target.value as PostCanvasTheme)}>
            <option value="auto">Auto</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <button type="button" onClick={failNextUpload}>
          Fail the next upload
        </button>
      </header>
      <div className="pg-grid">
        <section className="pg-panel" aria-label="Editor">
          <PostCanvas defaultContent={starter} adapters={fakeAdapters} theme={theme} onChange={setJson} />
        </section>
        <section className="pg-panel" aria-label="Document JSON">
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
