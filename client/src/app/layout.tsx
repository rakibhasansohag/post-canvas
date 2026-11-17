import { RootProvider } from 'fumadocs-ui/provider/next';
import type { Metadata } from 'next';
import './global.css';
import { Inter } from 'next/font/google';
import { appDescription, appName, basePath, siteUrl } from '@/lib/shared';

const inter = Inter({
  subsets: ['latin'],
});

export const metadata: Metadata = {
  // Relative URLs in metadata (canonical links, Open Graph images) resolve under the base path.
  metadataBase: new URL(`${siteUrl}${basePath}/`),
  title: { default: `${appName}: a rich-text editor with a media canvas`, template: `%s | ${appName}` },
  description: appDescription,
  openGraph: { siteName: appName, type: 'website', description: appDescription },
  twitter: { card: 'summary_large_image' },
  alternates: { canonical: './' },
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider search={{ options: { type: 'static', api: `${basePath}/api/search` } }}>{children}</RootProvider>
      </body>
    </html>
  );
}
