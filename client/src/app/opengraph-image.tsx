import { ImageResponse } from 'next/og';
import { appDescription, appName } from '@/lib/shared';

export const dynamic = 'force-static';
export const alt = `${appName}: a rich-text editor with a media canvas`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 80,
        background: '#0e1320',
        color: '#f3f5fb',
      }}
    >
      <div style={{ fontSize: 28, color: '#7aa2f7', marginBottom: 24 }}>Open source, MIT</div>
      <div style={{ fontSize: 96, fontWeight: 700, marginBottom: 24 }}>{appName}</div>
      <div style={{ fontSize: 34, color: '#b8c0d8', maxWidth: 900, lineHeight: 1.35 }}>{appDescription}</div>
    </div>,
    size,
  );
}
