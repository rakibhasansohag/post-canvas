import { llmsIntro } from '@/components/seo/llms';
import { docsLlms } from '@/lib/source';

export const revalidate = false;

export async function GET() {
  const docs = (await docsLlms.serve('/llms-full.txt'))!;
  return new Response(`${llmsIntro()}${await docs.text()}`, { headers: docs.headers });
}
