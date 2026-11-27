import type { MetadataRoute } from 'next';

// Web app manifest: name, colours and icons used when Leadio is added to a phone's home screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Leadio',
    short_name: 'Leadio',
    description: 'Call and WhatsApp your Meta ad leads from your phone.',
    start_url: '/app',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#EDEFF2',
    theme_color: '#EDEFF2',
    icons: [
      { src: '/app-icon/192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/app-icon/512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/app-icon/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
