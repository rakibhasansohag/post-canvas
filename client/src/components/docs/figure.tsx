import type { ReactNode } from 'react';
import { basePath } from '@/lib/shared';
import { featureShots, type FeatureShotName } from './feature-shots';
import './docs.css';

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
}: {
  name: FeatureShotName;
  caption?: ReactNode;
  alt?: string;
  /** The widest the screenshot shows, in CSS pixels. Defaults to half its pixel width. */
  maxWidth?: number;
  eager?: boolean;
}) {
  const shot = featureShots[name];
  const text = alt ?? shot.alt;
  const loading = eager ? 'eager' : 'lazy';
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
