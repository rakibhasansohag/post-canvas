// The comparison and guide pages outside the docs. One list feeds their metadata, the sitemap, the footer, the
// llms.txt section and the "Compare more" links, so a new page needs one entry here and its own route folder.

export interface SeoPageEntry {
  /** The route, with no slashes: `tinymce-alternative`. */
  slug: string;
  /** The page `<title>`, without the site name. */
  title: string;
  /** The meta and Open Graph description, at most 160 characters. */
  description: string;
  /** The short link text in the footer and the related links. */
  short: string;
  /** One line under the link in "Compare more". */
  blurb: string;
}

export const seoPages = [
  {
    slug: 'tinymce-alternative',
    title: 'TinyMCE Alternative for React: Open Source, No API Key',
    description:
      'An MIT-licensed TinyMCE alternative for React, built on Tiptap. No API key or cloud, with galleries, embeds and sanitized HTML. Compare and import your HTML.',
    short: 'TinyMCE alternative',
    blurb: 'Licence, API key, plugins and how to move your HTML over.',
  },
  {
    slug: 'react-quill-alternative',
    title: 'React Quill Alternative: A Maintained Editor for React 19',
    description:
      'Replacing react-quill or react-draft-wysiwyg? Compare Post Canvas, Tiptap, Lexical, Quill and TinyMCE, then convert your Quill HTML in a live demo.',
    short: 'React Quill alternative',
    blurb: 'For apps on react-quill or Draft.js moving to current React.',
  },
  {
    slug: 'tiptap-vs-lexical',
    title: 'Tiptap vs Lexical: Which Editor Framework for React?',
    description:
      'Tiptap vs Lexical, compared from their own docs: licence, paid add-ons, React bindings, document model and collaboration. Plus what Post Canvas adds on Tiptap.',
    short: 'Tiptap vs Lexical',
    blurb: 'Two editor frameworks, compared from their own docs.',
  },
  {
    slug: 'tiptap-image-gallery',
    title: 'Tiptap Image Upload, Resize and Galleries for React',
    description:
      'Tiptap image upload, resize and galleries in React: carousel, grid, masonry and collage layouts, an upload adapter with progress, and safe HTML output.',
    short: 'Tiptap image galleries',
    blurb: 'Upload, resize and four gallery layouts on Tiptap.',
  },
  {
    slug: 'ckeditor-alternative',
    title: 'CKEditor Alternative for React: MIT Licensed, No License Key',
    description:
      'An MIT-licensed CKEditor 5 alternative for React, built on Tiptap. Compare licences, pricing and features, then import your CKEditor HTML in a live demo.',
    short: 'CKEditor alternative',
    blurb: 'Licence keys, premium features and an HTML import.',
  },
  {
    slug: 'froala-alternative',
    title: 'Froala Alternative: A Free, Open-Source React Editor',
    description:
      'A free, MIT-licensed Froala alternative for React posts with photos and video. Compare licence, price and features, then convert your Froala HTML live.',
    short: 'Froala alternative',
    blurb: 'A free editor for posts with photos and video.',
  },
] as const satisfies readonly SeoPageEntry[];

export type SeoSlug = (typeof seoPages)[number]['slug'];

export function seoPage(slug: SeoSlug): SeoPageEntry {
  return seoPages.find((page) => page.slug === slug)!;
}
