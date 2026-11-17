import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DraftStorage } from '../core/types';
import { createAutosave } from './autosave';

const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello there' }] }] };

describe('createAutosave', () => {
  afterEach(() => vi.restoreAllMocks());

  it('survives a storage that throws or rejects', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const rejects: DraftStorage = {
      load: () => Promise.reject(new Error('down')),
      save: () => Promise.reject(new Error('full')),
      clear: () => {
        throw new Error('locked');
      },
    };
    const autosave = createAutosave(rejects, { delay: 0 });
    autosave.schedule(doc, {});
    autosave.flush();
    await expect(autosave.clear()).resolves.toBeUndefined();
    await expect(autosave.load()).resolves.toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
