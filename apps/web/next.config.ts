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
    remotePatterns: [
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      // T502 — mídia do acervo (escudos/fotos via Special:FilePath do Commons)
      { protocol: 'https', hostname: 'commons.wikimedia.org', pathname: '/wiki/Special:FilePath/**' },
      { protocol: 'https', hostname: 'flagcdn.com' },
    ],
    // Flag para testes de carga/E2E e ambientes sem cota.
    unoptimized: process.env.DISABLE_IMAGE_OPTIMIZATION === '1',
    // T502 — escudos do Commons são majoritariamente SVG; o next/image
    // bloqueia SVG remoto por padrão (imagem quebrada, naturalWidth=0).
    // O CSP restringe img-src aos domínios do Commons.
    dangerouslyAllowSVG: true,
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
            // Auditoria 08-10 (P2): 'unsafe-eval' REMOVIDO do script-src —
            // nada no bundle de produção usa eval (Leaflet/recharts/GSAP não
            // usam). 'unsafe-inline' permanece (exigido pelos scripts inline
            // de bootstrap do Next sem nonce); migração para nonce = M5.
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https://a.tile.openstreetmap.org https://b.tile.openstreetmap.org https://c.tile.openstreetmap.org https://commons.wikimedia.org https://upload.wikimedia.org https://flagcdn.com; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://api.almanaquedosclubes.com wss://api.almanaquedosclubes.com https://*.up.railway.app wss://*.up.railway.app; frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
