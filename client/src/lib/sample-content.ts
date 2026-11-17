import type { JSONContent } from 'post-canvas';
import { basePath } from './shared';

interface SamplePhoto {
  file: string;
  width: number;
  height: number;
  alt: string;
}

const photos: SamplePhoto[] = [
  { file: 'lake', width: 1200, height: 800, alt: 'A lake at dusk with orange light on the water' },
  { file: 'market', width: 800, height: 1000, alt: 'Market stalls in warm red light' },
  { file: 'hills', width: 1000, height: 1000, alt: 'Green hills under a pale yellow sky' },
  { file: 'harbour', width: 1200, height: 800, alt: 'A harbour in purple evening light' },
];

function photo(origin: string, index: number, place: boolean) {
  const item = photos[index]!;
  return {
    key: `sample-${item.file}`,
    src: `${origin}${basePath}/samples/${item.file}.jpg`,
    width: item.width,
    height: item.height,
    alt: item.alt,
    srcset: null,
    placeholder: null,
    uploadId: null,
    uploadKey: null,
    place: place ? { x: 0.3 + index * 0.15, y: 0.35 + index * 0.1, w: 0.4, r: index % 2 ? 6 : -5 } : null,
  };
}

/**
 * A short travel post with formatting, a mention, a hashtag, a gallery and a link card. `origin` is the page's origin:
 * the gallery's photo URLs must be absolute. With `video`, it also embeds a YouTube video, which loads a thumbnail
 * from YouTube's image host.
 */
export function createSampleContent(origin: string, options: { video?: boolean; layout?: 'grid' | 'carousel' | 'masonry' | 'collage' } = {}): JSONContent {
  const layout = options.layout ?? 'grid';
  const content: JSONContent[] = [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Three days around the lake' , marks: [{ type: 'bold' }] },
        { type: 'text', text: ', with ' },
        { type: 'mention', attrs: { id: 'maya', label: 'Maya Okafor', mentionSuggestionChar: '@' } },
        { type: 'text', text: '. The light was best an hour before sunset. ' },
        { type: 'mention', attrs: { id: 'travel', label: 'travel', mentionSuggestionChar: '#' } },
        { type: 'text', text: ' ' },
        { type: 'mention', attrs: { id: 'photography', label: 'photography', mentionSuggestionChar: '#' } },
      ],
    },
    {
      type: 'gallery',
      attrs: {
        layout,
        caption: 'Tap a layout in the gallery menu to switch between carousel, grid, masonry and collage.',
        photos: photos.map((_, index) => photo(origin, index, layout === 'collage' && index > 0)),
      },
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Drag a block by its handle to move it. Press ' },
        { type: 'text', text: '/', marks: [{ type: 'code' }] },
        { type: 'text', text: ' to insert an image, a video or a link card, or paste a link and the editor picks the right block. Read the ' },
        { type: 'text', text: 'docs', marks: [{ type: 'link', attrs: { href: `${basePath}/docs/`, target: null, rel: null } }] },
        { type: 'text', text: '.' },
      ],
    },
  ];
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
