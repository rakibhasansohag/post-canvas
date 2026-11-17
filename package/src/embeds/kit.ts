// The editor embed extensions: the schema nodes extended with node views, the paste-a-link field, the paste rule,
// insert items and problems.
import { Extension, type AnyExtension, type Editor, type Range } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { AppWindow, Film, Link2 } from 'lucide-react';
import '../core/extension-fields';
import type { Features, InsertItem, Problem } from '../core/types';
import { embedInputContent, type EmbedInputKind } from './editor/actions';
import { EmbedInputView } from './editor/embed-input-view';
import { EmbedNodeView } from './editor/embed-node-view';
import { embedStopEvent } from './editor/frame';
import { LinkCardNodeView } from './editor/link-card-node-view';
import { EmbedPaste } from './editor/paste';
import type { EmbedsStorage } from './editor/storage';
import { VideoNodeView } from './editor/video-node-view';
import { allowedEmbedProviders, createEmbedNode, EmbedInput, LinkCard, Video, type EmbedNodeOptions } from './schema';

/** Whether third-party players load in the editor before a click. */
export type EmbedConsent = 'click' | 'auto';

/** Options of `embedsKit()`. */
export interface EmbedsKitOptions {
  /** `click` (default) shows a placeholder until the writer clicks; `auto` loads players straight away. */
  embedConsent?: EmbedConsent;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    embedInput: {
      /** Opens a paste-a-link field at the cursor. `kind` limits what the link may become. */
      insertEmbedInput: (options?: { kind?: EmbedInputKind; value?: string }) => ReturnType;
    };
  }
}

type EditorNodeOptions = EmbedNodeOptions & { consent: EmbedConsent };

/** Lookups in flight, and what the embeds report before publishing: open link fields and running lookups. */
const EmbedsState = Extension.create<{ consent: EmbedConsent }, EmbedsStorage>({
  name: 'postCanvasEmbeds',

  addOptions() {
    return { consent: 'click' };
  },

  addStorage() {
    return { pending: new Set<string>(), controllers: new Map<string, AbortController>(), consent: this.options.consent };
  },

  onDestroy() {
    for (const controller of this.storage.controllers.values()) controller.abort();
  },

  postCanvasProblems() {
    const { t } = this.editor.storage.postCanvasCore;
    const problems: Problem[] = [];
    const fields = new Set<string>();
    this.editor.state.doc.descendants((node) => {
      if (node.type.name === 'embedInput') {
        const id = String(node.attrs.id ?? '');
        fields.add(id);
        const loading = node.attrs.status === 'loading';
        problems.push({
          code: loading ? 'embeds.loading' : 'embeds.unresolved',
          message: t(loading ? 'embeds.problem.loading' : 'embeds.problem.unresolved'),
          severity: 'error',
          nodeId: id,
        });
      }
      return !node.isAtom;
    });
    for (const id of this.storage.pending) {
      if (fields.has(id) || id.startsWith('paste-')) continue;
      problems.push({ code: 'embeds.loading', message: t('embeds.problem.loading'), severity: 'warning', nodeId: id });
    }
    return problems;
  },
});

function openField(editor: Editor, range: Range | undefined, kind: EmbedInputKind): void {
  const chain = editor.chain().focus();
  if (range) chain.deleteRange(range);
  chain.insertEmbedInput({ kind }).run();
}

function insertItem(editor: Editor, id: string, kind: EmbedInputKind, icon: InsertItem['icon'], keywords: string[]): InsertItem {
  const { t } = editor.storage.postCanvasCore;
  const key = id === 'link-card' ? 'linkCard' : id;
  return {
    id,
    group: 'embeds',
    label: t(`embeds.insert.${key}`),
    description: t(`embeds.insert.${key}Description`),
    keywords,
    icon,
    run: ({ editor: current, range }) => openField(current, range, kind),
  };
}

/** The editor embed extensions for a feature set, with node views, commands, the paste rule, insert items and problems. */
export function embedsKit(features: Features, options: EmbedsKitOptions = {}): AnyExtension[] {
  const consent = options.embedConsent ?? 'click';
  const extensions: AnyExtension[] = [];

  if (features.video) {
    extensions.push(
      Video.extend<EditorNodeOptions>({
        addOptions() {
          return { ...this.parent!(), consent };
        },
        addNodeView() {
          return ReactNodeViewRenderer(VideoNodeView, { stopEvent: embedStopEvent });
        },
        postCanvasInsert() {
          return [insertItem(this.editor, 'video', 'video', Film, ['youtube', 'vimeo', 'film', 'movie', 'clip'])];
        },
      }),
    );
  }

  if (features.embed) {
    extensions.push(
      createEmbedNode(allowedEmbedProviders(features)).extend<EditorNodeOptions>({
        addOptions() {
          return { ...this.parent!(), consent };
        },
        addNodeView() {
          return ReactNodeViewRenderer(EmbedNodeView, { stopEvent: embedStopEvent });
        },
        postCanvasInsert() {
          return [
            insertItem(this.editor, 'embed', 'embed', AppWindow, [
              'iframe',
              'spotify',
              'soundcloud',
              'twitter',
              'x',
              'instagram',
              'tiktok',
              'codepen',
              'loom',
              'figma',
              'map',
            ]),
          ];
        },
      }),
    );
  }

  if (features.linkCard) {
    extensions.push(
      LinkCard.extend({
        addNodeView() {
          return ReactNodeViewRenderer(LinkCardNodeView, { stopEvent: embedStopEvent });
        },
        postCanvasInsert() {
          return [insertItem(this.editor, 'link-card', 'link', Link2, ['link', 'url', 'preview', 'bookmark', 'card'])];
        },
      }),
    );
  }

  if (features.video || features.embed || features.linkCard) {
    extensions.push(
      EmbedInput.extend({
        addNodeView() {
          return ReactNodeViewRenderer(EmbedInputView, { stopEvent: () => true, ignoreMutation: () => true });
        },
        addCommands() {
          return {
            insertEmbedInput:
              ({ kind = 'any', value = '' } = {}) =>
              ({ commands }) =>
                commands.insertContent(embedInputContent(kind, value)),
          };
        },
      }),
      EmbedsState.configure({ consent }),
      EmbedPaste,
    );
  }

  return extensions;
}

export { EmbedPaste };
