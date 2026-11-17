'use client';
// The click-to-load player: a thumbnail or placeholder until the reader asks for it, then the provider's iframe. No
// third-party request happens before the click, unless consent is "auto".
import { useState, type CSSProperties } from 'react';

/** Props of `EmbedPlayer`. Only strings and numbers, so a Server Component can render it. */
export interface EmbedPlayerProps {
  /** The iframe URL, built from validated ids. */
  src: string;
  /** The iframe's accessible title. */
  playerTitle: string;
  allow: string;
  sandbox: string;
  /** Width divided by height, used when `height` is null. */
  aspectRatio: number | null;
  /** A fixed height in pixels. */
  height: number | null;
  /** The facade button's accessible label, such as "Play Intro on YouTube". */
  label: string;
  /** The provider's name, shown on the facade. */
  badge: string;
  /** A thumbnail from the provider's own image host, or null for a plain placeholder. */
  thumbnail: string | null;
  /** A short consent note on a plain placeholder. */
  note?: string | null;
  /** Show the play icon (videos) instead of the load icon (other embeds). */
  play?: boolean;
  /** `auto` loads the iframe straight away. Default `click`. */
  consent?: 'click' | 'auto';
  /** Called when the iframe replaces the facade. */
  onLoadPlayer?: () => void;
}

/** The style that sizes a player frame from its ratio or fixed height. */
export function frameStyle(aspectRatio: number | null, height: number | null): CSSProperties {
  if (height !== null && height > 0) return { '--pc-embed-height': `${Math.round(height)}px` } as CSSProperties;
  const ratio = aspectRatio !== null && aspectRatio >= 0.2 && aspectRatio <= 5 ? aspectRatio : 16 / 9;
  return { '--pc-embed-ratio': String(Math.round(ratio * 10000) / 10000) } as CSSProperties;
}

function withAutoplay(src: string): string {
  try {
    const url = new URL(src);
    url.searchParams.set('autoplay', '1');
    return url.href;
  } catch {
    return src;
  }
}

/** A provider's player behind a click-to-load facade. */
export function EmbedPlayer(props: EmbedPlayerProps) {
  const { consent = 'click', play = false } = props;
  const [clicked, setClicked] = useState(false);
  const live = clicked || consent === 'auto';
  return (
    <div className="pc-embed-frame" style={frameStyle(props.aspectRatio, props.height)}>
      {live ? (
        <iframe
          src={clicked && play ? withAutoplay(props.src) : props.src}
          title={props.playerTitle}
          allow={props.allow}
          sandbox={props.sandbox}
          referrerPolicy="strict-origin-when-cross-origin"
          loading="lazy"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          className={props.thumbnail ? 'pc-embed-facade' : 'pc-embed-facade pc-embed-facade-plain'}
          aria-label={props.label}
          onClick={() => {
            setClicked(true);
            props.onLoadPlayer?.();
          }}
        >
          {props.thumbnail && (
            <img className="pc-embed-thumb" src={props.thumbnail} alt="" loading="lazy" decoding="async" />
          )}
          <span className={play ? 'pc-embed-play' : 'pc-embed-play pc-embed-load'} aria-hidden="true" />
          <span className="pc-embed-badge">{props.badge}</span>
          {!props.thumbnail && props.note && <span className="pc-embed-note">{props.note}</span>}
        </button>
      )}
    </div>
  );
}
