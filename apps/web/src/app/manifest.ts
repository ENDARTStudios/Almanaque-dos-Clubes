import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Almanaque dos Clubes',
    short_name: 'Almanaque',
    description: 'A história do futebol mundial num só lugar',
    start_url: '/',
    display: 'standalone',
    background_color: '#faf8f5',
    theme_color: '#be123c',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
