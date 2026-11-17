import { RootProvider } from 'fumadocs-ui/provider/next';
import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Geist, Geist_Mono } from 'next/font/google';
import './global.css';
import { appDescription, appName, basePath, siteUrl } from '@/lib/shared';

// Bricolage Grotesque for display type, Geist for text and UI, Geist Mono for code and labels. All three are OFL.
const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  axes: ['opsz'],
  display: 'swap',
});
const sans = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' });

export const metadata: Metadata = {
  // Relative URLs in metadata (canonical links, Open Graph images) resolve under the base path.
  metadataBase: new URL(`${siteUrl}${basePath}/`),
  title: { default: `${appName}: a rich-text editor with a media canvas`, template: `%s | ${appName}` },
  description: appDescription,
  applicationName: appName,
  openGraph: { siteName: appName, type: 'website', description: appDescription },
  twitter: { card: 'summary_large_image' },
  alternates: { canonical: './' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#161719' },
  ],
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider search={{ options: { type: 'static', api: `${basePath}/api/search` } }}>{children}</RootProvider>
      </body>
    </html>
  );
}
