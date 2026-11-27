import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import NoZoom from './NoZoom';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-jakarta' });

export const metadata: Metadata = {
  title: 'Leadio',
  description: 'Call and WhatsApp your Meta ad leads from your phone.',
};
// App-like on phones: no pinch/double-tap zoom (all inputs are 16px, so iOS never zooms on focus).
export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: 'cover', themeColor: '#EDEFF2' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body><NoZoom />{children}</body>
    </html>
  );
}
