import type { Metadata } from 'next';
import GeoMapInternal from '@/components/GeoMapInternal';

// WS-C-3 FASE 3+4 — /map como rota PÚBLICA do mapa (configuração aplicada na release).
// Honestidade geográfica: só clubes com coordenada são plotados; a lista é o caminho principal;
// atribuição por camada visível. Fonte dos pontos: GET /api/v1/geo/points (read-only).
export const metadata: Metadata = {
  title: 'Mapa-múndi',
  description:
    'Clubes de futebol por país, com coordenada auditável e atribuição por fonte (OpenStreetMap/ODbL, Wikidata CC0, Natural Earth). Clubes sem coordenada aparecem em lista (vazio-honesto).',
  alternates: { canonical: '/map' },
};

export default function MapPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground">Mapa-múndi</h1>
      <p className="text-foreground/60 max-w-3xl mt-2 mb-6">
        Clubes com coordenada auditável, por país. A <strong>lista</strong> é o caminho principal; o
        mapa é acessório. Clubes sem coordenada <strong>não</strong> são plotados — aparecem no
        contador de “sem localização” (vazio-honesto). Atribuição por fonte logo abaixo do mapa.
      </p>
      <GeoMapInternal />
    </div>
  );
}
