import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import NoZoom from './NoZoom';
import { THEME_SCRIPT } from './theme';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-jakarta' });

export const metadata: Metadata = {
  title: 'Leadio',
  description: 'Call and WhatsApp your Meta ad leads from your phone.',
  applicationName: 'Leadio',
  // iPhone "Add to Home Screen": opens full-screen with this name. Icons come from app/icon.svg,
  // app/apple-icon.tsx and app/manifest.ts (Next.js links them automatically).
  appleWebApp: { capable: true, title: 'Leadio', statusBarStyle: 'default' },
};
// App-like on phones: no pinch/double-tap zoom (all inputs are 16px, so iOS never zooms on focus).
export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: 'cover', themeColor: '#EDEFF2' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: THEME_SCRIPT may set data-theme on <html> before React loads.
    <html lang="en" className={jakarta.variable} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} /></head>
      <body><NoZoom />{children}</body>
    </html>
  );
}
