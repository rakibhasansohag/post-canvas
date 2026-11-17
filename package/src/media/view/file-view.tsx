import type { ViewProps } from '../../core/types';
import { fileAttrsOf } from '../coerce';
import { fileSpec } from '../html';
import { specToReact } from './spec-to-react';

/** The read-only `file`: a card with the file's name, type and size that downloads it. */
export function FileView({ node }: ViewProps) {
  return specToReact(fileSpec(fileAttrsOf(node.attrs)));
}
