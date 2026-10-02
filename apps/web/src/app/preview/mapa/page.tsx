import type { Metadata } from 'next';
import GeoMapInternal from '@/components/GeoMapInternal';

// WS-C-3 FASE 3 (local/off) — rota INTERNA de prévia do mapa. NÃO pública:
// noindex/nofollow, fora do nav, não linkada na home, não no sitemap.
// Não remover o noindex nem promover até WS-C-3 FASE 4 (aprovação + janela).
export const metadata: Metadata = {
  title: 'Prévia interna do mapa',
  robots: { index: false, follow: false },
};

export default function PreviewMapaPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">
        Mapa (prévia interna)
      </h1>
      <p className="text-sm text-foreground/60 mt-2 mb-6">
        Protótipo interno, não público. Ontologia honesta: só clubes com coordenada são plotados; a
        lista é o caminho principal; atribuição por camada visível.
      </p>
      <GeoMapInternal />
    </div>
  );
}
