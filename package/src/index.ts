// The `post-canvas` entry. Shared file: each chat edits only its own marked section.

// --- chat 0: core ---
export * from './core/types';
export { defaultFeatures, resolveFeatures, builtInEmbedProviderNames } from './core/features';
export { createTranslator } from './core/i18n';
export { safeHref, safeHttpUrl, safeMediaSrc } from './core/url';
export { createId, createKey } from './core/ids';
export { collectInsertItems, collectProblems } from './core/registry';
export {
  PostCanvasProvider,
  usePostCanvasContext,
  useOptionalPostCanvasContext,
  type PostCanvasContextValue,
} from './core/react/context';
export { useTranslator } from './core/react/use-translator';
export { MediaFrame, type MediaFrameProps, type FrameHandle, type FrameKey } from './core/react/media-frame';
export { MediaToolbar, type MediaToolbarProps } from './core/react/media-toolbar';
export { ToolButton, type ToolButtonProps } from './core/react/tool-button';
export { Popover, type PopoverProps } from './core/react/popover';
export {
  usePointerDrag,
  type DragCallbacks,
  type PointerDragOptions,
  type PointerDragHandlers,
} from './core/react/use-pointer-drag';
export { default as en } from './locales/en/index';
// --- end chat 0 ---

// --- chat A: media ---
// --- end chat A ---

// --- chat B: text and UI ---
export { PostCanvas, type PostCanvasProps, type PostCanvasTheme } from './react/post-canvas';
// --- end chat B ---

// --- chat C: output and embeds ---
// --- end chat C ---
