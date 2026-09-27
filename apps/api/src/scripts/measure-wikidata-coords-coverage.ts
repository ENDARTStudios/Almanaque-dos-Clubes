/**
 * WS-D M1a — FASE 0.1 (READ-ONLY). Mede cobertura de coordenadas via P115 (estádio) / P159 (sede)
 * numa amostra determinística de clubes, para decidir o extrator do M1a-2. NÃO escreve nada.
 *
 * Uso: node dist/scripts/measure-wikidata-coords-coverage.js --sample=100
 */
import { PrismaClient } from '@prisma/client';
import { fetchEntities, type WikidataEntity } from '../lib/wikidata/wikidata-client.js';
import { extractCoordinate, extractP131Qid } from '../lib/wikidata/enrich-attributes.js';

function argNum(name: string, def: number): number {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  const n = a ? Number.parseInt(a.slice(name.length + 3), 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : def;
}
const ids = (e: WikidataEntity | null, p: string): string[] =>
  (e?.claims?.[p] ?? [])
    .map((c) => (c.mainsnak?.datavalue?.value as { id?: string })?.id)
    .filter((v): v is string => typeof v === 'string');

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL ?? '';
  if (!url.startsWith('postgres')) {
    console.error('BLOQUEADO: exige DATABASE_URL postgres.');
    process.exit(1);
  }
  const sample = argNum('sample', 100);
  const prisma = new PrismaClient();
  try {
    const clubs = await prisma.club.findMany({
      where: { deletedAt: null, qid: { not: null } },
      select: { qid: true },
      orderBy: { id: 'asc' },
      take: sample,
    });
    const entities = await fetchEntities(clubs.map((c) => c.qid as string));

    const venueQids = new Set<string>();
    const hqQids = new Set<string>();
    for (const c of clubs) {
      const e = entities.get(c.qid as string) ?? null;
      for (const v of ids(e, 'P115')) venueQids.add(v);
      for (const v of ids(e, 'P159')) hqQids.add(v);
    }
    const venueEntities = await fetchEntities([...venueQids]);
    const hqEntities = await fetchEntities([...hqQids]);

    let hasP115 = 0,
      hasP159 = 0,
      hasP131 = 0,
      coordsViaP115 = 0,
      coordsViaP159 = 0,
      coordsViaP131 = 0,
      coordsDirectP625 = 0;
    for (const c of clubs) {
      const e = entities.get(c.qid as string) ?? null;
      if (extractCoordinate(e)) coordsDirectP625 += 1;
      const v = ids(e, 'P115')[0];
      const h = ids(e, 'P159')[0];
      const p131 = extractP131Qid(e);
      if (v) {
        hasP115 += 1;
        if (extractCoordinate(venueEntities.get(v) ?? null)) coordsViaP115 += 1;
      }
      if (h) {
        hasP159 += 1;
        if (extractCoordinate(hqEntities.get(h) ?? null)) coordsViaP159 += 1;
      }
      if (p131) hasP131 += 1; // (P131 coords não resolvidos aqui; medidos antes = baixos)
    }
    const covered = coordsDirectP625 + coordsViaP115 + coordsViaP159;
    console.log(
      JSON.stringify(
        {
          mode: 'READ-ONLY',
          sampled: clubs.length,
          hasP115,
          hasP159,
          hasP131,
          coordsDirectP625,
          coordsViaP115,
          coordsViaP159,
          coordsViaP131,
          covered,
          estimatedCoveragePercent: clubs.length ? Math.round((covered / clubs.length) * 100) : 0,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

const invoked = /scripts\/measure-wikidata-coords-coverage\.(ts|js)$/.test(
  (process.argv[1] ?? '').replace(/\\/g, '/'),
);
if (invoked) {
  main().catch((err) => {
    console.error('Erro:', (err as Error).message);
    process.exit(1);
  });
}
