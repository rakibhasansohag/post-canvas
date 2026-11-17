// Fake adapters for every playground page: no network, no server.
import type {
  Adapters,
  DraftSnapshot,
  DraftStorage,
  LinkPreviewResolver,
  SuggestionItem,
  SuggestionSource,
  UploadAdapter,
} from '../../src/index';

let failNext = false;

/** Makes the next upload fail, to test the error and retry paths. */
export function failNextUpload(): void {
  failNext = true;
}

/** Whether the next upload will fail. */
export function willFailNextUpload(): boolean {
  return failNext;
}

function readImageSize(url: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

/** Returns an object URL after a second or so of simulated progress. Honours the abort signal. */
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
      id: `fake-${Math.random().toString(36).slice(2, 10)}`,
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      ...(size ?? {}),
    };
  },
};

const people: SuggestionItem[] = [
  { id: 'ada', label: 'Ada Lovelace', description: 'Mathematician' },
  { id: 'alan', label: 'Alan Turing', description: 'Computer scientist' },
  { id: 'grace', label: 'Grace Hopper', description: 'Rear admiral' },
  { id: 'katherine', label: 'Katherine Johnson', description: 'Mathematician' },
  { id: 'linus', label: 'Linus Torvalds', description: 'Kernel maintainer' },
  { id: 'margaret', label: 'Margaret Hamilton', description: 'Software engineer' },
  { id: 'tim', label: 'Tim Berners-Lee', description: 'Web inventor' },
  { id: 'barbara', label: 'Barbara Liskov', description: 'Computer scientist' },
  { id: 'dennis', label: 'Dennis Ritchie', description: 'C and Unix' },
  { id: 'radia', label: 'Radia Perlman', description: 'Network engineer' },
];

const tags = [
  'design',
  'development',
  'editor',
  'opensource',
  'photography',
  'react',
  'travel',
  'typescript',
  'webdev',
];

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

/** Ten people, for `@` mentions. */
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
    description: 'The playground returns this preview for every link, without fetching anything.',
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
export const fakeAdapters: Adapters = {
  upload: fakeUpload,
  mentions: fakeMentions,
  hashtags: fakeHashtags,
  links: fakeLinkPreview,
  storage: createMemoryStorage(),
};
