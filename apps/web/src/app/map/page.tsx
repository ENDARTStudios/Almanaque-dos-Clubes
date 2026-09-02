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

async function getCoordsClubs(): Promise<MapPoint[]> {
  try {
    const res = await fetch(`${getApiBase()}/clubs?hasCoordinates=true&limit=500`, { cache: 'no-store' });
    if (!res.ok) return [];
    const j = await res.json();
    return (j.data ?? []) as MapPoint[];
  } catch {
    return [];
  }
}

export default async function MapPage() {
  const clubs = await getCoordsClubs();
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground text-center">Mapa-múndi</h1>
      <p className="text-center text-foreground/60 max-w-xl mx-auto mt-2 mb-6">
        {clubs.length} clubes com coordenadas conhecidas. Clique em um ponto para ver o clube.
      </p>
      <MapSection clubs={clubs} />
    </div>
  );
}
