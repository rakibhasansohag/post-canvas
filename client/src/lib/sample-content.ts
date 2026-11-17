import type { GalleryLayout, GalleryPhoto, JSONContent, MediaSource } from 'post-canvas';
import { photos, type PhotoName } from './photos';
import { basePath } from './shared';

/** A sample photo as an image source. `origin` is the page's origin: media URLs must be absolute. */
export function photoSource(origin: string, name: PhotoName, options: { lean?: boolean } = {}): MediaSource {
  const photo = photos[name];
  const url = (width: number) => `${origin}${basePath}/samples/${name}-${width}.webp`;
  return {
    src: url(1280),
    width: photo.width,
    height: photo.height,
    alt: photo.alt,
    // `lean` leaves out the srcset and placeholder, to keep a JSON view short.
    srcset: options.lean ? null : `${url(640)} 640w, ${url(1280)} 1280w`,
    placeholder: options.lean ? null : photo.placeholder,
    uploadId: null,
    uploadKey: null,
  };
}

function galleryPhoto(origin: string, name: PhotoName, place: GalleryPhoto['place'] = null): GalleryPhoto {
  return { key: `sample-${name}`, ...photoSource(origin, name), place };
}

const text = (value: string, marks?: JSONContent['marks']): JSONContent =>
  marks ? { type: 'text', text: value, marks } : { type: 'text', text: value };
const paragraph = (...content: JSONContent[]): JSONContent => ({ type: 'paragraph', content });
const mention = (id: string, label: string, char: '@' | '#' = '@'): JSONContent => ({
  type: 'mention',
  attrs: { id, label, mentionSuggestionChar: char },
});
const link = (href: string) => [{ type: 'link', attrs: { href, target: null, rel: null } }];

const travel: PhotoName[] = ['lake', 'market', 'hills', 'harbour'];

// Collage places for the travel post: every photo but the first sits on top of it.
const travelPlaces: GalleryPhoto['place'][] = [
  null,
  { x: 0.24, y: 0.66, w: 0.36, r: -6 },
  { x: 0.74, y: 0.3, w: 0.34, r: 5 },
  { x: 0.72, y: 0.74, w: 0.38, r: -3 },
];

/**
 * A short travel post: formatting, a mention, hashtags and a four-photo gallery. With `video`, it also embeds a YouTube
 * video, which loads a thumbnail from YouTube's image host. Without `closing`, it leaves out the last paragraph.
 */
export function createSampleContent(
  origin: string,
  options: { video?: boolean; closing?: boolean; layout?: GalleryLayout } = {},
): JSONContent {
  const layout = options.layout ?? 'grid';
  const content: JSONContent[] = [
    paragraph(
      text('Three days around the lake', [{ type: 'bold' }]),
      text(' with '),
      mention('maya', 'Maya Okafor'),
      text('. The light was best an hour before sunset, and the market had the sweetest figs. '),
      mention('travel', 'travel', '#'),
      text(' '),
      mention('photography', 'photography', '#'),
    ),
    {
      type: 'gallery',
      attrs: {
        layout,
        caption: '',
        photos: travel.map((name, index) =>
          galleryPhoto(origin, name, layout === 'collage' ? (travelPlaces[index] ?? null) : null),
        ),
      },
    },
  ];
  if (options.closing !== false) {
    content.push(
      paragraph(
        text(
          'Drag a block by its handle to move it. Press / to insert an image, a video or a link card, or paste a link and the editor picks the right block. Read the ',
        ),
        text('docs', link(`${basePath}/docs/`)),
        text('.'),
      ),
    );
  }
  if (options.video) {
    content.push({
      type: 'video',
      attrs: {
        provider: 'youtube',
        videoId: 'jNQXAC9IVRw',
        hash: null,
        vertical: false,
        start: null,
        title: 'The first video on YouTube',
        description: '',
        thumbnailUrl: null,
      },
    });
  }
  return { type: 'doc', content };
}

/** The writing demo: headings, marks, lists, a task list and a quote. */
export function richTextContent(): JSONContent {
  return {
    type: 'doc',
    content: [
      { type: 'heading', attrs: { level: 2, textAlign: null }, content: [text('Notes from the coast path')] },
      paragraph(
        text('Twelve miles from the harbour to the lighthouse, with '),
        text('two', [{ type: 'bold' }]),
        text(' good cafés on the way. The cliffs are '),
        text('steep after the second bay', [{ type: 'highlight', attrs: { color: 'yellow' } }]),
        text(', so take the '),
        text('inland path', [{ type: 'italic' }]),
        text(' if it has rained. '),
        mention('jonas', 'Jonas Weber'),
        text(' has the full '),
        text('route map', link('https://example.com/coast-path')),
        text('.'),
      ),
      {
        type: 'taskList',
        content: [
          { type: 'taskItem', attrs: { checked: true }, content: [paragraph(text('Pack the wide lens'))] },
          { type: 'taskItem', attrs: { checked: false }, content: [paragraph(text('Book the morning ferry'))] },
        ],
      },
      {
        type: 'blockquote',
        content: [paragraph(text('Start early. By noon the path belongs to the gulls and the tour groups.'))],
      },
    ],
  };
}

const galleryNames: PhotoName[] = ['coast', 'cafe', 'lighthouse', 'rooftops', 'beach'];
const galleryPlaces: GalleryPhoto['place'][] = [
  null,
  { x: 0.2, y: 0.32, w: 0.3, r: -7 },
  { x: 0.82, y: 0.36, w: 0.24, r: 6 },
  { x: 0.33, y: 0.72, w: 0.33, r: 4 },
  { x: 0.74, y: 0.74, w: 0.36, r: -4 },
];

/** The gallery demo: five photos in one gallery block. */
export function galleryContent(origin: string, layout: GalleryLayout): JSONContent {
  return {
    type: 'doc',
    content: [
      {
        type: 'gallery',
        attrs: {
          layout,
          caption: 'A weekend on the coast',
          photos: galleryNames.map((name, index) => galleryPhoto(origin, name, galleryPlaces[index] ?? null)),
        },
      },
    ],
  };
}

/** The presets demo's article: a title, a cover and a short body. */
export function articleSample(origin: string) {
  const { uploadKey: _uploadKey, ...cover } = photoSource(origin, 'garden');
  return {
    fields: { title: 'A slow morning in the glasshouse', cover },
    content: {
      type: 'doc',
      content: [
        paragraph(
          text(
            'The palm house opens at nine, and for the first hour it is almost empty. The air is warm and wet, and the only sound is the drip from the roof.',
          ),
        ),
        { type: 'heading', attrs: { level: 2, textAlign: null }, content: [text('What to see first')] },
        paragraph(
          text(
            'Start with the tree ferns by the north door, then climb the spiral stair to the gallery for the view over the canopy.',
          ),
        ),
      ],
    } satisfies JSONContent,
  };
}

/** The social preset's starting post: one short paragraph and a photo. */
export function socialSample(origin: string): JSONContent {
  return {
    type: 'doc',
    content: [
      paragraph(
        text('First swim of the year at the north cove. Cold, clear and completely worth it. '),
        mention('outdoors', 'outdoors', '#'),
      ),
      { type: 'image', attrs: { ...photoSource(origin, 'swim'), caption: '', align: 'center' } },
    ],
  };
}

/** A second paragraph for the social demo, which turns the post into an article. */
export const socialSecondParagraph: JSONContent = paragraph(
  text(
    'We stayed until the tide turned, then walked back over the dunes for chips at the harbour. Next time: the long route over the headland, and a flask of tea.',
  ),
);

/** The output demo: a short document with formatting, a link, a list and a photo. */
export function outputContent(origin: string): JSONContent {
  return {
    type: 'doc',
    content: [
      paragraph(
        text('Writing day', [{ type: 'bold' }]),
        text('. Draft the '),
        text('launch post', [{ type: 'italic' }]),
        text(' and send it to '),
        mention('priya', 'Priya Nair'),
        text(' for a read. Notes are in the '),
        text('team doc', link('https://example.com/notes')),
        text('.'),
      ),
      {
        type: 'bulletList',
        content: [
          { type: 'listItem', content: [paragraph(text('One idea per paragraph'))] },
          { type: 'listItem', content: [paragraph(text('A photo near the top'))] },
        ],
      },
      {
        type: 'image',
        attrs: { ...photoSource(origin, 'desk', { lean: true }), caption: 'The desk by the window', align: 'center' },
      },
    ],
  };
}

/** A hostile document, as a client could send it to your server. */
export const hostileSample = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      attrs: { style: 'position:fixed;inset:0' },
      content: [
        {
          type: 'text',
          text: 'Claim your prize',
          marks: [{ type: 'link', attrs: { href: 'java\nscript:alert(document.cookie)' } }],
        },
        { type: 'text', text: ' <img src=x onerror=alert(1)>' },
      ],
    },
    {
      type: 'image',
      attrs: { src: 'javascript:alert(1)', alt: 'A photo', width: 800, height: 600, onerror: 'alert(1)' },
    },
    { type: 'iframe', attrs: { src: 'https://evil.example/login' } },
    {
      type: 'video',
      attrs: { provider: 'youtube', videoId: '"><script>alert(1)</script>', title: 'Watch this' },
    },
    { type: 'paragraph', content: [{ type: 'text', text: 'Thanks for reading.' }] },
  ],
};
