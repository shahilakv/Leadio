import { ImageResponse } from 'next/og';
import { LogoMark } from '@/lib/logo';

// PNG app icons for the web app manifest (Android "Add to Home screen" / install):
//   /app-icon/192.png, /app-icon/512.png          — plain
//   /app-icon/maskable-512.png                      — extra margin, Android crops it into its own shape
const FILES: Record<string, { size: number; pad: number }> = {
  '192.png': { size: 192, pad: 0 },
  '512.png': { size: 512, pad: 0 },
  'maskable-512.png': { size: 512, pad: 0.22 },
};

export function generateStaticParams() {
  return Object.keys(FILES).map(file => ({ file }));
}

export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  const f = FILES[(await params).file];
  if (!f) return new Response('Not found', { status: 404 });
  return new ImageResponse(<LogoMark size={f.size} rounded={false} pad={f.pad} />, {
    width: f.size, height: f.size,
    headers: { 'Cache-Control': 'public, max-age=86400, immutable' },
  });
}
