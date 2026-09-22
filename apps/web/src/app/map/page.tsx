import type { Metadata } from 'next';
import MapExplorer, { type GeoStats } from '@/components/MapExplorer';
import { getApiBase } from '@/lib/api-base';

export const metadata: Metadata = {
  title: 'Mapa-múndi',
  description:
    'Clubes de futebol por continente, país e estado — navegação read-only sobre a hierarquia geográfica auditável.',
};

// T467 — choropleth por região (COUNT real derivado do banco via T466). O número
// público vem da agregação server-side (`/clubs/geo-stats`), não de valor assado.
async function getStats(): Promise<GeoStats | null> {
  try {
    const res = await fetch(`${getApiBase()}/clubs/geo-stats`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return ((await res.json()) as { data: GeoStats }).data;
  } catch {
    return null;
  }
}

export default async function MapPage() {
  const stats = await getStats();
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground text-center">
        Mapa-múndi
      </h1>
      {stats ? (
        <p className="text-center text-foreground/60 max-w-2xl mx-auto mt-2 mb-6">
          {stats.totals.clubsWithCountry} clubes em {stats.totals.countries} países e{' '}
          {stats.totals.states} estados. Mapa por região (read-only); clique para descer de nível e
          ver os clubes abaixo. Onde não há fronteira/coordenada, a navegação é pela lista —
          vazio-honesto.
        </p>
      ) : (
        <p className="text-center text-foreground/60 mt-2 mb-6">
          Agregação indisponível no momento.
        </p>
      )}
      {stats ? (
        <MapExplorer stats={stats} />
      ) : (
        <div className="rounded-2xl border border-border p-6 text-sm text-foreground/60">
          Não foi possível carregar o mapa agora. Tente novamente.
        </div>
      )}
    </div>
  );
}
