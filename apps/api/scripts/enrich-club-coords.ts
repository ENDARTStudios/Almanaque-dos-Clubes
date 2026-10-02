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
 *
 * T428 FASE 5 — `parseP625` e `fetchCoords` exportados para teste offline
 * (mocks de `globalThis.fetch`); `main()` só roda quando o script é invocado direto.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const USER_AGENT =
  'AlmanaqueDosClubes/0.1 (wikidata coord enrich; https://github.com/ENDARTStudios/Almanaque-dos-Clubes)';

export interface Coord {
  lat: number;
  lng: number;
}

/**
 * Extrai P625 de um item Wikidata. Retorna null quando a propriedade está
 * ausente ou o valor está malformado (latitude/longitude não-numéricas) — o
 * clube é então pulado (sem overwrite). Puro, sem I/O.
 */
export function parseP625(claims: Record<string, unknown> | undefined): Coord | null {
  const entry = (claims as { P625?: Array<unknown> } | undefined)?.P625?.[0] as
    | { mainsnak?: { datavalue?: { value?: { latitude?: unknown; longitude?: unknown } } } }
    | undefined;
  const v = entry?.mainsnak?.datavalue?.value;
  if (!v) return null;
  if (typeof v.latitude !== 'number' || typeof v.longitude !== 'number') return null;
  return { lat: v.latitude, lng: v.longitude };
}

export async function fetchCoords(qids: string[]): Promise<Map<string, Coord>> {
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
      entities?: Record<string, { claims?: Record<string, unknown> }>;
    };
    for (const [qid, ent] of Object.entries(j.entities ?? {})) {
      const coord = parseP625(ent.claims);
      if (coord) map.set(qid, coord);
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

// Guarda de importação: em testes (vitest) o módulo é importado sem executar.
const invokedAsScript = (process.argv[1] ?? '')
  .replace(/\\/g, '/')
  .endsWith('scripts/enrich-club-coords.ts');
if (invokedAsScript) {
  main()
    .catch((err) => {
      console.error('Erro:', (err as Error).message);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
