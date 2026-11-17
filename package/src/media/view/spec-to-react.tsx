// Turns a node's renderHTML output into React elements, so the read-only views draw exactly the static HTML. No hooks:
// it runs in Server Components too.
import type { DOMOutputSpec } from '@tiptap/pm/model';
import { createElement, type CSSProperties, type ReactNode } from 'react';

/** Replaces one element while converting. Return `undefined` to keep the default. */
export type SpecOverride = (
  tag: string,
  props: Record<string, unknown>,
  children: ReactNode[],
) => ReactNode | undefined;

const propNames: Record<string, string> = {
  class: 'className',
  srcset: 'srcSet',
  tabindex: 'tabIndex',
  for: 'htmlFor',
  colspan: 'colSpan',
  rowspan: 'rowSpan',
};

/** `"left: 10%; aspect-ratio: 3 / 2"` as a React style object. Only the first colon splits, so `url(data:…)` survives. */
function styleObject(style: string): CSSProperties {
  const out: Record<string, string> = {};
  for (const declaration of style.split(/;(?![^(]*\))/)) {
    const colon = declaration.indexOf(':');
    if (colon < 0) continue;
    const name = declaration.slice(0, colon).trim();
    const value = declaration.slice(colon + 1).trim();
    if (!name || !value) continue;
    out[name.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase())] = value;
  }
  return out;
}

function toProps(attrs: Record<string, unknown>): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (name === 'style') props.style = styleObject(typeof value === 'string' ? value : '');
    else props[propNames[name] ?? name] = value;
  }
  return props;
}

/** A `DOMOutputSpec` array as React elements. DOM nodes and holes aren't supported: the media specs don't use them. */
export function specToReact(spec: DOMOutputSpec, override?: SpecOverride, key?: string | number): ReactNode {
  if (typeof spec === 'string') return spec;
  if (!Array.isArray(spec)) return null;
  const [tag, second, ...rest] = spec as readonly [string, ...unknown[]];
  const hasAttrs = second !== null && typeof second === 'object' && !Array.isArray(second);
  const attrs = hasAttrs ? (second as Record<string, unknown>) : {};
  const children = (hasAttrs || second === undefined ? rest : [second, ...rest]) as DOMOutputSpec[];
  const props = toProps(attrs);
  if (key !== undefined) props.key = key;
  const kids = children.map((child, index) => specToReact(child, override, index));
  return override?.(tag, props, kids) ?? createElement(tag, props, ...kids);
}
