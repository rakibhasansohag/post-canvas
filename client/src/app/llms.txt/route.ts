import { withIntro } from '@/components/seo/llms';
import { docsLlms } from '@/lib/source';

export const revalidate = false;

export async function GET() {
  const docs = (await docsLlms.serve('/llms.txt'))!;
  return new Response(withIntro(await docs.text()), { headers: docs.headers });
}
