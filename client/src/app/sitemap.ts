import type { MetadataRoute } from 'next';
import { seoPages } from '@/components/seo/pages';
import { source } from '@/lib/source';
import { basePath, siteUrl } from '@/lib/shared';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const url = (path: string) => `${siteUrl}${basePath}${path}/`.replace(/\/\/$/, '/');
  return [
    { url: url(''), priority: 1 },
    { url: url('/playground'), priority: 0.8 },
    { url: url('/examples'), priority: 0.8 },
    ...seoPages.map((page) => ({ url: url(`/${page.slug}`), priority: 0.8 })),
    ...source.getPages().map((page) => ({ url: url(page.url) })),
  ];
}
