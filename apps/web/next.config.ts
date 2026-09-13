import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // TTL longo: evita re-transformar a mesma imagem a cada visita.
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 dias
    // Poucas larguras = poucas variantes por imagem no srcset.
    deviceSizes: [640, 1080, 1920],
    imageSizes: [64, 128, 256],
    formats: ['image/avif', 'image/webp'],
    // Whitelist mínima: fecha o otimizador como proxy aberto.
    // Novas origens entram por PR com justificativa.
    remotePatterns: [{ protocol: 'https', hostname: 'upload.wikimedia.org' }],
    // Flag para testes de carga/E2E e ambientes sem cota.
    unoptimized: process.env.DISABLE_IMAGE_OPTIMIZATION === '1',
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            // T-vis-01: style-src inclui fonts.googleapis.com e font-src inclui
            // fonts.gstatic.com — sem isso o CSP bloqueia as fontes Barlow/
            // Barlow Condensed e o site cai para fonte de sistema (console:
            // "Loading the stylesheet ... violates CSP" em todas as páginas).
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https://a.tile.openstreetmap.org https://b.tile.openstreetmap.org https://c.tile.openstreetmap.org; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://api.almanaquedosclubes.com https://*.up.railway.app; frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
