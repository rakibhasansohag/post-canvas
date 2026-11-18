import { ArrowUpRight, BookOpen, Check, Plus, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ButtonLink } from '@/components/site/button';
import { InstallCommand } from '@/components/site/install-command';
import { SectionHead } from '@/components/site/section-head';
import { cn } from '@/lib/cn';
import { appName, basePath, siteUrl } from '@/lib/shared';
import { seoPages, type SeoPageEntry, type SeoSlug } from './pages';

/** A primary source for a comparison fact. Numbered in the order a page lists them. */
export interface Source {
  label: string;
  href: string;
}

/** A table cell: the text, and the numbers of the sources that back it. */
export type Cell = string | { text: string; src: number[] };

export interface CompareRow {
  feature: string;
  cells: Cell[];
}

const absolute = (path: string) => `${siteUrl}${basePath}${path}`;

/** The page's structured data: the page, its breadcrumb, and its FAQ. The FAQ must match the visible questions. */
export function SeoJsonLd({ page, faqs }: { page: SeoPageEntry; faqs: Faq[] }) {
  const url = absolute(`/${page.slug}/`);
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${url}#page`,
        url,
        name: page.title,
        description: page.description,
        isPartOf: { '@type': 'WebSite', name: appName, url: absolute('/') },
        about: { '@id': `${absolute('/')}#software` },
        dateModified: '2026-11-19',
        inLanguage: 'en',
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: appName, item: absolute('/') },
          { '@type': 'ListItem', position: 2, name: page.short, item: url },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: { '@type': 'Answer', text: faq.answer },
        })),
      },
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

/** The boxed opening: breadcrumb, label, the one h1, a lead, two calls to action and a facts strip. */
export function SeoHero({
  label,
  title,
  lead,
  facts,
  primary = { label: 'Get started', href: '/docs/getting-started' },
  secondary = { label: 'Try the live demo', href: '#demo' },
}: {
  label: string;
  title: ReactNode;
  lead: ReactNode;
  facts: [term: string, value: string][];
  primary?: { label: string; href: string };
  secondary?: { label: string; href: string };
}) {
  return (
    <section aria-labelledby="page-title" className="site-col pt-3 sm:pt-4">
      <div className="site-deep site-dots site-bleed px-6 pt-10 pb-8 sm:px-10 sm:pt-14 lg:px-14 lg:pt-16">
        <nav aria-label="Breadcrumb" className="mb-8 text-[0.9rem] text-site-deep-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="underline-offset-4 hover:text-white hover:underline">
                {appName}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-white">
              {label}
            </li>
          </ol>
        </nav>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end lg:gap-12">
          <div>
            <p className="site-label site-rise mb-6 [--i:0]">{label}</p>
            <h1 id="page-title" className="site-display site-rise max-w-[16ch] [--i:1]">
              {title}
            </h1>
          </div>
          <div className="site-rise flex flex-col gap-6 [--i:2]">
            <div className="text-[1.125rem] leading-relaxed text-site-deep-muted sm:text-[1.2rem]">{lead}</div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={primary.href}>{primary.label}</ButtonLink>
              <ButtonLink href={secondary.href} variant="secondary" icon={SlidersHorizontal}>
                {secondary.label}
              </ButtonLink>
            </div>
            <InstallCommand className="w-full max-w-[24rem] text-white" />
          </div>
        </div>
        <dl className="site-rise mt-12 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-white/12 pt-6 [--i:3] sm:grid-cols-4">
          {facts.map(([term, value]) => (
            <div key={term}>
              <dt className="font-mono text-[0.72rem] tracking-[0.14em] text-site-deep-muted uppercase">{term}</dt>
              <dd className="mt-1 font-display text-[1.35rem] font-bold tracking-[-0.02em] tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/** "Who it's for": a short paragraph beside a list of the situations the page answers. */
export function WhoFor({ title, children, points }: { title: string; children: ReactNode; points: string[] }) {
  return (
    <section aria-labelledby="who" className="site-col pt-20 md:pt-28">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
        <SectionHead id="who" label="Who it's for" title={title} className="mb-0 md:mb-0">
          {children}
        </SectionHead>
        <ul className="flex flex-col gap-3 self-end">
          {points.map((point) => (
            <li key={point} className="site-card flex gap-3 p-4 sm:p-5" data-reveal>
              <Check size={20} className="mt-0.5 shrink-0 text-site-ok" aria-hidden="true" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function CellText({ cell }: { cell: Cell }) {
  const text = typeof cell === 'string' ? cell : cell.text;
  const refs = typeof cell === 'string' ? [] : cell.src;
  return (
    <>
      {text === 'Not yet' ? (
        <span className="inline-flex rounded-full bg-site-mark px-2.5 py-0.5 text-[0.85rem] font-semibold text-site-ink">
          Not yet
        </span>
      ) : (
        text
      )}
      {refs.map((ref) => (
        <a
          key={ref}
          href={`#source-${ref}`}
          className="ms-1 align-super text-[0.72rem] font-semibold text-site-accent no-underline hover:underline"
          aria-label={`Source ${ref}`}
        >
          [{ref}]
        </a>
      ))}
    </>
  );
}

/** The sourced comparison: a table whose first column is Post Canvas, then the numbered source list. */
export function CompareTable({
  title,
  intro,
  columns,
  rows,
  sources,
  checked = 'November 19, 2026',
}: {
  title: string;
  intro: ReactNode;
  columns: string[];
  rows: CompareRow[];
  sources: Source[];
  checked?: string;
}) {
  return (
    <section aria-labelledby="compare" className="site-col pt-20 md:pt-28">
      <div className="site-panel site-bleed px-5 py-12 sm:px-10 md:py-16 lg:px-14">
        <SectionHead id="compare" label="Compare" title={title}>
          {intro} Checked against each project&apos;s own pages on {checked}; the numbers link to them.
        </SectionHead>
        <div
          className="-mx-5 overflow-x-auto px-5 sm:-mx-10 sm:px-10 lg:mx-0 lg:px-0"
          role="region"
          aria-label="Comparison table, scrolls sideways"
          tabIndex={0}
        >
          <table className={cn('site-table', columns.length <= 3 && 'min-w-[40rem]')}>
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">Feature</span>
                </th>
                {columns.map((name, index) => (
                  <th key={name} scope="col" data-ours={index === 0 ? '' : undefined}>
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.feature}>
                  <th scope="row">{row.feature}</th>
                  {row.cells.map((cell, index) => (
                    <td key={index} data-ours={index === 0 ? '' : undefined}>
                      <CellText cell={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <SourceList sources={sources} />
      </div>
    </section>
  );
}

export function SourceList({ sources }: { sources: Source[] }) {
  return (
    <div className="mt-10">
      <h3 className="site-h3 mb-4">Sources</h3>
      <ol className="gap-x-8 text-[0.92rem] md:columns-2 [&>li]:mb-2 [&>li]:break-inside-avoid">
        {sources.map((source, index) => (
          <li key={source.href} id={`source-${index + 1}`} className="flex scroll-mt-24 gap-2">
            <span className="font-mono text-site-muted tabular-nums">[{index + 1}]</span>
            {source.href.startsWith('/') ? (
              <Link href={source.href} className="text-site-accent underline-offset-4 hover:underline">
                {source.label}
              </Link>
            ) : (
              <a href={source.href} className="text-site-accent underline-offset-4 hover:underline">
                {source.label}
              </a>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** A section with the site's heading pattern, for the demo, code and migration parts of a page. */
export function SeoSection({
  id,
  label,
  title,
  intro,
  children,
  boxed,
  anchor,
}: {
  id: string;
  /** An id for the section itself, so the hero can link to it: `demo`. */
  anchor?: string;
  label: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
  boxed?: 'panel' | 'deep';
}) {
  const inner = (
    <>
      <SectionHead id={id} label={label} numbered title={title}>
        {intro}
      </SectionHead>
      {children}
    </>
  );
  return (
    <section aria-labelledby={id} className="site-col scroll-mt-20 pt-20 md:pt-28" id={anchor}>
      {boxed ? (
        <div
          className={cn(
            'site-bleed px-5 py-12 sm:px-10 md:py-16 lg:px-14',
            boxed === 'panel' ? 'site-panel' : 'site-deep site-dots',
          )}
        >
          {inner}
        </div>
      ) : (
        inner
      )}
    </section>
  );
}

/** "What X does that Post Canvas doesn't (yet)": honest gaps, each with the reason it matters. */
export function GapList({ items }: { items: { title: string; body: ReactNode }[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {items.map((item) => (
        <li key={item.title} className="site-card p-5 sm:p-6" data-reveal>
          <p className="mb-2 flex items-center gap-2 font-semibold">
            <span className="inline-flex rounded-full bg-site-mark px-2.5 py-0.5 text-[0.78rem] font-semibold text-site-ink">
              Not yet
            </span>
            {item.title}
          </p>
          <p className="text-site-muted">{item.body}</p>
        </li>
      ))}
    </ul>
  );
}

export interface Faq {
  question: string;
  answer: string;
}

export function FaqSection({ faqs }: { faqs: Faq[] }) {
  return (
    <section aria-labelledby="faq" className="site-col pt-20 md:pt-28">
      <div className="grid grid-cols-1 gap-8 border-t border-site-border pt-16 md:pt-20 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-10">
        <SectionHead id="faq" label="FAQ" title="Questions" className="lg:mb-0 lg:block" />
        <div className="site-faq border-t border-site-border">
          {faqs.map((faq) => (
            <details key={faq.question}>
              <summary>
                {faq.question}
                <Plus size={20} aria-hidden="true" />
              </summary>
              <p className="max-w-[44rem] pb-5 text-site-muted">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

const migrationGuide = {
  label: 'Migration guide',
  href: '/docs/guides/migrating-from-tinymce-froala',
  blurb: 'Convert saved HTML with fromHTML, and what is kept and dropped.',
};

/**
 * Links to the other comparison pages, so each one passes readers (and crawlers) to the rest, plus one guide. Five
 * pages and one guide fill two rows of three.
 */
export function RelatedPages({
  current,
  extra = [migrationGuide],
}: {
  current: SeoSlug;
  extra?: { label: string; href: string; blurb: string }[];
}) {
  const links = [
    ...seoPages
      .filter((page) => page.slug !== current)
      .map((page) => ({ label: page.short, href: `/${page.slug}`, blurb: page.blurb })),
    ...extra,
  ];
  return (
    <section aria-labelledby="related" className="site-col pt-20 md:pt-28">
      <SectionHead id="related" label="Compare more" title="Other comparisons and guides" />
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <li key={link.href} className="flex">
            <Link href={link.href} className="site-card group flex w-full flex-col gap-2 p-5 sm:p-6">
              <span className="flex items-center justify-between gap-3 font-display text-[1.2rem] font-semibold tracking-[-0.015em]">
                {link.label}
                <ArrowUpRight
                  size={20}
                  aria-hidden="true"
                  className="shrink-0 text-site-accent transition-transform duration-300 ease-(--ease-out) group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </span>
              <span className="text-site-muted">{link.blurb}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The closing call to action, the same blue box as the home page. */
export function SeoCta({ title, body }: { title: string; body: string }) {
  return (
    <section aria-labelledby="cta" className="site-col pt-20 md:pt-28">
      <div className="site-cta site-bleed flex flex-col gap-8 overflow-hidden px-6 py-12 sm:px-10 md:py-16 lg:flex-row lg:items-end lg:justify-between lg:px-14">
        <div className="max-w-[40rem]" data-reveal>
          <h2 id="cta" className="site-h2">
            {title}
          </h2>
          <p className="mt-4 text-[1.1rem] text-white/85">{body}</p>
          <InstallCommand className="mt-6 w-full max-w-[22rem] text-white" />
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/docs/getting-started">Get started</ButtonLink>
          <ButtonLink href="/playground" variant="secondary" icon={SlidersHorizontal}>
            Open the playground
          </ButtonLink>
          <ButtonLink href="/docs" variant="secondary" icon={BookOpen}>
            Read the docs
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
