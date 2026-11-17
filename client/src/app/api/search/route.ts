import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

// The site is a static export, so the search index is built once and the browser searches it locally.
export const revalidate = false;

export const { staticGET: GET } = createFromSource(source);
