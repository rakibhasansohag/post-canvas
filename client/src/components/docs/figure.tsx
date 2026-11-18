import type { ReactNode } from 'react';
import { basePath } from '@/lib/shared';
import { featureShots, type FeatureShotName } from './feature-shots';
import './docs.css';

// The site is a static export with unoptimized images, so next/image would render the same plain img. The files are
// already compressed WebP at 2x, with their real sizes set.
/* eslint-disable @next/next/no-img-element */

/**
 * A feature screenshot from `public/features`, in the theme the reader is using. The files are 2x, so the frame is half
 * their pixel width at most. `eager` is for a screenshot near the top of a page, which can be the largest paint.
 *
 * `<Figure name="gallery-collage" caption="The collage layout." />`
 */
export function Figure({
  name,
  caption,
  alt,
  maxWidth,
  eager = false,
  theme,
}: {
  name: FeatureShotName;
  caption?: ReactNode;
  alt?: string;
  /** The widest the screenshot shows, in CSS pixels. Defaults to half its pixel width. */
  maxWidth?: number;
  eager?: boolean;
  /** Show only the light or the dark file, whatever the site theme. */
  theme?: 'light' | 'dark';
}) {
  const shot = featureShots[name];
  const text = alt ?? shot.alt;
  const loading = eager ? 'eager' : 'lazy';
  if (theme) {
    const [width, height] = shot[theme];
    return (
      <figure className="docs-figure not-prose">
        <span className="docs-figure__frame" style={{ maxWidth: maxWidth ?? width / 2 }}>
          <img
            className="docs-figure__img"
            src={`${basePath}/features/${name}${theme === 'dark' ? '-dark' : ''}.webp`}
            width={width}
            height={height}
            alt={text}
            loading={loading}
            decoding="async"
          />
        </span>
        {caption ? <figcaption>{caption}</figcaption> : null}
      </figure>
    );
  }
  return (
    <figure className="docs-figure not-prose">
      <span className="docs-figure__frame" style={{ maxWidth: maxWidth ?? shot.light[0] / 2 }}>
        <img
          className="docs-figure__img docs-figure__img--light"
          src={`${basePath}/features/${name}.webp`}
          width={shot.light[0]}
          height={shot.light[1]}
          alt={text}
          loading={loading}
          decoding="async"
        />
        <img
          className="docs-figure__img docs-figure__img--dark"
          src={`${basePath}/features/${name}-dark.webp`}
          width={shot.dark[0]}
          height={shot.dark[1]}
          alt={text}
          loading="lazy"
          decoding="async"
        />
      </span>
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}

/** Two figures side by side from 640px, stacked below. */
export function Figures({ children }: { children: ReactNode }) {
  return <div className="docs-figures">{children}</div>;
}
