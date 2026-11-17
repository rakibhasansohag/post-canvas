import { describe, expect, it } from 'vitest';
import { matchEmbedUrl, parseEmbedUrl, parseVideoUrl, verifyEmbedRef, getEmbedProvider } from './providers/index';
import { canonicalVideoUrl, videoFrame, withAutoplay } from './providers/video';

const yt = 'dQw4w9WgXcQ';

describe('parseVideoUrl', () => {
  it.each([
    `https://www.youtube.com/watch?v=${yt}`,
    `http://youtube.com/watch?v=${yt}&list=PL123`,
    `https://m.youtube.com/watch?v=${yt}`,
    `https://music.youtube.com/watch?v=${yt}`,
    `https://youtu.be/${yt}`,
    `youtu.be/${yt}`,
    `https://www.youtube.com/embed/${yt}`,
    `https://www.youtube-nocookie.com/embed/${yt}`,
    `https://www.youtube.com/live/${yt}`,
    `  https://www.youtube.com/watch?v=${yt}  `,
  ])('reads YouTube %s', (url) => {
    expect(parseVideoUrl(url)).toMatchObject({ provider: 'youtube', videoId: yt, vertical: false });
  });

  it('makes Shorts vertical', () => {
    expect(parseVideoUrl(`https://www.youtube.com/shorts/${yt}`)).toMatchObject({ videoId: yt, vertical: true });
    expect(videoFrame(parseVideoUrl(`https://youtube.com/shorts/${yt}`)!).aspectRatio).toBeCloseTo(9 / 16);
  });

  it('reads start times', () => {
    expect(parseVideoUrl(`https://youtu.be/${yt}?t=90`)?.start).toBe(90);
    expect(parseVideoUrl(`https://www.youtube.com/watch?v=${yt}&t=1m30s`)?.start).toBe(90);
    expect(parseVideoUrl(`https://vimeo.com/76979871#t=1h2m3s`)?.start).toBe(3723);
    expect(parseVideoUrl(`https://youtu.be/${yt}?t=nonsense`)?.start).toBeNull();
  });

  it.each([
    ['https://vimeo.com/76979871', null],
    ['https://vimeo.com/76979871/8272103f6e', '8272103f6e'],
    ['https://player.vimeo.com/video/76979871?h=8272103f6e', '8272103f6e'],
    ['https://vimeo.com/channels/staffpicks/76979871', null],
    ['https://vimeo.com/showcase/1234/video/76979871', null],
  ])('reads Vimeo %s', (url, hash) => {
    expect(parseVideoUrl(url)).toMatchObject({ provider: 'vimeo', videoId: '76979871', hash });
  });

  it('keeps the unlisted Vimeo hash through canonical and player URLs', () => {
    const video = parseVideoUrl('https://vimeo.com/76979871/8272103f6e')!;
    expect(canonicalVideoUrl(video)).toBe('https://vimeo.com/76979871/8272103f6e');
    expect(videoFrame(video).src).toBe('https://player.vimeo.com/video/76979871?dnt=1&h=8272103f6e');
  });

  it('builds the privacy-friendly players, with autoplay only when asked', () => {
    const src = videoFrame(parseVideoUrl(`https://youtu.be/${yt}`)!).src;
    expect(src).toBe(`https://www.youtube-nocookie.com/embed/${yt}?rel=0&playsinline=1`);
    expect(withAutoplay(src)).toContain('autoplay=1');
  });

  it.each([
    `https://youtube.com.evil.com/watch?v=${yt}`,
    `https://evil.com/youtube.com/watch?v=${yt}`,
    `https://youtube.com@evil.com/watch?v=${yt}`,
    `https://user:pass@www.youtube.com/watch?v=${yt}`,
    `https://www.youtube.com:8443/watch?v=${yt}`,
    `https://www.youtube.com./watch?v=${yt}`,
    `https://notyoutube.com/watch?v=${yt}`,
    `https://youtu.be.evil.com/${yt}`,
    `javascript:alert(1)//youtube.com/watch?v=${yt}`,
    `JaVaScRiPt:alert('https://youtu.be/${yt}')`,
    `data:text/html,https://youtu.be/${yt}`,
    `ftp://youtube.com/watch?v=${yt}`,
    `file:///youtube.com/watch?v=${yt}`,
    'https://www.youtube.com/watch?v=short',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ%22onload',
    'https://www.youtube.com/watch?v=dQw4w9WgX<Q',
    'https://youtu.be/dQw4w9WgXcQ/extra',
    `https://www.youtube.com/watch?v=${yt}\nhttps://evil.com`,
    'https://vimeo.com.evil.org/76979871',
    'https://evilvimeo.com/76979871',
    'https://vimeo.com/76979871/not-a-hash!',
    'https://vimeo.com/abc',
    'https://player.vimeo.com/video/76979871%2F..%2F',
    '',
  ])('refuses %s', (url) => {
    expect(parseVideoUrl(url)).toBeNull();
  });
});

describe('parseEmbedUrl', () => {
  it('refuses user names, ports, other schemes and whitespace', () => {
    expect(parseEmbedUrl('https://open.spotify.com@evil.com/track/x')).toBeNull();
    expect(parseEmbedUrl('https://open.spotify.com:444/track/x')).toBeNull();
    expect(parseEmbedUrl('vbscript:msgbox')).toBeNull();
    expect(parseEmbedUrl('https://exa mple.com')).toBeNull();
    expect(parseEmbedUrl(`https://x.com/${'a'.repeat(3000)}`)).toBeNull();
    expect(parseEmbedUrl('example.com/a')?.href).toBe('https://example.com/a');
  });
});

describe('embed providers', () => {
  it.each([
    [
      'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
      'spotify',
      { type: 'track', id: '4uLU6hMCjMI75M1A2tKUQC' },
    ],
    [
      'https://open.spotify.com/intl-de/album/4uLU6hMCjMI75M1A2tKUQC?si=abc',
      'spotify',
      { type: 'album', id: '4uLU6hMCjMI75M1A2tKUQC' },
    ],
    ['https://soundcloud.com/artist-name/track-name', 'soundcloud', { user: 'artist-name', track: 'track-name' }],
    ['https://soundcloud.com/artist/sets/my-set', 'soundcloud', { user: 'artist', set: 'my-set' }],
    ['https://x.com/jack/status/20', 'x', { user: 'jack', id: '20' }],
    ['https://twitter.com/jack/status/20?s=20', 'x', { user: 'jack', id: '20' }],
    ['https://www.instagram.com/p/CxYz123AbC/', 'instagram', { kind: 'p', code: 'CxYz123AbC' }],
    ['https://www.instagram.com/reel/CxYz123AbC/', 'instagram', { kind: 'reel', code: 'CxYz123AbC' }],
    [
      'https://www.tiktok.com/@scout2015/video/6718335390845095173',
      'tiktok',
      { user: 'scout2015', id: '6718335390845095173' },
    ],
    ['https://codepen.io/someone/pen/abcDEF1', 'codepen', { user: 'someone', pen: 'abcDEF1' }],
    ['https://codepen.io/team/codepen/pen/PNaGbb', 'codepen', { team: 'codepen', pen: 'PNaGbb' }],
    ['https://www.loom.com/share/0123456789abcdef0123456789abcdef', 'loom', { id: '0123456789abcdef0123456789abcdef' }],
    [
      'https://www.figma.com/design/AbCdEfGhIjKlMnOp/My-File?node-id=1-2',
      'figma',
      { kind: 'design', key: 'AbCdEfGhIjKlMnOp', node: '1-2' },
    ],
    [
      'https://www.google.com/maps/place/Eiffel+Tower/@48.8584,2.2945,17z',
      'google-maps',
      { q: 'Eiffel Tower', z: '17' },
    ],
    ['https://www.google.com/maps/@48.8584,2.2945,15z', 'google-maps', { lat: '48.8584', lng: '2.2945', z: '15' }],
    ['https://maps.google.com/?q=Brandenburg+Gate', 'google-maps', { q: 'Brandenburg Gate' }],
  ])('matches %s', (url, provider, ref) => {
    const match = matchEmbedUrl(url);
    expect(match?.provider.name).toBe(provider);
    expect(match?.ref).toEqual(ref);
    // The canonical URL matches back to the same ref.
    expect(verifyEmbedRef(match!.provider, match!.ref)?.url).toBe(match!.url);
    const frame = match!.provider.frame(match!.ref);
    expect(frame.src.startsWith('https://')).toBe(true);
    expect(frame.sandbox).toContain('allow-scripts');
  });

  it.each([
    'https://open.spotify.com.evil.com/track/4uLU6hMCjMI75M1A2tKUQC',
    'https://open.spotify.com/track/short',
    'https://open.spotify.com/user/4uLU6hMCjMI75M1A2tKUQC',
    'https://soundcloud.com/discover',
    'https://x.com.evil.com/jack/status/20',
    'https://x.com/jack/status/abc',
    'https://x.com/jack/likes',
    'https://instagram.com.evil.com/p/CxYz123AbC/',
    'https://www.instagram.com/p/a"b/',
    'https://www.tiktok.com/@user/video/123',
    'https://codepen.io/user/pen/../../x',
    'https://www.loom.com/share/not-hex',
    'https://www.figma.com/file/short',
    'https://www.google.com/search?q=maps',
    'https://www.google.com/maps/place/%3Cscript%3E',
    'https://www.google.com/maps/@91.0,2.0,15z',
    'https://maps.app.goo.gl/abcdef',
    'https://example.com/anything',
  ])('refuses %s', (url) => {
    expect(matchEmbedUrl(url)).toBeNull();
  });

  it('only tries the providers it is given', () => {
    expect(matchEmbedUrl('https://x.com/jack/status/20', ['spotify'])).toBeNull();
    expect(matchEmbedUrl('https://x.com/jack/status/20', ['x'])?.provider.name).toBe('x');
  });

  it('refuses tampered refs that do not round-trip', () => {
    const spotify = getEmbedProvider('spotify')!;
    expect(verifyEmbedRef(spotify, { type: 'track', id: '4uLU6hMCjMI75M1A2tKUQC' })).not.toBeNull();
    expect(verifyEmbedRef(spotify, { type: 'track', id: '4uLU6hMCjMI75M1A2tKUQC/../../evil' })).toBeNull();
    expect(verifyEmbedRef(spotify, { type: 'track', id: '4uLU6hMCjMI75M1A2tKUQC', extra: 'x' })).toBeNull();
    expect(verifyEmbedRef(spotify, { type: 'javascript:', id: '4uLU6hMCjMI75M1A2tKUQC' })).toBeNull();
    expect(verifyEmbedRef(spotify, { type: ['track'], id: '4uLU6hMCjMI75M1A2tKUQC' })).toBeNull();
    expect(verifyEmbedRef(spotify, null)).toBeNull();
    const maps = getEmbedProvider('google-maps')!;
    expect(verifyEmbedRef(maps, { q: '"><script>alert(1)</script>' })).toBeNull();
  });
});
