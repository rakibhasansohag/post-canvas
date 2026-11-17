// Document validation for the app's server: is this JSON a clean, savable Post Canvas document? Pure, no DOM.
import type { Features } from '../core/types';
import { hasTransientContent } from '../output/text';
import { sanitizeDocument, sanitizerSetup, type DocumentLimits, type SanitizeReason } from '../output/sanitize';

/** Why a document failed validation. The sanitizer's reasons, plus `schema` and `changed`. */
export type ValidationCode = SanitizeReason | 'schema' | 'changed';

/** One problem with a document. */
export interface ValidationError {
  /** A path into the document, such as `doc.content[2]`. */
  path: string;
  code: ValidationCode;
  /** An English message for logs and API responses. */
  message: string;
  /** The node or mark type, when there was one. */
  type?: string;
}

/** What `validateDocument()` returns. */
export interface ValidationResult {
  /** `true` when the document is clean and savable exactly as it is. */
  ok: boolean;
  errors: ValidationError[];
}

/** Options of `validateDocument()`. */
export interface ValidateOptions {
  features?: Features;
  limits?: Partial<DocumentLimits>;
}

const messages: Record<ValidationCode, string> = {
  'not-a-document': 'The value is not a document.',
  'invalid-node': 'A node is malformed.',
  'unknown-node': 'A node type is unknown or turned off.',
  'unknown-mark': 'A mark type is unknown or turned off.',
  rejected: 'A node or mark has attributes that are not allowed.',
  'invalid-attrs': 'A node or mark has invalid attributes.',
  transient: 'The document still holds editor-only state: an open link field, a running upload or a local file.',
  'invalid-content': 'A node is in a place the schema does not allow.',
  'limit-nodes': 'The document has too many nodes.',
  'limit-depth': 'The document is nested too deeply.',
  'limit-text': 'The document has too much text.',
  schema: 'The document does not fit the schema.',
  changed: 'The document would change when sanitized, for example a URL or text that is not allowed.',
};

function error(path: string, code: ValidationCode, type?: string): ValidationError {
  return type ? { path, code, message: messages[code], type } : { path, code, message: messages[code] };
}

/** The path of the first place two JSON values differ, or `null` when they are equal. */
function firstDifference(a: unknown, b: unknown, path: string): string | null {
  if (Object.is(a, b)) return null;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return path;
  if (Array.isArray(a) !== Array.isArray(b)) return path;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    const left = (a as Record<string, unknown>)[key];
    const right = (b as Record<string, unknown>)[key];
    const next = Array.isArray(a) ? `${path}[${key}]` : key === 'content' ? `${path}.content` : `${path}.${key}`;
    const found = firstDifference(left, right, next);
    if (found) return found;
  }
  return null;
}

/**
 * Checks a document from a client before you save it: the schema, the size caps, the attribute rules and transient
 * editor state. `ok` is `true` only when `sanitizeDocument()` would leave it exactly as it is. Pure and synchronous,
 * with no DOM.
 *
 * @example
 * ```ts
 * import { validateDocument } from 'post-canvas/server';
 * const { ok, errors } = validateDocument(body.content, { features });
 * if (!ok) return Response.json({ errors }, { status: 422 });
 * ```
 */
export function validateDocument(json: unknown, options: ValidateOptions = {}): ValidationResult {
  const { doc, removed, omitted } = sanitizeDocument(json, options);
  const errors = removed.map((item) => error(item.path, item.reason, item.type));
  // The sanitizer lists at most 100 removals; say that there were more.
  if (omitted > 0)
    errors.push({ ...error('doc', 'invalid-node'), message: `${omitted} more problems were not listed.` });
  // hasTransientContent walks without recursion and skips anything malformed, so it is safe on raw input.
  const flagged = errors.some((item) => item.code === 'transient');
  if (!flagged && json && typeof json === 'object' && hasTransientContent(json)) {
    errors.push(error('doc', 'transient'));
  }
  if (errors.length === 0) {
    const { schema } = sanitizerSetup(options);
    try {
      const strict = schema.nodeFromJSON(json);
      strict.check();
      const difference = firstDifference(strict.toJSON(), doc, 'doc');
      if (difference) errors.push(error(difference, 'changed'));
    } catch {
      errors.push(error('doc', 'schema'));
    }
  }
  return { ok: errors.length === 0, errors };
}
