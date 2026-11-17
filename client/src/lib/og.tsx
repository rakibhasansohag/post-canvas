import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

// Static instances of the site's OFL fonts (Bricolage Grotesque, Geist, Geist Mono), subset to Latin.
const fontDir = join(process.cwd(), 'src/assets/fonts');

async function loadFonts() {
  const [display, sans, mono] = await Promise.all([
    readFile(join(fontDir, 'bricolage-grotesque-bold.ttf')),
    readFile(join(fontDir, 'geist-regular.ttf')),
    readFile(join(fontDir, 'geist-mono-medium.ttf')),
  ]);
  return [
    { name: 'Bricolage Grotesque', data: display, weight: 700 as const, style: 'normal' as const },
    { name: 'Geist', data: sans, weight: 400 as const, style: 'normal' as const },
    { name: 'Geist Mono', data: mono, weight: 500 as const, style: 'normal' as const },
  ];
}

export const ogSize = { width: 1200, height: 630 };

function Mark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="8" fill="#7aa2f7" />
      <rect x="8" y="7.5" width="12" height="3" rx="1.5" fill="#0e1320" />
      <rect x="8" y="13.5" width="16" height="11" rx="2.5" fill="#0e1320" />
      <circle cx="20" cy="17" r="1.6" fill="#7aa2f7" />
      <path d="M8 22.2 12.6 18l3.4 3 2.4-1.9 5.6 4.2V22a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 8 22Z" fill="#7aa2f7" />
    </svg>
  );
}

/**
 * The site's Open Graph image: the mark and name, a label, a large title and a line of description on the deep ink
 * ground with the dot grid. `mark` highlights one word of the title, as on the home page.
 */
export async function renderOgImage({
  label,
  title,
  description,
  mark,
}: {
  label: string;
  title: string;
  description?: string;
  mark?: string;
}) {
  const fonts = await loadFonts();
  const words = title.split(' ');
  const long = title.length > 48;
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px 72px',
        background: '#0e1320',
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.09) 1.5px, transparent 1.5px)',
        backgroundSize: '24px 24px',
        color: '#ffffff',
        fontFamily: 'Geist',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Mark size={52} />
        <span style={{ fontFamily: 'Bricolage Grotesque', fontSize: 34, letterSpacing: '-0.02em' }}>Post Canvas</span>
        <span
          style={{
            marginLeft: 'auto',
            fontFamily: 'Geist Mono',
            fontSize: 20,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#b8c0d8',
          }}
        >
          {label}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            fontFamily: 'Bricolage Grotesque',
            fontSize: long ? 64 : 84,
            lineHeight: 1.02,
            letterSpacing: '-0.035em',
            maxWidth: 1000,
          }}
        >
          {words.map((word, index) => (
            <span key={index} style={{ display: 'flex', marginRight: '0.24em' }}>
              {mark && word.startsWith(mark) ? (
                <>
                  <span
                    style={{
                      background: '#fbf1c2',
                      color: '#1c1d1f',
                      borderRadius: 10,
                      padding: '0 8px',
                      margin: '0 -4px',
                    }}
                  >
                    {mark}
                  </span>
                  {word.slice(mark.length)}
                </>
              ) : (
                word
              )}
            </span>
          ))}
        </div>
        {description && (
          <div style={{ fontSize: 28, lineHeight: 1.4, color: '#b8c0d8', maxWidth: 940 }}>{description}</div>
        )}
      </div>
    </div>,
    { ...ogSize, fonts },
  );
}
