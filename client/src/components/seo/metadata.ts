import type { Metadata } from 'next';
import { appName } from '@/lib/shared';
import { seoPage, type SeoSlug } from './pages';

/**
 * Open Graph and Twitter tags for a page with its own title. A page's `openGraph` replaces the root one rather than
 * merging with it, so the site name and the share image (app/opengraph-image.jpg) are set again here.
 */
export function shareMetadata({
  title,
  description,
  type = 'website',
}: {
  title: string;
  description: string;
  type?: 'website' | 'article';
}): Pick<Metadata, 'openGraph' | 'twitter'> {
  const image = {
    // Relative to metadataBase, so it keeps any base path.
    url: 'opengraph-image.jpg',
    width: 3600,
    height: 1890,
    type: 'image/jpeg',
    alt: `${appName}: posts with photos, video and links in one React editor`,
  };
  return {
    openGraph: { siteName: appName, locale: 'en_US', type, title, description, url: './', images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

/** Title, description, canonical and share tags for one comparison page, from its entry in `seoPages`. */
export function seoMetadata(slug: SeoSlug): Metadata {
  const page = seoPage(slug);
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: './' },
    ...shareMetadata({ title: page.title, description: page.description, type: 'article' }),
  };
}
