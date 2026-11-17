'use client';
// Owner: chat A (media canvas). Wave-0 stub that renders nothing. Replace with the real cover picker.
import type { CoverImage } from '../../core/types';

/** Props of `CoverField`. */
export interface CoverFieldProps {
  value: CoverImage | null;
  onChange(value: CoverImage | null): void;
  disabled?: boolean;
}

/** Picks, uploads and edits a post's cover picture. */
export function CoverField(_props: CoverFieldProps) {
  return null;
}
