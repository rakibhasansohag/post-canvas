import type { ViewProps } from '../../core/types';
import { imageAttrsOf } from '../coerce';
import { imageSpec } from '../html';
import { specToReact } from './spec-to-react';

/** The read-only `image`: the same `figure > img + figcaption` as its static HTML. */
export function ImageView({ node }: ViewProps) {
  return specToReact(imageSpec(imageAttrsOf(node.attrs)));
}
