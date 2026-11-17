// Fake adapters for the docs site: no network and no server. They show how each adapter behaves, and they are the
// shapes you replace with your own storage, search and preview services.
import type {
  Adapters,
  DraftSnapshot,
  DraftStorage,
  LinkPreviewResolver,
  SuggestionItem,
  SuggestionSource,
  UploadAdapter,
} from 'post-canvas';

let failNext = false;

/** Makes the next upload fail, to show the error and retry path. */
export function failNextUpload(): void {
  failNext = true;
}

function readImageSize(url: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

/** Simulates a second of progress, then returns an object URL. It honours the abort signal. */
export const fakeUpload: UploadAdapter = {
  accept: { image: 'image/*', file: '*/*' },
  maxBytes: { image: 20 * 1024 * 1024, file: 50 * 1024 * 1024 },
  async upload(file, { kind, signal, onProgress }) {
    const shouldFail = failNext;
    failNext = false;
    for (let step = 1; step <= 10; step++) {
      await new Promise((resolve) => setTimeout(resolve, 90 + Math.random() * 80));
      if (signal.aborted) throw new DOMException('Upload cancelled', 'AbortError');
      if (shouldFail && step === 6) throw new Error(`Simulated failure for ${file.name}`);
      onProgress(step / 10);
    }
    const src = URL.createObjectURL(file);
    const size = kind === 'image' ? await readImageSize(src) : null;
    return {
      src,
      id: `demo-${Math.random().toString(36).slice(2, 10)}`,
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      ...(size ?? {}),
    };
  },
};

const people: SuggestionItem[] = [
  { id: 'maya', label: 'Maya Okafor', description: 'Photographer' },
  { id: 'jonas', label: 'Jonas Weber', description: 'Editor' },
  { id: 'priya', label: 'Priya Nair', description: 'Designer' },
  { id: 'leo', label: 'Leo Martins', description: 'Developer' },
  { id: 'sofia', label: 'Sofia Rossi', description: 'Travel writer' },
  { id: 'daniel', label: 'Daniel Kim', description: 'Illustrator' },
  { id: 'amara', label: 'Amara Diallo', description: 'Producer' },
  { id: 'tomas', label: 'Tomas Novak', description: 'Video editor' },
];

const tags = ['design', 'development', 'editor', 'opensource', 'photography', 'react', 'travel', 'typescript'];

function staticSource(items: SuggestionItem[]): SuggestionSource {
  return {
    async search(query, { signal }) {
      await new Promise((resolve) => setTimeout(resolve, 120));
      if (signal.aborted) return [];
      const q = query.trim().toLowerCase();
      return items.filter((item) => !q || item.label.toLowerCase().includes(q) || item.id.includes(q)).slice(0, 8);
    },
  };
}

/** Eight people, for `@` mentions. */
export const fakeMentions = staticSource(people);

/** A fixed list, for `#` hashtags. */
export const fakeHashtags = staticSource(tags.map((tag) => ({ id: tag, label: tag })));

/** A canned link preview for any URL. */
export const fakeLinkPreview: LinkPreviewResolver = async (url, { signal }) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return 'example.com';
    }
  })();
  return {
    url,
    title: `A canned preview of ${host}`,
    description: 'The demo returns this preview for every link. It does not fetch anything.',
    siteName: host,
  };
};

/** Drafts kept in memory for this tab only. */
export function createMemoryStorage(): DraftStorage {
  const drafts = new Map<string, DraftSnapshot>();
  return {
    load: (key) => drafts.get(key) ?? null,
    save: (key, snapshot) => void drafts.set(key, snapshot),
    clear: (key) => void drafts.delete(key),
  };
}

/** Every fake adapter together. */
export function createFakeAdapters(): Adapters {
  return {
    upload: fakeUpload,
    mentions: fakeMentions,
    hashtags: fakeHashtags,
    links: fakeLinkPreview,
    storage: createMemoryStorage(),
  };
}
