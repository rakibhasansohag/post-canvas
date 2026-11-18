// The feature screenshots in public/features, shared by the docs. Each has a light file and a `-dark` file.
// Sizes are the real pixel sizes (2x), so the images reserve their space and nothing shifts while they load.

export interface FeatureShot {
  alt: string;
  light: [width: number, height: number];
  dark: [width: number, height: number];
}

export const featureShots = {
  'editor-collage': {
    alt: 'The Post Canvas editor with the social preset: a short post with a mention, two hashtags and a four-photo collage',
    light: [1764, 1618],
    dark: [1764, 1618],
  },
  'gallery-carousel': {
    alt: 'A gallery in the carousel layout: one large coast photo with the next photo peeking in from the side',
    light: [1764, 1120],
    dark: [1764, 1120],
  },
  'gallery-grid': {
    alt: 'A gallery in the grid layout: five coast photos in even square tiles',
    light: [1764, 1548],
    dark: [1764, 1548],
  },
  'gallery-masonry': {
    alt: 'A gallery in the masonry layout: five photos in three columns, each at its own proportions',
    light: [1764, 1488],
    dark: [1764, 1488],
  },
  'gallery-collage': {
    alt: 'A gallery in the collage layout: four photos tilted and layered over a clifftop background photo',
    light: [1764, 1564],
    dark: [1764, 1564],
  },
  'collage-arrange': {
    alt: 'Arranging a collage: the collage editor open with a hint to drag, pinch or use handles to place, resize and turn each photo',
    light: [1764, 1752],
    dark: [1764, 1752],
  },
  'rich-text': {
    alt: 'The full toolbar above a formatted note with a heading, bold, italic, a highlight, a mention, a link, a task list and a quote',
    light: [1764, 704],
    dark: [1764, 704],
  },
  'selection-menu': {
    alt: 'The selection menu floating above selected text, with bold, italic, underline, strike, code, link, colour and Turn into',
    light: [1764, 704],
    dark: [1764, 704],
  },
  'slash-menu': {
    alt: 'The slash menu open under a typed slash, listing Text, Heading 1, Heading 2, Heading 3 and Heading 4',
    light: [1764, 790],
    dark: [1764, 784],
  },
  'mentions': {
    alt: 'The mention list open after typing @, showing people with their initials and roles',
    light: [1764, 790],
    dark: [1764, 784],
  },
  'embed-youtube': {
    alt: 'A pasted YouTube link shown as a player with a thumbnail, a title, a description and a Watch on YouTube link',
    light: [1764, 1584],
    dark: [1764, 1584],
  },
  'embed-social': {
    alt: 'A pasted X post shown as a click-to-load placeholder that says it loads content from X, which may set cookies',
    light: [1764, 1672],
    dark: [1764, 1672],
  },
  'link-card': {
    alt: 'A pasted link shown as a card with the site name, the page title, a description and a preview image',
    light: [1764, 724],
    dark: [1764, 724],
  },
  'preset-social': {
    alt: 'The social preset: a short post with a hashtag and one photo, and a status bar that reads Photo post',
    light: [1284, 1096],
    dark: [1284, 1096],
  },
  'preset-article': {
    alt: 'The article preset: a cover image, a large title, body text and a heading, with an Article word count in the status bar',
    light: [1764, 1738],
    dark: [1764, 1738],
  },
  'preset-comment': {
    alt: 'The comment preset: a small one-line box with a reply that mentions another person',
    light: [1284, 264],
    dark: [1284, 264],
  },
  'output-json': {
    alt: 'A document in the editor next to its JSON output',
    light: [2304, 1156],
    dark: [2304, 1114],
  },
  'output-html': {
    alt: 'A document in the editor next to its HTML output from renderToHTML',
    light: [2304, 1156],
    dark: [2304, 1114],
  },
  'output-markdown': {
    alt: 'A document in the editor next to its Markdown output',
    light: [2304, 1156],
    dark: [2304, 1114],
  },
  'sanitizer': {
    alt: 'A hostile document with a javascript: link, an unsafe photo, an iframe and a script in a video id, next to what sanitizeDocument removed and the safe HTML it renders',
    light: [2304, 1116],
    dark: [2304, 1116],
  },
  'playground': {
    alt: 'The playground: switches for preset, theme, language and features beside a live editor with a sample post',
    light: [2320, 1760],
    dark: [2320, 1760],
  },
  'mobile': {
    alt: 'The editor at phone width with the social preset, a mention, hashtags and a collage',
    light: [720, 1146],
    dark: [720, 1146],
  },
} satisfies Record<string, FeatureShot>;

export type FeatureShotName = keyof typeof featureShots;
