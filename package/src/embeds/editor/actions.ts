// Turning a link into the right node, in the editor: a video, an embed, a link card, or a plain link. Every lookup goes
// through the app's adapters and is bounded by a timeout, and every result is cleaned before it touches the document.
import type { Editor, JSONContent } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { createId, createKey } from '../../core/ids';
import { safeHttpUrl } from '../../core/url';
import { sanitizeEmbedAttrs, sanitizeLinkCardAttrs } from '../attrs';
import { matchEmbedUrl, parseEmbedUrl, parseVideoUrl } from '../providers/index';
import { canonicalVideoUrl, isVideoThumbnail } from '../providers/video';
import { allowedEmbedProviders } from '../schema';
import { abortLookup, setPending } from './storage';

/** What kind of link a paste-a-link field asks for. `any` tries video, then embed, then link card. */
export type EmbedInputKind = 'any' | 'video' | 'embed' | 'link';

/** How long a metadata or preview lookup may take before it is given up. */
export const lookupTimeoutMs = 10_000;

/** Where a link would go, without changing the document. */
export type LinkTarget =
  | { kind: 'video'; node: JSONContent }
  | { kind: 'embed'; node: JSONContent }
  | { kind: 'link'; url: string }
  | { kind: 'unsupported' }
  | { kind: 'invalid' };

/** Decides what a pasted link becomes, from the editor's features. Pure apart from reading the editor's storage. */
export function classifyLink(editor: Editor, input: string, kind: EmbedInputKind = 'any'): LinkTarget {
  const url = parseEmbedUrl(input);
  if (!url) return { kind: 'invalid' };
  const { features } = editor.storage.postCanvasCore;
  if ((kind === 'any' || kind === 'video') && features.video && editor.schema.nodes.video) {
    const video = parseVideoUrl(url.href);
    if (video) {
      return {
        kind: 'video',
        node: { type: 'video', attrs: { id: createId(), ...video, title: '', description: '', thumbnailUrl: null } },
      };
    }
  }
  if ((kind === 'any' || kind === 'embed') && features.embed && editor.schema.nodes.embed) {
    const match = matchEmbedUrl(url.href, allowedEmbedProviders(features));
    if (match) {
      return {
        kind: 'embed',
        node: {
          type: 'embed',
          attrs: {
            id: createId(),
            provider: match.provider.name,
            ref: match.ref,
            url: match.url,
            title: '',
            aspectRatio: match.provider.aspectRatio,
          },
        },
      };
    }
  }
  if (kind === 'video' || kind === 'embed') return { kind: 'unsupported' };
  const href = safeHttpUrl(url.href);
  return href ? { kind: 'link', url: href } : { kind: 'invalid' };
}

/** The position and node of the block with this `id`, or `null` once it's gone. */
export function findById(editor: Editor, id: string): { pos: number; node: PMNode } | null {
  let found: { pos: number; node: PMNode } | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (found) return false;
    if (node.attrs.id === id) {
      found = { pos, node };
      return false;
    }
    return !node.isAtom;
  });
  return found;
}

/** A paragraph holding the URL as a link, or as plain text when links are off. */
export function linkParagraph(editor: Editor, url: string): JSONContent {
  const text: JSONContent = { type: 'text', text: url };
  if (editor.schema.marks.link) text.marks = [{ type: 'link', attrs: { href: url } }];
  return { type: 'paragraph', content: [text] };
}

/** Replaces the block with this id by `content`, keeping the cursor after it. */
export function replaceById(editor: Editor, id: string, content: JSONContent, focus = true): boolean {
  const target = findById(editor, id);
  if (!target) return false;
  const range = { from: target.pos, to: target.pos + target.node.nodeSize };
  const chain = editor.chain();
  if (focus) chain.focus();
  return chain.insertContentAt(range, content).run();
}

/** Patches attributes of the node with this id, outside the undo history. */
export function patchById(editor: Editor, id: string, patch: Record<string, unknown>): void {
  const target = findById(editor, id);
  if (!target || editor.isDestroyed) return;
  const tr = editor.state.tr.setNodeMarkup(target.pos, undefined, { ...target.node.attrs, ...patch });
  editor.view.dispatch(tr.setMeta('addToHistory', false));
}

function withTimeout(signal: AbortSignal): AbortSignal {
  return AbortSignal.any([signal, AbortSignal.timeout(lookupTimeoutMs)]);
}

/**
 * Fills an empty video or embed title (and a video's description and thumbnail) from `adapters.embeds`, if the app
 * gave one. Never overwrites what the writer typed. Best effort: failures leave the node as it is.
 */
export async function fetchEmbedMetadata(editor: Editor, node: JSONContent): Promise<void> {
  const resolver = editor.storage.postCanvasCore.adapters.embeds;
  const attrs = node.attrs ?? {};
  const id = typeof attrs.id === 'string' ? attrs.id : null;
  if (!resolver || !id) return;
  const url =
    node.type === 'video'
      ? canonicalVideoUrl({
          provider: attrs.provider as 'youtube' | 'vimeo',
          videoId: String(attrs.videoId),
          hash: (attrs.hash as string | null) ?? null,
          vertical: attrs.vertical === true,
          start: null,
        })
      : String(attrs.url);
  const controller = new AbortController();
  setPending(editor, id, true, controller);
  try {
    const found = await resolver(url, { signal: withTimeout(controller.signal) });
    const current = findById(editor, id);
    if (!current) return;
    const patch: Record<string, unknown> = {};
    if (!current.node.attrs.title && typeof found.title === 'string') patch.title = found.title.slice(0, 200);
    if (node.type === 'video') {
      if (!current.node.attrs.description && typeof found.description === 'string') {
        patch.description = found.description.slice(0, 1000);
      }
      if (isVideoThumbnail(current.node.attrs.provider as 'youtube' | 'vimeo', found.thumbnailUrl)) {
        patch.thumbnailUrl = found.thumbnailUrl;
      }
    } else if (typeof found.aspectRatio === 'number') {
      const clean = sanitizeEmbedAttrs({ ...current.node.attrs, aspectRatio: found.aspectRatio }, [
        String(current.node.attrs.provider),
      ]);
      if (clean) patch.aspectRatio = clean.aspectRatio;
    }
    if (Object.keys(patch).length > 0) patchById(editor, id, patch);
  } catch {
    // Metadata is optional: the node already works without it.
  } finally {
    setPending(editor, id, false);
  }
}

/** Why a link card lookup failed, as a message key. */
function failureKey(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : error instanceof Error ? error.message : '';
  if (code === 'not_found') return 'embeds.input.notFound';
  if (code === 'not_embeddable' || code === 'blocked') return 'embeds.input.notEmbeddable';
  return 'embeds.input.failed';
}

/** Looks up a link card through `adapters.links`, or throws a message key. */
export async function fetchLinkCard(editor: Editor, id: string, url: string): Promise<JSONContent> {
  const resolver = editor.storage.postCanvasCore.adapters.links;
  if (!resolver) throw new Error('embeds.input.unsupported');
  const controller = new AbortController();
  setPending(editor, id, true, controller);
  try {
    const preview = await resolver(url, { signal: withTimeout(controller.signal) });
    const attrs = sanitizeLinkCardAttrs({ ...preview, url: safeHttpUrl(preview.url) ?? url, id: createId() });
    if (!attrs) throw new Error('embeds.input.failed');
    return { type: 'linkCard', attrs };
  } catch (error) {
    if (controller.signal.aborted) throw new Error('aborted', { cause: error });
    throw new Error(failureKey(error), { cause: error });
  } finally {
    setPending(editor, id, false);
  }
}

/**
 * Submits a paste-a-link field: turns it into a video, an embed, a link card (looked up through `adapters.links`) or a
 * paragraph with the link. Errors stay in the field, with a retry.
 */
export async function submitEmbedInput(editor: Editor, id: string, value: string, kind: EmbedInputKind): Promise<void> {
  const { t, features, adapters } = editor.storage.postCanvasCore;
  const target = classifyLink(editor, value, kind);
  if (target.kind === 'invalid' || target.kind === 'unsupported') {
    const key = target.kind === 'invalid' ? 'embeds.input.invalid' : 'embeds.input.unsupported';
    patchById(editor, id, { value, status: 'error', error: key });
    editor.storage.postCanvasCore.notify(t(key), 'error');
    return;
  }
  if (target.kind === 'video' || target.kind === 'embed') {
    replaceById(editor, id, target.node);
    void fetchEmbedMetadata(editor, target.node);
    return;
  }
  if (features.linkCard && adapters.links && editor.schema.nodes.linkCard && kind !== 'video' && kind !== 'embed') {
    patchById(editor, id, { value, status: 'loading', error: null });
    try {
      const card = await fetchLinkCard(editor, id, target.url);
      replaceById(editor, id, card);
    } catch (error) {
      const key = error instanceof Error ? error.message : 'embeds.input.failed';
      if (key === 'aborted') return;
      patchById(editor, id, { value, status: 'error', error: key });
      editor.storage.postCanvasCore.notify(t(key), 'error');
    }
    return;
  }
  replaceById(editor, id, linkParagraph(editor, target.url));
}

/** Cancels a paste-a-link field: aborts its lookup and removes it, leaving an empty paragraph if the doc would be empty. */
export function cancelEmbedInput(editor: Editor, id: string): void {
  const target = findById(editor, id);
  if (!target) return;
  abortLookup(editor, id);
  setPending(editor, id, false);
  editor
    .chain()
    .focus()
    .deleteRange({ from: target.pos, to: target.pos + target.node.nodeSize })
    .run();
}

/** A new paste-a-link field's content. */
export function embedInputContent(kind: EmbedInputKind = 'any', value = ''): JSONContent {
  return { type: 'embedInput', attrs: { id: createKey('link-'), value, kind, status: 'idle', error: null } };
}
