// The media canvas playground: images, galleries in four layouts, files, the cover, uploads that can fail, paste and
// drop, the document JSON and the static HTML side by side.
import { StrictMode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  PostCanvas,
  getProblems,
  hasPendingUploads,
  type Adapters,
  type JSONContent,
  type PostCanvasHandle,
  type PostCanvasTheme,
  type Problem,
  type UploadAdapter,
} from '../src/index';
import '../src/styles/index.css';
import { fakeAdapters, fakeUpload, failNextUpload } from './shared/fake-adapters';
import './shared/playground.css';

const starter: JSONContent = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Media canvas' }] },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Use the + button or type / for Image, Gallery and File. Paste or drop photos anywhere; drop them on a gallery to add them. The buttons above make sample photos.',
        },
      ],
    },
    { type: 'paragraph' },
  ],
};

const colours = ['#d94f3d', '#e59b2f', '#3d9a5b', '#2f6fd0', '#8a4fd0', '#c44f8f', '#2a8f8f', '#6b6b6b'];
const shapes: [number, number][] = [
  [1600, 1067],
  [1080, 1350],
  [1200, 1200],
  [1920, 1005],
  [900, 1600],
  [1500, 1000],
];

/** Sample JPEGs drawn on a canvas: numbered, in different colours and shapes. */
async function samplePhotos(count: number, offset = 0): Promise<File[]> {
  const files: File[] = [];
  for (let index = 0; index < count; index++) {
    const n = offset + index;
    const [width, height] = shapes[n % shapes.length] ?? [1200, 800];
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) continue;
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, colours[n % colours.length] ?? '#888');
    gradient.addColorStop(1, colours[(n + 3) % colours.length] ?? '#444');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    context.fillStyle = 'rgba(255,255,255,0.9)';
    context.font = `bold ${Math.round(Math.min(width, height) / 3)}px system-ui, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(String(n + 1), width / 2, height / 2);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (blob) files.push(new File([blob], `sample-${n + 1}.jpg`, { type: 'image/jpeg' }));
  }
  return files;
}

/** A tiny red PNG as a data URL, for the pasted-HTML check. */
const dataPng =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAHElEQVR42mP8z8DwnwEJMDEgg1EwqmBUwagCOggAy6YC/x2YQ6IAAAAASUVORK5CYII=';

function App() {
  const canvas = useRef<PostCanvasHandle>(null);
  const [json, setJson] = useState<JSONContent>(starter);
  const [html, setHtml] = useState('');
  const [problems, setProblems] = useState<Problem[]>([]);
  const [theme, setTheme] = useState<PostCanvasTheme>('light');
  const [withAdapter, setWithAdapter] = useState(true);
  const [failAll, setFailAll] = useState(false);
  const failAllRef = useRef(failAll);
  useEffect(() => {
    failAllRef.current = failAll;
  }, [failAll]);
  const counter = useRef(0);

  const upload = useMemo<UploadAdapter>(
    () => ({
      ...fakeUpload,
      upload: (file, ctx) => {
        if (failAllRef.current) failNextUpload();
        return fakeUpload.upload(file, ctx);
      },
    }),
    [],
  );
  const adapters = useMemo<Adapters>(
    () => (withAdapter ? { ...fakeAdapters, upload } : { ...fakeAdapters, upload: undefined }),
    [withAdapter, upload],
  );

  const refresh = useCallback(() => {
    const editor = canvas.current?.editor;
    if (!editor) return;
    setJson(editor.getJSON());
    setHtml(editor.getHTML());
    setProblems(getProblems(editor));
  }, []);

  // Upload status changes don't always change the document, so the side panels also refresh on a timer.
  useEffect(() => {
    const timer = window.setInterval(refresh, 600);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const editor = () => canvas.current?.editor ?? null;
  const run = async (action: (files: File[]) => void, count: number) => {
    const files = await samplePhotos(count, counter.current);
    counter.current += count;
    action(files);
  };

  const dropOnFirstGallery = async () => {
    const target = document.querySelector('.pc-node--gallery .pc-frame');
    if (!target) return;
    const files = await samplePhotos(3, counter.current);
    counter.current += 3;
    const transfer = new DataTransfer();
    for (const file of files) transfer.items.add(file);
    const rect = target.getBoundingClientRect();
    const at = {
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      bubbles: true,
      cancelable: true,
    };
    target.dispatchEvent(new DragEvent('dragenter', { ...at, dataTransfer: transfer }));
    target.dispatchEvent(new DragEvent('dragover', { ...at, dataTransfer: transfer }));
    target.dispatchEvent(new DragEvent('drop', { ...at, dataTransfer: transfer }));
  };

  const pasteFiles = (files: File[], htmlText = '') => {
    const view = editor()?.view;
    if (!view) return;
    view.focus();
    const transfer = new DataTransfer();
    for (const file of files) transfer.items.add(file);
    if (htmlText) transfer.setData('text/html', htmlText);
    view.dom.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true }));
  };

  const svgAsPng = () =>
    new File(
      ['<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="10" height="10"/></svg>'],
      'logo.png',
      {
        type: 'image/png',
      },
    );

  const dark = theme === 'dark';
  return (
    <div className={dark ? 'pg-page pg-dark' : 'pg-page'}>
      <header className="pg-bar">
        <h1>Media canvas</h1>
        <a href="./index.html">All pages</a>
        <label>
          Theme{' '}
          <select value={theme} onChange={(event) => setTheme(event.target.value as PostCanvasTheme)}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto</option>
          </select>
        </label>
        <label>
          <input type="checkbox" checked={withAdapter} onChange={(event) => setWithAdapter(event.target.checked)} />{' '}
          Upload adapter
        </label>
        <label>
          <input type="checkbox" checked={failAll} onChange={(event) => setFailAll(event.target.checked)} /> Fail every
          upload
        </label>
        <button type="button" onClick={failNextUpload}>
          Fail the next upload
        </button>
      </header>
      <div className="pg-bar" role="group" aria-label="Sample media">
        <button type="button" onClick={() => void run((files) => editor()?.commands.insertFiles(files), 1)}>
          Insert 1 photo
        </button>
        <button
          type="button"
          onClick={() =>
            void run((files) => editor()?.commands.uploadFiles(files, { type: 'cursor', as: 'gallery' }), 4)
          }
        >
          Insert a gallery of 4
        </button>
        <button type="button" onClick={() => void dropOnFirstGallery()}>
          Drop 3 on the first gallery
        </button>
        <button type="button" onClick={() => void run((files) => pasteFiles(files), 2)}>
          Paste 2 photos
        </button>
        <button
          type="button"
          onClick={() =>
            editor()?.commands.insertFiles([
              new File(['%PDF-1.4 sample'], 'quarterly-report.pdf', { type: 'application/pdf' }),
              new File(['a,b\n1,2'], 'numbers.csv', { type: 'text/csv' }),
            ])
          }
        >
          Attach 2 files
        </button>
        <button
          type="button"
          onClick={() =>
            editor()?.view.pasteHTML(`<p>Pasted text with a picture:</p><img src="${dataPng}" alt="Red square">`)
          }
        >
          Paste HTML with a data: image
        </button>
        <button type="button" onClick={() => pasteFiles([svgAsPng()])}>
          Paste an SVG named .png
        </button>
      </div>
      <div className="pg-grid">
        <section className="pg-panel" aria-label="Editor">
          <PostCanvas
            ref={canvas}
            defaultContent={starter}
            adapters={adapters}
            features={{
              image: true,
              gallery: { layouts: ['carousel', 'grid', 'masonry', 'collage'], maxPhotos: 10 },
              file: true,
              title: true,
              cover: true,
            }}
            theme={theme}
            autosave={false}
            onChange={refresh}
          />
        </section>
        <section className="pg-panel" aria-label="Static HTML from editor.getHTML()">
          <div className="pc-view" data-pc-theme={theme}>
            {/* The editor's own renderHTML output, for comparing the saved look with the editor. */}
            <div className="pc-content" style={{ padding: 16 }} dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </section>
      </div>
      <div className="pg-grid">
        <section className="pg-panel" aria-label="Upload state">
          <div style={{ padding: 12, fontSize: 14 }}>
            <p>
              <strong>hasPendingUploads:</strong> <span data-testid="pending">{String(hasPendingUploads(json))}</span>{' '}
              <small>(the fake adapter returns blob: URLs, so finished uploads still count as local)</small>
            </p>
            <p>
              <strong>Problems:</strong>
            </p>
            <ul data-testid="problems">
              {problems.length === 0 ? (
                <li>None</li>
              ) : (
                problems.map((problem, i) => <li key={i}>{`${problem.code}: ${problem.message}`}</li>)
              )}
            </ul>
          </div>
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
