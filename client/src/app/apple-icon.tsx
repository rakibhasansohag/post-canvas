import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** The home-screen icon: the mark on a full-bleed accent square (iOS rounds the corners itself). */
export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', background: '#2f5fd0' }}>
      <svg width="180" height="180" viewBox="4 4 24 24">
        <rect x="8" y="7.5" width="12" height="3" rx="1.5" fill="#ffffff" />
        <rect x="8" y="13.5" width="16" height="11" rx="2.5" fill="#ffffff" />
        <circle cx="20" cy="17" r="1.6" fill="#2f5fd0" />
        <path
          d="M8 22.2 12.6 18l3.4 3 2.4-1.9 5.6 4.2V22a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 8 22Z"
          fill="#2f5fd0"
        />
      </svg>
    </div>,
    size,
  );
}
