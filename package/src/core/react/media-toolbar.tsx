'use client';
import type { ReactNode } from 'react';

/** Props of `MediaToolbar`. */
export interface MediaToolbarProps {
  /** Already translated, such as "Tools: Photo". */
  label: string;
  children: ReactNode;
}

/**
 * Small round buttons over a block's top-right corner, shown while the block is hovered or selected. Put `ToolButton`s
 * inside, and pass it to `MediaFrame`'s `toolbar` slot.
 */
export function MediaToolbar({ label, children }: MediaToolbarProps) {
  return (
    <div className="pc-media-toolbar pc-frame__reveal" role="toolbar" aria-label={label}>
      {children}
    </div>
  );
}
