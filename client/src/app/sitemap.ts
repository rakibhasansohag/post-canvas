import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';
import { basePath, siteUrl } from '@/lib/shared';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const url = (path: string) => `${siteUrl}${basePath}${path}/`.replace(/\/\/$/, '/');
  return [
    { url: url(''), priority: 1 },
    { url: url('/playground') },
    ...source.getPages().map((page) => ({ url: url(page.url) })),
  ];
}
