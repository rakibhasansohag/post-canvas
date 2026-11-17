// The built-in embed providers for the `embed` node. Each one checks the host against an exact allowlist and every id
// against a strict pattern, and builds its URLs from those ids alone.
import { fits, pathParts } from './parse-url';
import type { EmbedProvider, EmbedRef } from './types';

const popups = 'allow-popups allow-popups-to-escape-sandbox';
const scripts = 'allow-scripts allow-same-origin';

function host(url: URL): string {
  return url.hostname.toLowerCase();
}

// ---------------------------------------------------------------------------------------------------------------------
// Spotify
// ---------------------------------------------------------------------------------------------------------------------

const spotifyTypes = new Set(['track', 'album', 'playlist', 'episode', 'show', 'artist']);
const spotifyId = /^[A-Za-z0-9]{22}$/;

/** Spotify tracks, albums, playlists, episodes, shows and artists. */
export const spotify: EmbedProvider = {
  name: 'spotify',
  label: 'Spotify',
  aspectRatio: null,
  match(url): EmbedRef | null {
    if (host(url) !== 'open.spotify.com') return null;
    let parts = pathParts(url);
    if (/^intl-[a-z]{2}(?:-[a-z]{2})?$/i.test(parts[0] ?? '')) parts = parts.slice(1);
    if (parts[0] === 'embed') parts = parts.slice(1);
    const [type, id] = parts;
    return parts.length === 2 && type && spotifyTypes.has(type) && fits(id, spotifyId) ? { type, id } : null;
  },
  frame(ref) {
    return {
      src: `https://open.spotify.com/embed/${ref.type}/${ref.id}`,
      title: 'Spotify player',
      allow: 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture',
      sandbox: `${scripts} allow-presentation ${popups}`,
      aspectRatio: null,
      height: ref.type === 'track' || ref.type === 'episode' ? 152 : 352,
    };
  },
  canonicalUrl: (ref) => `https://open.spotify.com/${ref.type}/${ref.id}`,
  oembed: (ref) =>
    `https://open.spotify.com/oembed?url=${encodeURIComponent(`https://open.spotify.com/${ref.type}/${ref.id}`)}`,
};

// ---------------------------------------------------------------------------------------------------------------------
// SoundCloud
// ---------------------------------------------------------------------------------------------------------------------

const soundcloudSlug = /^[a-z0-9_-]{1,100}$/i;
const soundcloudReserved = new Set([
  'discover',
  'search',
  'stream',
  'upload',
  'you',
  'charts',
  'pages',
  'settings',
  'messages',
  'notifications',
  'people',
  'terms-of-use',
  'pro',
  'mobile',
  'jobs',
  'imprint',
]);

function soundcloudPage(ref: EmbedRef): string {
  return ref.set
    ? `https://soundcloud.com/${ref.user}/sets/${ref.set}`
    : `https://soundcloud.com/${ref.user}/${ref.track}`;
}

/** SoundCloud tracks and sets (playlists). */
export const soundcloud: EmbedProvider = {
  name: 'soundcloud',
  label: 'SoundCloud',
  aspectRatio: null,
  match(url): EmbedRef | null {
    if (host(url) !== 'soundcloud.com' && host(url) !== 'www.soundcloud.com' && host(url) !== 'm.soundcloud.com') {
      return null;
    }
    const parts = pathParts(url);
    const user = parts[0];
    if (!fits(user, soundcloudSlug) || soundcloudReserved.has(user.toLowerCase())) return null;
    if (parts.length === 3 && parts[1] === 'sets' && fits(parts[2], soundcloudSlug)) return { user, set: parts[2] };
    if (
      parts.length === 2 &&
      fits(parts[1], soundcloudSlug) &&
      !['sets', 'tracks', 'albums', 'likes'].includes(parts[1])
    ) {
      return { user, track: parts[1] };
    }
    return null;
  },
  frame(ref) {
    return {
      src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(soundcloudPage(ref))}&visual=false&show_teaser=false`,
      title: 'SoundCloud player',
      allow: 'autoplay; encrypted-media',
      sandbox: `${scripts} ${popups}`,
      aspectRatio: null,
      height: ref.set ? 450 : 166,
    };
  },
  canonicalUrl: soundcloudPage,
  oembed: (ref) => `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(soundcloudPage(ref))}`,
};

// ---------------------------------------------------------------------------------------------------------------------
// X (Twitter)
// ---------------------------------------------------------------------------------------------------------------------

const xHosts = new Set(['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com', 'mobile.twitter.com', 'mobile.x.com']);
const xUser = /^[A-Za-z0-9_]{1,15}$/;
const xId = /^\d{1,20}$/;

/** Posts on X, from x.com or twitter.com links. */
export const x: EmbedProvider = {
  name: 'x',
  label: 'X',
  aspectRatio: null,
  match(url): EmbedRef | null {
    if (!xHosts.has(host(url))) return null;
    const parts = pathParts(url);
    const [user, status, id] = parts;
    if (
      (parts.length === 3 || (parts.length === 5 && ['photo', 'video'].includes(parts[3] ?? ''))) &&
      status === 'status'
    ) {
      return fits(user, xUser) && fits(id, xId) ? { user, id } : null;
    }
    return null;
  },
  frame(ref) {
    return {
      src: `https://platform.twitter.com/embed/Tweet.html?id=${ref.id}&dnt=true`,
      title: 'Post on X',
      allow: 'encrypted-media; fullscreen',
      sandbox: `${scripts} ${popups}`,
      aspectRatio: null,
      height: 560,
    };
  },
  canonicalUrl: (ref) => `https://x.com/${ref.user}/status/${ref.id}`,
  oembed: (ref) =>
    `https://publish.twitter.com/oembed?omit_script=true&dnt=true&url=${encodeURIComponent(`https://twitter.com/${ref.user}/status/${ref.id}`)}`,
};

// ---------------------------------------------------------------------------------------------------------------------
// Instagram
// ---------------------------------------------------------------------------------------------------------------------

const instagramKinds = new Set(['p', 'reel', 'tv']);
const instagramCode = /^[A-Za-z0-9_-]{5,40}$/;

/** Instagram posts, reels and videos. Instagram has no public oEmbed endpoint. */
export const instagram: EmbedProvider = {
  name: 'instagram',
  label: 'Instagram',
  aspectRatio: null,
  match(url): EmbedRef | null {
    if (host(url) !== 'instagram.com' && host(url) !== 'www.instagram.com') return null;
    let parts = pathParts(url);
    // instagram.com/<user>/p/<code>/ is the same post.
    if (parts.length === 3 && /^[A-Za-z0-9._]{1,30}$/.test(parts[0] ?? '') && instagramKinds.has(parts[1] ?? '')) {
      parts = parts.slice(1);
    }
    if (parts[2] === 'embed') parts = parts.slice(0, 2);
    const [kind, code] = parts;
    return parts.length === 2 && kind && instagramKinds.has(kind) && fits(code, instagramCode) ? { kind, code } : null;
  },
  frame(ref) {
    return {
      src: `https://www.instagram.com/${ref.kind}/${ref.code}/embed/`,
      title: 'Instagram post',
      allow: 'encrypted-media; fullscreen',
      sandbox: `${scripts} ${popups}`,
      aspectRatio: null,
      height: 640,
    };
  },
  canonicalUrl: (ref) => `https://www.instagram.com/${ref.kind}/${ref.code}/`,
};

// ---------------------------------------------------------------------------------------------------------------------
// TikTok
// ---------------------------------------------------------------------------------------------------------------------

const tiktokUser = /^@[A-Za-z0-9._]{1,30}$/;
const tiktokId = /^\d{8,25}$/;

/** TikTok videos. */
export const tiktok: EmbedProvider = {
  name: 'tiktok',
  label: 'TikTok',
  aspectRatio: 9 / 16,
  match(url): EmbedRef | null {
    if (host(url) !== 'tiktok.com' && host(url) !== 'www.tiktok.com' && host(url) !== 'm.tiktok.com') return null;
    const parts = pathParts(url);
    if (parts.length === 3 && fits(parts[0], tiktokUser) && parts[1] === 'video' && fits(parts[2], tiktokId)) {
      return { user: parts[0].slice(1), id: parts[2] };
    }
    if (parts.length === 3 && parts[0] === 'embed' && parts[1] === 'v2' && fits(parts[2], tiktokId))
      return { id: parts[2] };
    if (parts.length === 3 && parts[0] === 'player' && parts[1] === 'v1' && fits(parts[2], tiktokId))
      return { id: parts[2] };
    return null;
  },
  frame(ref) {
    return {
      src: `https://www.tiktok.com/player/v1/${ref.id}?rel=0`,
      title: 'TikTok video',
      allow: 'autoplay; encrypted-media; fullscreen; picture-in-picture',
      sandbox: `${scripts} allow-presentation ${popups}`,
      aspectRatio: 9 / 16,
      height: null,
    };
  },
  canonicalUrl: (ref) =>
    ref.user && /^[A-Za-z0-9._]{1,30}$/.test(ref.user)
      ? `https://www.tiktok.com/@${ref.user}/video/${ref.id}`
      : `https://www.tiktok.com/embed/v2/${ref.id}`,
  oembed: (ref) =>
    `https://www.tiktok.com/oembed?url=${encodeURIComponent(`https://www.tiktok.com/@${ref.user ?? 'user'}/video/${ref.id}`)}`,
};

// ---------------------------------------------------------------------------------------------------------------------
// CodePen
// ---------------------------------------------------------------------------------------------------------------------

const codepenUser = /^[A-Za-z0-9_-]{1,40}$/;
const codepenSlug = /^[A-Za-z0-9]{3,20}$/;

function codepenOwner(ref: EmbedRef): string {
  return ref.team ? `https://codepen.io/team/${ref.team}` : `https://codepen.io/${ref.user}`;
}

/** CodePen pens, a person's or a team's. */
export const codepen: EmbedProvider = {
  name: 'codepen',
  label: 'CodePen',
  aspectRatio: null,
  match(url): EmbedRef | null {
    if (host(url) !== 'codepen.io') return null;
    const parts = pathParts(url);
    const views = ['pen', 'embed', 'full', 'details'];
    // codepen.io/team/<team>/pen/<pen> is a team's pen.
    if (parts.length === 4 && parts[0] === 'team' && fits(parts[1], codepenUser) && views.includes(parts[2] ?? '')) {
      return fits(parts[3], codepenSlug) ? { team: parts[1], pen: parts[3] } : null;
    }
    if (parts.length === 3 && parts[0] !== 'team' && fits(parts[0], codepenUser) && views.includes(parts[1] ?? '')) {
      return fits(parts[2], codepenSlug) ? { user: parts[0], pen: parts[2] } : null;
    }
    return null;
  },
  frame(ref) {
    return {
      src: `${codepenOwner(ref)}/embed/${ref.pen}?default-tab=result`,
      title: 'CodePen',
      allow: 'clipboard-write; encrypted-media; fullscreen',
      sandbox: `${scripts} allow-forms allow-modals ${popups}`,
      aspectRatio: null,
      height: 420,
    };
  },
  canonicalUrl: (ref) => `${codepenOwner(ref)}/pen/${ref.pen}`,
  oembed: (ref) =>
    `https://codepen.io/api/oembed?format=json&url=${encodeURIComponent(`${codepenOwner(ref)}/pen/${ref.pen}`)}`,
};

// ---------------------------------------------------------------------------------------------------------------------
// Loom
// ---------------------------------------------------------------------------------------------------------------------

const loomId = /^[a-f0-9]{32}$/;

/** Loom recordings. */
export const loom: EmbedProvider = {
  name: 'loom',
  label: 'Loom',
  aspectRatio: 16 / 9,
  match(url): EmbedRef | null {
    if (host(url) !== 'loom.com' && host(url) !== 'www.loom.com') return null;
    const parts = pathParts(url);
    return parts.length === 2 && (parts[0] === 'share' || parts[0] === 'embed') && fits(parts[1], loomId)
      ? { id: parts[1] }
      : null;
  },
  frame(ref) {
    return {
      src: `https://www.loom.com/embed/${ref.id}`,
      title: 'Loom video',
      allow: 'autoplay; encrypted-media; fullscreen; picture-in-picture',
      sandbox: `${scripts} allow-presentation ${popups}`,
      aspectRatio: 16 / 9,
      height: null,
    };
  },
  canonicalUrl: (ref) => `https://www.loom.com/share/${ref.id}`,
  oembed: (ref) => `https://www.loom.com/v1/oembed?url=${encodeURIComponent(`https://www.loom.com/share/${ref.id}`)}`,
};

// ---------------------------------------------------------------------------------------------------------------------
// Figma
// ---------------------------------------------------------------------------------------------------------------------

const figmaKinds = new Set(['file', 'design', 'proto', 'board', 'slides']);
const figmaKey = /^[A-Za-z0-9]{10,40}$/;
const figmaNode = /^\d{1,10}[-:]\d{1,10}$/;

function figmaPage(ref: EmbedRef): string {
  return `https://www.figma.com/${ref.kind}/${ref.key}${ref.node ? `?node-id=${ref.node}` : ''}`;
}

/** Figma files, designs, prototypes, boards and slides. */
export const figma: EmbedProvider = {
  name: 'figma',
  label: 'Figma',
  aspectRatio: 16 / 10,
  match(url): EmbedRef | null {
    if (host(url) !== 'figma.com' && host(url) !== 'www.figma.com') return null;
    const parts = pathParts(url);
    const [kind, key] = parts;
    if (parts.length < 2 || parts.length > 3 || !kind || !figmaKinds.has(kind) || !fits(key, figmaKey)) return null;
    if (parts[2] !== undefined && !/^[A-Za-z0-9._~%-]{1,200}$/.test(parts[2])) return null;
    const node = url.searchParams.get('node-id');
    return { kind, key, ...(fits(node, figmaNode) ? { node: node.replace(':', '-') } : {}) };
  },
  frame(ref) {
    return {
      src: `https://www.figma.com/embed?embed_host=post-canvas&url=${encodeURIComponent(figmaPage(ref))}`,
      title: 'Figma',
      allow: 'clipboard-write; fullscreen',
      sandbox: `${scripts} ${popups}`,
      aspectRatio: 16 / 10,
      height: null,
    };
  },
  canonicalUrl: figmaPage,
};

// ---------------------------------------------------------------------------------------------------------------------
// Google Maps
// ---------------------------------------------------------------------------------------------------------------------

const mapsHosts = new Set(['google.com', 'www.google.com', 'maps.google.com']);
const coordinate = /^-?\d{1,3}(?:\.\d{1,8})?$/;
const zoom = /^\d{1,2}(?:\.\d{1,4})?$/;
// A place name or address: letters, digits, spaces and common address punctuation only.
const placeQuery = /^[\p{L}\p{N}\p{M} ,.'\u2019&#+\-/()]{1,200}$/u;

function mapsQuery(ref: EmbedRef): string {
  return ref.q ?? `${ref.lat},${ref.lng}`;
}

function inRange(lat: string, lng: string): boolean {
  return Math.abs(Number(lat)) <= 90 && Math.abs(Number(lng)) <= 180;
}

/** Google Maps places, searches and map positions. Short `maps.app.goo.gl` links need a server lookup, so they aren't matched. */
export const googleMaps: EmbedProvider = {
  name: 'google-maps',
  label: 'Google Maps',
  aspectRatio: 4 / 3,
  match(url): EmbedRef | null {
    if (!mapsHosts.has(host(url))) return null;
    const parts = pathParts(url);
    if (host(url) !== 'maps.google.com' && parts[0] !== 'maps') return null;
    const rest = host(url) === 'maps.google.com' && parts[0] !== 'maps' ? parts : parts.slice(1);
    const z = (value: string | undefined): EmbedRef =>
      fits(value, zoom) ? { z: String(Math.round(Number(value))) } : {};
    const query = url.searchParams.get('q') ?? url.searchParams.get('query');
    if (query !== null) {
      const q = query.trim();
      return fits(q, placeQuery) ? { q, ...z(url.searchParams.get('z') ?? undefined) } : null;
    }
    // /maps/place/<name>/@lat,lng,15z or /maps/search/<query> or /maps/@lat,lng,15z
    const at = rest.find((part) => part.startsWith('@'));
    const position = at ? /^@(-?[\d.]+),(-?[\d.]+)(?:,([\d.]+)z)?/.exec(at) : null;
    if ((rest[0] === 'place' || rest[0] === 'search') && rest[1]) {
      let name: string;
      try {
        name = decodeURIComponent(rest[1].replace(/\+/g, ' ')).trim();
      } catch {
        return null;
      }
      if (fits(name, placeQuery)) return { q: name, ...z(position?.[3]) };
      return null;
    }
    if (
      position &&
      fits(position[1], coordinate) &&
      fits(position[2], coordinate) &&
      inRange(position[1], position[2])
    ) {
      return { lat: position[1], lng: position[2], z: z(position[3]).z ?? '15' };
    }
    return null;
  },
  frame(ref) {
    return {
      src: `https://maps.google.com/maps?q=${encodeURIComponent(mapsQuery(ref))}${ref.z ? `&z=${ref.z}` : ''}&output=embed`,
      title: 'Google Maps',
      allow: 'fullscreen',
      sandbox: `${scripts} ${popups}`,
      aspectRatio: 4 / 3,
      height: null,
    };
  },
  canonicalUrl(ref) {
    if (ref.q) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ref.q)}${ref.z ? `&z=${ref.z}` : ''}`;
    }
    return `https://www.google.com/maps/@${ref.lat},${ref.lng},${ref.z ?? '15'}z`;
  },
};

/** The built-in providers for the `embed` node, in the order they are tried. */
export const embedProviders: readonly EmbedProvider[] = [
  spotify,
  soundcloud,
  x,
  instagram,
  tiktok,
  codepen,
  loom,
  figma,
  googleMaps,
];
