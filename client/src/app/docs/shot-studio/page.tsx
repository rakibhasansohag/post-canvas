// TEMPORARY: the screenshot frame. Delete this folder and components/docs/shot-studio.tsx after capture.
import type { Metadata } from 'next';
import { ShotStudio } from '@/components/docs/shot-studio';

export const metadata: Metadata = { title: 'Shot studio', robots: { index: false, follow: false } };

export default function ShotStudioPage() {
  return (
    <div style={{ padding: 16 }}>
      <ShotStudio />
    </div>
  );
}
