// Every type shared across the package's areas. The contract for these lives in the plan; change them only in
// backward-compatible ways.
import type { Editor, JSONContent, Range } from '@tiptap/core';
import type { ComponentType, ReactNode } from 'react';
import './extension-fields';

export type { JSONContent };

// ---------------------------------------------------------------------------------------------------------------------
// Document model: text
// ---------------------------------------------------------------------------------------------------------------------

/** Horizontal alignment of a paragraph or heading. `null` means the default (start). */
export type TextAlign = 'left' | 'center' | 'right' | 'justify' | null;

/**
 * A named colour from the theme palette. Text colour and highlight store the name, never a hex value, so themes and
 * dark mode recolour it and nothing unsafe reaches a `style` attribute.
 */
export type PaletteColor = 'gray' | 'brown' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'red';

/** Every palette colour name, in menu order. */
export const paletteColors: readonly PaletteColor[] = [
  'gray',
  'brown',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'pink',
  'red',
];

// ---------------------------------------------------------------------------------------------------------------------
// Document model: media
// ---------------------------------------------------------------------------------------------------------------------

/** An uploaded picture, shared by the image node, gallery photos and the cover. */
export interface MediaSource {
  /** An https URL from the upload adapter. A `blob:` URL only while the upload runs. */
  src: string;
  /** Intrinsic width in pixels. `0` means unknown: the editor measures the picture when it loads. */
  width: number;
  /** Intrinsic height in pixels. `0` means unknown. */
  height: number;
  /** Alternative text. Empty for decorative pictures. */
  alt: string;
  /** A validated `srcset` such as `"url 640w, url 1280w"`, or `null`. */
  srcset: string | null;
  /** A tiny `data:image/(jpeg|png|webp);base64` preview of at most 2 KB, or `null`. */
  placeholder: string | null;
  /** The upload adapter's id, for the app's own bookkeeping. */
  uploadId: string | null;
  /** Transient: set while an upload runs or after it failed, `null` once it's done. Never saved. */
  uploadKey: string | null;
}

/** How a gallery lays out its photos. */
export type GalleryLayout = 'carousel' | 'grid' | 'masonry' | 'collage';

/** Every gallery layout, in menu order. */
export const galleryLayouts: readonly GalleryLayout[] = ['carousel', 'grid', 'masonry', 'collage'];

/** Where a single image sits in the column. */
export type ImageAlign = 'center' | 'wide' | 'full' | 'left' | 'right';

/** Where a collage photo sits on the base photo. */
export interface CollagePlace {
  /** Centre x, from 0 to 1 of the base. */
  x: number;
  /** Centre y, from 0 to 1 of the base. */
  y: number;
  /** Width as a fraction of the base, from 0.08 to 1. */
  w: number;
  /** Rotation in degrees, from -180 to 180, rounded to 0.1. */
  r: number;
}

/** One photo in a gallery. */
export interface GalleryPhoto extends MediaSource {
  /** Stable per photo, for React keys and reordering. */
  key: string;
  /** Collage position. `null` for the base photo and for every other layout. */
  place: CollagePlace | null;
}

/** Attributes of the `image` block node. */
export interface ImageAttrs extends MediaSource {
  id: string;
  caption: string;
  align: ImageAlign;
}

/** Attributes of the `gallery` block node. */
export interface GalleryAttrs {
  id: string;
  layout: GalleryLayout;
  /** From 1 to the feature's `maxPhotos`. */
  photos: GalleryPhoto[];
  caption: string;
}

/** Attributes of the `file` block node. */
export interface FileAttrs {
  id: string;
  src: string;
  name: string;
  size: number | null;
  mimeType: string | null;
  uploadId: string | null;
  uploadKey: string | null;
}

// ---------------------------------------------------------------------------------------------------------------------
// Document model: embeds
// ---------------------------------------------------------------------------------------------------------------------

/** Attributes of the `video` block node. Player URLs are built at render time, never stored. */
export interface VideoAttrs {
  id: string;
  provider: 'youtube' | 'vimeo';
  videoId: string;
  /** The privacy hash of an unlisted Vimeo video. */
  hash: string | null;
  /** A vertical video, such as a YouTube Short. */
  vertical: boolean;
  /** Start time in seconds. */
  start: number | null;
  title: string;
  description: string;
  thumbnailUrl: string | null;
}

/** Attributes of the `embed` block node. The iframe URL is built from `provider` and `ref` at render time. */
export interface EmbedAttrs {
  id: string;
  /** A registered provider name. */
  provider: string;
  /** Validated ids only. */
  ref: Record<string, string>;
  /** The canonical page URL. */
  url: string;
  title: string;
  aspectRatio: number | null;
}

/** Attributes of the `linkCard` block node. */
export interface LinkCardAttrs {
  id: string;
  url: string;
  title: string;
  description: string;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
}

/** Attributes of the transient `embedInput` node: the inline "paste a link" field. Never saved. */
export interface EmbedInputAttrs {
  id: string;
  value: string;
}

// ---------------------------------------------------------------------------------------------------------------------
// Post fields
// ---------------------------------------------------------------------------------------------------------------------

/** A post's cover picture. */
export type CoverImage = Omit<MediaSource, 'uploadKey'>;

/** Optional fields outside the body, shown above the canvas by some presets. */
export interface PostFields {
  /** At most 200 characters. */
  title?: string;
  cover?: CoverImage | null;
}

// ---------------------------------------------------------------------------------------------------------------------
// Features and presets
// ---------------------------------------------------------------------------------------------------------------------

/** A heading level the editor offers. */
export type HeadingLevel = 1 | 2 | 3 | 4;

/** Which parts of the editor are on. `resolveFeatures()` builds a complete set from a preset and overrides. */
export interface Features {
  // Text
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  code: boolean;
  link: boolean;
  highlight: boolean;
  color: boolean;
  subscript: boolean;
  superscript: boolean;
  textAlign: boolean;
  heading: false | { levels: HeadingLevel[] };
  bulletList: boolean;
  orderedList: boolean;
  taskList: boolean;
  blockquote: boolean;
  codeBlock: boolean;
  horizontalRule: boolean;
  table: boolean;
  mention: boolean;
  hashtag: boolean;
  // Media
  image: boolean;
  /** Default: all four layouts, at most 10 photos. */
  gallery: false | { layouts: GalleryLayout[]; maxPhotos: number };
  file: boolean;
  // Embeds
  video: boolean;
  /** Default: every built-in provider. */
  embed: false | { providers: string[] };
  linkCard: boolean;
  // UI
  toolbar: boolean;
  bubbleMenu: boolean;
  slashMenu: boolean;
  insertButton: boolean;
  blockHandle: boolean;
  statusBar: boolean;
  // Fields
  title: boolean;
  cover: boolean;
}

/** A named starting set of features. */
export type PresetName = 'full' | 'article' | 'social' | 'comment';

/** A partial set of features that replaces the matching keys of a preset. */
export type FeatureOverrides = { [K in keyof Features]?: Features[K] };

// ---------------------------------------------------------------------------------------------------------------------
// Adapters: how the editor talks to the app
// ---------------------------------------------------------------------------------------------------------------------

/** What the app's upload adapter returns for one file. */
export interface UploadResult {
  /** The final https URL. */
  src: string;
  id?: string;
  width?: number;
  height?: number;
  srcset?: string;
  placeholder?: string;
  name?: string;
  size?: number;
  mimeType?: string;
}

/** Context passed to every upload. */
export interface UploadContext {
  kind: 'image' | 'file';
  /** Aborted when the user cancels or removes the block. */
  signal: AbortSignal;
  /** Report progress from 0 to 1. */
  onProgress: (fraction: number) => void;
}

/** Uploads files to the app's storage. Without one, image, gallery and file are off unless set explicitly. */
export interface UploadAdapter {
  upload(file: File, ctx: UploadContext): Promise<UploadResult>;
  /** `accept` strings for the file inputs. */
  accept?: { image?: string; file?: string };
  /** Size limits in bytes. */
  maxBytes?: { image?: number; file?: number };
  /** Optional HEIC to JPEG conversion, with a library the app installs itself. */
  convertHeic?: (file: File) => Promise<Blob>;
}

/** One person or tag in a suggestion list. */
export interface SuggestionItem {
  id: string;
  label: string;
  description?: string;
  avatarUrl?: string;
}

/** Looks up mentions (`@`) or hashtags (`#`). */
export interface SuggestionSource {
  search(query: string, ctx: { signal: AbortSignal }): Promise<SuggestionItem[]>;
}

/** Metadata the app's server found for an embed. */
export interface EmbedMetadata {
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  aspectRatio?: number;
}

/** Looks up an embed's title, description and thumbnail, usually through the app's server. */
export type EmbedMetadataResolver = (url: string, ctx: { signal: AbortSignal }) => Promise<EmbedMetadata>;

/** A link card's preview. */
export interface LinkPreview {
  url: string;
  title: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
}

/** Fetches a link card's preview, usually through the app's server. */
export type LinkPreviewResolver = (url: string, ctx: { signal: AbortSignal }) => Promise<LinkPreview>;

/** An autosaved draft. */
export interface DraftSnapshot {
  content: JSONContent;
  fields?: PostFields;
  /** ISO 8601 time. */
  savedAt: string;
}

/** Where autosaved drafts live. The default is `localStorage` in a try/catch. */
export interface DraftStorage {
  load(key: string): DraftSnapshot | null | Promise<DraftSnapshot | null>;
  save(key: string, snapshot: DraftSnapshot): void | Promise<void>;
  clear(key: string): void | Promise<void>;
}

/** Everything the app plugs into the editor. All optional. */
export interface Adapters {
  upload?: UploadAdapter;
  /** `@` mentions. */
  mentions?: SuggestionSource;
  /** `#` hashtags. */
  hashtags?: SuggestionSource;
  embeds?: EmbedMetadataResolver;
  links?: LinkPreviewResolver;
  storage?: DraftStorage;
}

// ---------------------------------------------------------------------------------------------------------------------
// i18n
// ---------------------------------------------------------------------------------------------------------------------

/** Values for a message's placeholders. */
export type TranslateValues = Record<string, string | number>;

/** Looks up a message by its dotted key, such as `core.frame.remove`, and fills in its placeholders. */
export type Translator = (key: string, values?: TranslateValues) => string;

/** A language: its BCP 47 code and its flat, dotted messages. */
export interface Locale {
  code: string;
  messages: Record<string, string>;
}

// ---------------------------------------------------------------------------------------------------------------------
// The core extension
// ---------------------------------------------------------------------------------------------------------------------

/** How a notice is announced. */
export type NotifyKind = 'info' | 'error';

/** What every extension reads through `editor.storage.postCanvasCore`. */
export interface PostCanvasCoreStorage {
  t: Translator;
  adapters: Adapters;
  /** The resolved features. */
  features: Features;
  /** Announces a message in the editor's live region (and as a toast, once the UI wires it). */
  notify(message: string, kind?: NotifyKind): void;
}

// ---------------------------------------------------------------------------------------------------------------------
// Insert items and problems (extension fields)
// ---------------------------------------------------------------------------------------------------------------------

/** Where an insert item appears in the `+` and `/` menus. */
export type InsertGroup = 'basic' | 'lists' | 'media' | 'embeds' | 'advanced';

/** Where an insert item was chosen from. */
export type InsertSource = 'slash' | 'insert-button' | 'toolbar';

/** One entry in the `+` and `/` menus. Extensions provide these through `postCanvasInsert`. */
export interface InsertItem {
  /** Stable id, such as `heading-2`, `table` or `gallery`. */
  id: string;
  group: InsertGroup;
  /** Already translated. */
  label: string;
  description?: string;
  /** Extra search words. */
  keywords: string[];
  /** A lucide-react icon. */
  icon: ComponentType<{ size?: number }>;
  run(ctx: { editor: Editor; range?: Range; source: InsertSource }): void;
}

/** Something that blocks or warns before publishing. Extensions provide these through `postCanvasProblems`. */
export interface Problem {
  code: string;
  /** Already translated. */
  message: string;
  severity: 'error' | 'warning';
  /** The node it's about, if any. */
  nodeId?: string;
}

/** Cleans one node's or mark's attributes. Returns `null` to drop it. Pure, so it runs on the server too. */
export type AttrsSanitizer = (attrs: Record<string, unknown>) => Record<string, unknown> | null;

// ---------------------------------------------------------------------------------------------------------------------
// Read-only views
// ---------------------------------------------------------------------------------------------------------------------

/** Props of a read-only view for one node type. */
export interface ViewProps {
  node: { type: string; attrs: Record<string, unknown> };
  t: Translator;
}

/** Renders one node type in the read-only `PostCanvasView`. */
export type ViewComponent = (props: ViewProps) => ReactNode;

/** Read-only views by node type. */
export type ViewMap = Partial<Record<string, ViewComponent>>;
