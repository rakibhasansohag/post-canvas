import Link from 'next/link';
import { LogoMark } from './logo';
import { InstallCommand } from './install-command';
import { seoPages } from '@/components/seo/pages';
import { npmUrl, repoUrl } from '@/lib/shared';

const columns: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Docs',
    links: [
      { label: 'Getting started', href: '/docs/getting-started' },
      { label: 'Concepts', href: '/docs/concepts' },
      { label: 'Guides', href: '/docs/guides' },
      { label: 'Reference', href: '/docs/reference' },
    ],
  },
  {
    title: 'Try it',
    links: [
      { label: 'Examples', href: '/examples' },
      { label: 'Playground', href: '/playground' },
      { label: 'Roadmap', href: '/docs/roadmap' },
    ],
  },
  {
    title: 'Compare',
    links: seoPages.map((page) => ({ label: page.short, href: `/${page.slug}` })),
  },
  {
    title: 'Project',
    links: [
      { label: 'GitHub', href: repoUrl },
      { label: 'npm', href: npmUrl },
      { label: 'Releases', href: `${repoUrl}/releases` },
      { label: 'Report an issue', href: `${repoUrl}/issues` },
      { label: 'Contributing', href: '/docs/contributing' },
    ],
  },
];

function FooterLink({ href, children }: { href: string; children: string }) {
  const className =
    'inline-block py-1 text-site-deep-muted transition-colors duration-200 hover:text-white focus-visible:text-white';
  return /^https?:/.test(href) ? (
    <a href={href} className={className}>
      {children}
    </a>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

/** The boxed footer: the mark, the install command, link columns, the licence and a large outline wordmark. */
export function SiteFooter() {
  return (
    <footer className="site-col mt-auto pt-16 pb-4 sm:pb-6">
      <div className="site-deep site-bleed overflow-hidden px-6 pt-12 pb-6 sm:px-10 lg:px-14 lg:pt-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="flex flex-col items-start gap-5">
            <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Post Canvas home">
              <LogoMark className="size-9 [--site-accent-text:#0e1320] [--site-accent:#ffffff]" />
              <span className="font-display text-[1.45rem] font-bold tracking-[-0.02em]">Post Canvas</span>
            </Link>
            <p className="max-w-[26rem] text-site-deep-muted">
              An open-source React rich text editor for posts and articles, built on Tiptap, with a media canvas and
              safe output.
            </p>
            <InstallCommand className="w-full max-w-[22rem] text-white" />
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
            {columns.map((column) => (
              <div key={column.title}>
                <p className="mb-3 font-mono text-[0.75rem] tracking-[0.14em] text-white uppercase">{column.title}</p>
                <ul>
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <FooterLink href={link.href}>{link.label}</FooterLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <p
          aria-hidden="true"
          className="pointer-events-none mt-12 mb-1 text-center font-display text-[clamp(2.5rem,13vw,13.5rem)] leading-[0.82] font-bold tracking-[-0.045em] whitespace-nowrap text-transparent select-none [-webkit-text-stroke:1px_rgb(255_255_255_/_0.22)]"
        >
          Post Canvas
        </p>
        <div className="relative mt-2 flex flex-col gap-2 border-t border-white/12 pt-5 text-[0.88rem] text-site-deep-muted sm:flex-row sm:justify-between">
          <p>
            Released under the{' '}
            <a href={`${repoUrl}/blob/main/LICENSE`} className="text-white underline-offset-4 hover:underline">
              MIT licence
            </a>
            . Built on Tiptap and ProseMirror.
          </p>
          <a href="#top" className="text-white underline-offset-4 hover:underline">
            Back to top
          </a>
        </div>
      </div>
    </footer>
  );
}
