/**
 * WS-C / M1 — Enriquecimento de coordenadas (latitude/longitude) dos clubes via Wikidata (P625).
 *
 * Busca P625 (coordinate location) para os clubes já ingeridos (`qid` presente) e grava
 * `latitude`/`longitude`. Fonte: Wikidata (CC0). Base para o mapa-múndi (Leaflet).
 *
 * Uso:
 *   pnpm --filter @almanaque/api exec tsx scripts/enrich-club-coords.ts          # DRY-RUN
 *   pnpm --filter @almanaque/api exec tsx scripts/enrich-club-coords.ts --apply  # grava
 *
 * Reversível: `UPDATE clubs SET latitude=NULL, longitude=NULL WHERE "importedFrom"='wikidata';`
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const USER_AGENT =
  'AlmanaqueDosClubes/0.1 (wikidata coord enrich; https://github.com/ENDARTStudios/Almanaque-dos-Clubes)';

interface Coord {
  lat: number;
  lng: number;
}

async function fetchCoords(qids: string[]): Promise<Map<string, Coord>> {
  const map = new Map<string, Coord>();
  for (let i = 0; i < qids.length; i += 50) {
    const batch = qids.slice(i, i + 50);
    const url =
      'https://www.wikidata.org/w/api.php?action=wbgetentities&ids=' +
      encodeURIComponent(batch.join('|')) +
      '&props=claims&format=json&language=en';
    const res = await fetch(url, { headers: { 'user-agent': USER_AGENT } });
    if (!res.ok) throw new Error('Wikidata API HTTP ' + res.status);
    const j = (await res.json()) as {
      entities?: Record<
        string,
        {
          claims?: Record<
            string,
            Array<{
              mainsnak?: { datavalue?: { value?: { latitude?: number; longitude?: number } } };
            }>
          >;
        }
      >;
    };
    for (const [qid, ent] of Object.entries(j.entities ?? {})) {
      const p625 = ent.claims?.P625?.[0]?.mainsnak?.datavalue?.value;
      if (p625 && typeof p625.latitude === 'number' && typeof p625.longitude === 'number') {
        map.set(qid, { lat: p625.latitude, lng: p625.longitude });
      }
    }
  }
  return map;
}

async function main(): Promise<void> {
  const clubs = await prisma.club.findMany({
    where: { qid: { not: null } },
    select: { id: true, qid: true, latitude: true, longitude: true },
  });
  const qids = clubs.map((c) => c.qid as string);
  console.log('Clubes com qid: ' + qids.length);
  const coords = await fetchCoords(qids);
  console.log('Com coordenada P625 encontrada: ' + coords.size);

  if (!APPLY) {
    console.log('DRY-RUN — nada gravado. Rode com --apply.');
    for (const c of clubs.slice(0, 4)) {
      const coord = coords.get(c.qid as string);
      if (coord)
        console.log('  ' + c.qid + ' -> ' + coord.lat.toFixed(4) + ', ' + coord.lng.toFixed(4));
    }
    return;
  }

  let updated = 0;
  for (const c of clubs) {
    const coord = coords.get(c.qid as string);
    if (coord) {
      await prisma.club.update({
        where: { id: c.id },
        data: { latitude: coord.lat, longitude: coord.lng },
      });
      updated++;
    }
  }
  const totalWith = await prisma.club.count({ where: { latitude: { not: null } } });
  console.log('APPLY: updated=' + updated + ' | total com coordenadas=' + totalWith);
}

main()
  .catch((err) => {
    console.error('Erro:', (err as Error).message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
