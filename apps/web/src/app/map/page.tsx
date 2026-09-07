import type { Metadata } from 'next';
import MapSection from '@/components/MapSection';
import { getApiBase } from '@/lib/api-base';

export const metadata: Metadata = {
  title: 'Mapa-múndi',
  description: 'Clubes de futebol no mapa-múndi — Almanaque dos Clubes.',
};

interface MapPoint {
  id: string;
  name: string;
  country?: string | null;
  latitude: number;
  longitude: number;
}

interface MapData {
  points: MapPoint[];
  /** Total auditável da API (nem todo clube entra no mapa — limit de marcadores). */
  withCoords: number;
  totalClubs: number;
}

// T428/1.3 — count em runtime, nunca valor assado no build:
// `data` vem truncado pelo cap de `limit` da API (max 100), então o número
// público precisa vir do campo `total` — a métrica auditável da mesma resposta.
async function getMapData(): Promise<MapData> {
  const fallback: MapData = { points: [], withCoords: 0, totalClubs: 0 };
  try {
    const [coordsRes, allRes] = await Promise.all([
      fetch(`${getApiBase()}/clubs?hasCoordinates=true&limit=100`, { cache: 'no-store' }),
      fetch(`${getApiBase()}/clubs?limit=1`, { cache: 'no-store' }),
    ]);
    if (!coordsRes.ok || !allRes.ok) return fallback;
    const coordsJson = await coordsRes.json();
    const allJson = await allRes.json();
    return {
      points: (coordsJson.data ?? []) as MapPoint[],
      withCoords: (coordsJson.total ?? 0) as number,
      totalClubs: (allJson.total ?? 0) as number,
    };
  } catch {
    return fallback;
  }
}

export default async function MapPage() {
  const { points, withCoords, totalClubs } = await getMapData();
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground text-center">
        Mapa-múndi
      </h1>
      <p className="text-center text-foreground/60 max-w-xl mx-auto mt-2 mb-6">
        {withCoords} de {totalClubs} clubes com coordenadas conhecidas. Clique em um ponto para ver
        o clube.
      </p>
      <MapSection clubs={points} />
    </div>
  );
}
