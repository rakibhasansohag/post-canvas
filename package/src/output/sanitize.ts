// The document sanitizer. Pure: no DOM, no React, safe on the server and in edge runtimes. It walks untrusted Tiptap
// JSON, keeps only what the schema knows, runs every extension's `postCanvasSanitize`, drops transient editor state,
// enforces size caps, and rebuilds the result through ProseMirror so it is guaranteed to fit the schema.
import { getSchema, type AnyExtension, type JSONContent } from '@tiptap/core';
import { Mark, type MarkType, type Node as PMNode, type NodeType, type Schema } from '@tiptap/pm/model';
import { defaultFeatures } from '../core/features';
import { sanitizersFor } from '../core/registry';
import { postCanvasSchema } from '../core/schema';
import type { AttrsSanitizer, Features } from '../core/types';
import { safeHref, safeMediaSrc } from '../core/url';

/** Size caps for a document. Anything over a cap is cut and reported. */
export interface DocumentLimits {
  /** Most nodes, text nodes included. Default 20,000. */
  maxNodes: number;
  /** Deepest nesting, the doc being depth 0. Default 48. */
  maxDepth: number;
  /** Most characters of text in the whole document. Default 500,000. */
  maxTextLength: number;
}

/** The default caps. */
export const defaultLimits: DocumentLimits = { maxNodes: 20_000, maxDepth: 48, maxTextLength: 500_000 };

/** Why the sanitizer removed or changed something. */
export type SanitizeReason =
  | 'not-a-document'
  | 'invalid-node'
  | 'unknown-node'
  | 'unknown-mark'
  | 'rejected'
  | 'invalid-attrs'
  | 'transient'
  | 'invalid-content'
  | 'limit-nodes'
  | 'limit-depth'
  | 'limit-text';

/** One thing the sanitizer removed or cut, with where it was. */
export interface SanitizeRemoval {
  /** A path into the input, such as `doc.content[2].content[0]`. */
  path: string;
  reason: SanitizeReason;
  /** The node or mark type, when there was one. */
  type?: string;
}

/** Options of `sanitizeDocument()`. */
export interface SanitizeOptions {
  /** The features the document may use. Default: every feature. Nodes for features that are off are removed. */
  features?: Features;
  /** Size caps. Missing keys use `defaultLimits`. */
  limits?: Partial<DocumentLimits>;
  /** Use these schema extensions instead of `postCanvasSchema(features)`, for a custom set of nodes. */
  extensions?: AnyExtension[];
}

/** What `sanitizeDocument()` returns. */
export interface SanitizeResult {
  /** A clean document that fits the schema. Always a `doc`, with at least one block. */
  doc: JSONContent;
  /** Everything that was removed or cut. Empty for a document that was already clean. */
  removed: SanitizeRemoval[];
}

interface Setup {
  schema: Schema;
  sanitizers: Record<string, AttrsSanitizer>;
}

const setupCache = new Map<string, Setup>();
const extensionCache = new WeakMap<AnyExtension[], Setup>();

function buildSetup(extensions: AnyExtension[]): Setup {
  return { schema: getSchema(extensions), sanitizers: sanitizersFor(extensions) };
}

/** The schema and sanitizers for a feature set, built once per distinct set. */
export function sanitizerSetup(options: Pick<SanitizeOptions, 'features' | 'extensions'> = {}): Setup {
  if (options.extensions) {
    const cached = extensionCache.get(options.extensions);
    if (cached) return cached;
    const setup = buildSetup(options.extensions);
    extensionCache.set(options.extensions, setup);
    return setup;
  }
  const features = options.features ?? defaultFeatures;
  const key = JSON.stringify(features);
  let setup = setupCache.get(key);
  if (!setup) {
    setup = buildSetup(postCanvasSchema(features));
    if (setupCache.size > 50) setupCache.clear();
    setupCache.set(key, setup);
  }
  return setup;
}

/** Node types that only exist while editing. */
const transientNodes = new Set(['embedInput']);
/** Attributes that only exist while editing. */
const transientAttrs = new Set(['uploadKey']);
/** Longest attribute string kept for nodes and marks without their own sanitizer. */
const maxAttrString = 10_000;

type Plain = Record<string, unknown>;

function isPlain(value: unknown): value is Plain {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value) as unknown;
  return proto === Object.prototype || proto === null;
}

function isPrimitive(value: unknown): value is string | number | boolean | null {
  return (
    value === null ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value)) ||
    (typeof value === 'string' && value.length <= maxAttrString)
  );
}

/** A JSON-only deep copy: drops functions, prototypes and anything JSON can't hold. */
function jsonCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

interface Walk {
  setup: Setup;
  limits: DocumentLimits;
  removed: SanitizeRemoval[];
  nodes: number;
  text: number;
  hitNodes: boolean;
  hitText: boolean;
}

function remove(walk: Walk, path: string, reason: SanitizeReason, type?: string): void {
  walk.removed.push(type ? { path, reason, type } : { path, reason });
}

/**
 * Cleans attributes against the declared attribute names. With a sanitizer, its output is trusted for types but still
 * copied and filtered; without one, only primitives and arrays of primitives are kept, and URL-like attributes are
 * checked. Returns `null` when the node or mark must go.
 */
function cleanAttrs(
  walk: Walk,
  declared: Record<string, unknown>,
  sanitizer: AttrsSanitizer | undefined,
  raw: unknown,
  path: string,
  type: string,
): { attrs: Plain; transient: boolean } | null {
  const input: Plain = isPlain(raw) ? { ...raw } : {};
  let source: Plain = input;
  if (sanitizer) {
    let result: Record<string, unknown> | null;
    try {
      result = sanitizer(input);
    } catch {
      result = null;
    }
    if (!result) {
      remove(walk, path, transientNodes.has(type) ? 'transient' : 'rejected', type);
      return null;
    }
    source = jsonCopy(result);
  }

  const attrs: Plain = {};
  let transient = false;
  for (const name of Object.keys(declared)) {
    if (!Object.hasOwn(source, name)) continue;
    let value = source[name];
    if (value === undefined) continue;
    if (transientAttrs.has(name)) {
      if (value !== null) transient = true;
      attrs[name] = null;
      continue;
    }
    if (!sanitizer && !isPrimitive(value) && !(Array.isArray(value) && value.every(isPrimitive))) continue;
    if (typeof value === 'string' && /^\s*blob:/i.test(value)) {
      remove(walk, path, 'transient', type);
      return null;
    }
    if (name === 'href') value = safeHref(value);
    else if (name === 'src') value = safeMediaSrc(value);
    attrs[name] = value;
  }
  return { attrs, transient };
}

function cleanMarks(walk: Walk, raw: unknown, path: string, parent: NodeType): Mark[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const { schema, sanitizers } = walk.setup;
  let set: readonly Mark[] = Mark.none;
  raw.slice(0, 20).forEach((item: unknown, index) => {
    const markPath = `${path}.marks[${index}]`;
    if (!isPlain(item) || typeof item.type !== 'string') {
      remove(walk, markPath, 'unknown-mark');
      return;
    }
    const type: MarkType | undefined = schema.marks[item.type];
    if (!type) {
      remove(walk, markPath, 'unknown-mark', item.type);
      return;
    }
    if (!parent.allowsMarkType(type)) {
      remove(walk, markPath, 'invalid-content', item.type);
      return;
    }
    const cleaned = cleanAttrs(walk, type.spec.attrs ?? {}, sanitizers[item.type], item.attrs, markPath, item.type);
    if (!cleaned) return;
    if ('href' in (type.spec.attrs ?? {}) && cleaned.attrs.href == null) {
      remove(walk, markPath, 'invalid-attrs', item.type);
      return;
    }
    try {
      set = type.create(cleaned.attrs).addToSet(set);
    } catch {
      remove(walk, markPath, 'invalid-attrs', item.type);
    }
  });
  return [...set];
}

/** Cleans one input node into zero or more PM nodes (unknown wrappers unwrap into their children). */
function cleanNode(walk: Walk, raw: unknown, path: string, depth: number, parent: NodeType): PMNode[] {
  const { schema, sanitizers } = walk.setup;
  if (!isPlain(raw) || typeof raw.type !== 'string') {
    remove(walk, path, 'invalid-node');
    return [];
  }
  if (depth > walk.limits.maxDepth) {
    remove(walk, path, 'limit-depth', raw.type);
    return [];
  }
  if (walk.nodes >= walk.limits.maxNodes) {
    if (!walk.hitNodes) remove(walk, path, 'limit-nodes', raw.type);
    walk.hitNodes = true;
    return [];
  }
  walk.nodes++;

  if (raw.type === 'text') {
    if (typeof raw.text !== 'string' || raw.text === '') return [];
    const room = walk.limits.maxTextLength - walk.text;
    if (room <= 0) {
      if (!walk.hitText) remove(walk, path, 'limit-text', 'text');
      walk.hitText = true;
      return [];
    }
    let value = raw.text;
    if (value.length > room) {
      value = value.slice(0, room);
      remove(walk, path, 'limit-text', 'text');
      walk.hitText = true;
    }
    walk.text += value.length;
    return [schema.text(value, cleanMarks(walk, raw.marks, path, parent))];
  }

  const type: NodeType | undefined = schema.nodes[raw.type];
  if (!type || type === schema.topNodeType) {
    remove(walk, path, 'unknown-node', raw.type);
    // Keep the content of an unknown wrapper, such as a <span>-like inline node or a section around paragraphs.
    return Array.isArray(raw.content) ? cleanChildren(walk, raw.content, path, depth, parent) : [];
  }

  const cleaned = cleanAttrs(walk, type.spec.attrs ?? {}, sanitizers[raw.type], raw.attrs, path, raw.type);
  if (!cleaned) return [];
  if (cleaned.transient) remove(walk, path, 'transient', raw.type);

  const children = type.isLeaf || !Array.isArray(raw.content) ? [] : cleanChildren(walk, raw.content, path, depth, type);
  const node = fit(walk, type, cleaned.attrs, children, cleanMarks(walk, raw.marks, path, parent), path);
  return node ? [node] : [];
}

/** Cleans a content array. Inline runs that land in a block container are wrapped in a paragraph. */
function cleanChildren(walk: Walk, raw: unknown[], path: string, depth: number, parent: NodeType): PMNode[] {
  const { schema } = walk.setup;
  const out: PMNode[] = [];
  let run: PMNode[] = [];
  const paragraph = schema.nodes.paragraph;
  const flush = () => {
    if (run.length === 0) return;
    const wrapped = paragraph ? fit(walk, paragraph, {}, run, [], path) : null;
    if (wrapped) out.push(wrapped);
    else remove(walk, path, 'invalid-content');
    run = [];
  };
  raw.forEach((child, index) => {
    for (const node of cleanNode(walk, child, `${path}.content[${index}]`, depth + 1, parent)) {
      if (node.isInline && !parent.inlineContent) run.push(node);
      else {
        flush();
        out.push(node);
      }
    }
  });
  flush();
  return out;
}

/** Builds a node from cleaned children, keeping the longest prefix-compatible sequence and filling what's required. */
function fit(walk: Walk, type: NodeType, attrs: Plain, children: PMNode[], marks: Mark[], path: string): PMNode | null {
  let match = type.contentMatch;
  const kept: PMNode[] = [];
  for (const child of children) {
    const next = match.matchType(child.type);
    if (next && type.allowsMarks(child.marks)) {
      kept.push(child);
      match = next;
    } else {
      remove(walk, path, 'invalid-content', child.type.name);
    }
  }
  try {
    const node = type.createAndFill(attrs, kept, marks);
    if (node) return node;
  } catch {
    // Attributes the type refuses, such as a wrong value type.
  }
  remove(walk, path, 'invalid-content', type.name);
  return null;
}

/**
 * Cleans an untrusted document so it is safe to store and render. Run it on every document that came from a client
 * before you show it to anyone else, and before `renderToHTML(..., { sanitize: false })`.
 *
 * It removes unknown nodes and marks (keeping the text of unknown inline wrappers), runs each extension's
 * `postCanvasSanitize` (which checks URLs and rebuilds embeds from their ids), removes transient editor state (the
 * paste-a-link field, upload keys and `blob:` sources), cuts the document at the size caps, and finally rebuilds it
 * through the ProseMirror schema and checks it. Pure and synchronous, with no DOM.
 *
 * @example
 * ```ts
 * import { sanitizeDocument } from 'post-canvas/server';
 * const { doc, removed } = sanitizeDocument(request.body.content);
 * ```
 */
export function sanitizeDocument(json: unknown, options: SanitizeOptions = {}): SanitizeResult {
  const setup = sanitizerSetup(options);
  const walk: Walk = {
    setup,
    limits: { ...defaultLimits, ...options.limits },
    removed: [],
    nodes: 0,
    text: 0,
    hitNodes: false,
    hitText: false,
  };
  const { schema } = setup;
  const top = schema.topNodeType;

  let content: unknown[] = [];
  if (isPlain(json) && json.type === top.name) {
    content = Array.isArray(json.content) ? json.content : [];
  } else {
    remove(walk, 'doc', 'not-a-document', isPlain(json) && typeof json.type === 'string' ? json.type : undefined);
  }

  const children = cleanChildren(walk, content, 'doc', 0, top);
  let doc = fit(walk, top, {}, children, [], 'doc') ?? top.createAndFill();
  if (!doc) throw new Error('[post-canvas] The schema has no valid empty document.');
  try {
    doc.check();
  } catch {
    // A block an attribute validator refused: keep only the top-level blocks that pass on their own.
    const passing = children.filter((child, index) => {
      try {
        child.check();
        return true;
      } catch {
        remove(walk, `doc.content[${index}]`, 'invalid-attrs', child.type.name);
        return false;
      }
    });
    doc = fit(walk, top, {}, passing, [], 'doc') ?? top.createAndFill() ?? doc;
    doc.check();
  }
  return { doc: doc.toJSON() as JSONContent, removed: walk.removed };
}
