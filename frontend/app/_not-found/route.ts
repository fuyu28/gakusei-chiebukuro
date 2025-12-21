export const runtime = 'edge';

export function GET() {
  return new Response('Not Found', { status: 404 });
}
