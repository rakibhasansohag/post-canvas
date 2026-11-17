import { renderOgImage, ogSize } from '@/lib/og';
import { appName } from '@/lib/shared';

export const dynamic = 'force-static';
export const alt = `${appName}: posts with photos, video and links in one React editor`;
export const size = ogSize;
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return renderOgImage({
    label: 'Open source · MIT',
    title: 'Posts with photos, video and links in one editor',
    mark: 'photos',
    description: 'A React rich-text editor with galleries, embeds and safe output. Built on Tiptap.',
  });
}
