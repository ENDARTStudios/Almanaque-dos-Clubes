/**
 * T466 — Seed geográfico (WS-D): Country / State / City + vínculo (FK) nos clubes.
 *
 * Fonte: Wikidata (CC0); proveniência por registro (`importedFrom='wikidata-geo'`,
 * `sourceUrl=https://www.wikidata.org/wiki/<QID>`, `importedAt`).
 *
 * Resolve país/estado/cidade E a coordenada P625 do próprio clube (tudo no mesmo SPARQL),
 * gravando também `clubs.latitude/longitude` de forma idempotente.
 *
 * Uso (local):
 *   pnpm --filter @almanaque/api exec tsx src/scripts/ingest-geo-wikidata.ts          # DRY-RUN
 *   pnpm --filter @almanaque/api exec tsx src/scripts/ingest-geo-wikidata.ts --apply  # grava
 * Uso (produção, lição #162 — compila p/ dist e roda com node puro, NÃO tsx):
 *   node apps/api/dist/scripts/ingest-geo-wikidata.js          # DRY-RUN
 *   node apps/api/dist/scripts/ingest-geo-wikidata.js --apply  # grava
 *
 * Idempotente: chaves estáveis (countries.iso2, states.code, cities.qid) + detecção de
 * mudança em `syncGeo` — re-run sem alteração ⇒ ZERO escrita.
 *
 * Reversível (por proveniência):
 *   DELETE FROM cities WHERE "importedFrom"='wikidata-geo';
 *   DELETE FROM states WHERE "importedFrom"='wikidata-geo';
 *   DELETE FROM countries WHERE "importedFrom"='wikidata-geo';
 *   UPDATE clubs SET "countryId"=NULL, "stateId"=NULL, "cityId"=NULL, latitude=NULL, longitude=NULL
 *     WHERE "qid" IN (SELECT qid FROM clubs WHERE qid IS NOT NULL);  -- rollback de coords opcional
 */
import { PrismaClient } from '@prisma/client';
import {
  buildGeoQuery,
  parseGeoBindings,
  planGeo,
  syncGeo,
  type GeoRow,
} from '../modules/etl/connectors/wikidata-geo.connector.js';
import { prismaGeoRepository } from '../modules/etl/geo.repository.js';
import { fetchWithRetry } from '../lib/http-resilience.js';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const BATCH = 200;
const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const USER_AGENT =
  'AlmanaqueDosClubes/0.1 (t466 geo ingest; https://github.com/ENDARTStudios/Almanaque-dos-Clubes)';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchGeoBatch(clubQids: string[]): Promise<GeoRow[]> {
  const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(buildGeoQuery(clubQids))}&format=json`;
  const res = await fetchWithRetry(
    url,
    { headers: { Accept: 'application/sparql-results+json', 'User-Agent': USER_AGENT } },
    { label: 'ingest-geo' },
  );
  return parseGeoBindings(await res.json());
}

export async function collectGeoRows(qids: string[]): Promise<GeoRow[]> {
  const rows: GeoRow[] = [];
  for (let i = 0; i < qids.length; i += BATCH) {
    const parsed = await fetchGeoBatch(qids.slice(i, i + BATCH));
    rows.push(...parsed);
    console.log(
      '  lote ' +
        (i / BATCH + 1) +
        ': ' +
        parsed.length +
        '/' +
        Math.min(BATCH, qids.length - i) +
        ' resolvidos',
    );
    if (i + BATCH < qids.length) await sleep(2000);
  }
  return rows;
}

async function main(): Promise<void> {
  const clubs = await prisma.club.findMany({
    where: { qid: { not: null } },
    select: { qid: true },
  });
  const qids = clubs.map((c) => c.qid as string);
  console.log('Clubes com qid: ' + qids.length);

  const rows = await collectGeoRows(qids);
  console.log('Clubes com geografia resolvida: ' + rows.length + '/' + qids.length);

  const plan = planGeo(rows);
  console.log(
    'Entidades planejadas — countries=' +
      plan.countries.length +
      ' states=' +
      plan.states.length +
      ' cities=' +
      plan.cities.length +
      ' links=' +
      plan.links.length,
  );

  if (!APPLY) {
    console.log('DRY-RUN — nada gravado. Rode com --apply.');
    return;
  }

  const stats = await syncGeo(prismaGeoRepository(), plan, new Date());
  console.log('APPLY ' + JSON.stringify(stats));
  console.log(
    'APPLY totals ' +
      JSON.stringify({
        countries: await prisma.country.count(),
        states: await prisma.state.count(),
        cities: await prisma.city.count(),
        clubsWithCountry: await prisma.club.count({ where: { countryId: { not: null } } }),
        clubsWithState: await prisma.club.count({ where: { stateId: { not: null } } }),
        clubsWithCity: await prisma.club.count({ where: { cityId: { not: null } } }),
      }),
  );
}

// Guarda de importação: em testes (vitest) o módulo é importado sem executar.
// Casa tanto o fonte (`…scripts/ingest-geo-wikidata.ts`, tsx local) quanto o build
// de produção (`…dist/scripts/ingest-geo-wikidata.js`, node puro — lição #162).
const invokedAsScript = /scripts\/ingest-geo-wikidata\.(ts|js)$/.test(
  (process.argv[1] ?? '').replace(/\\/g, '/'),
);
if (invokedAsScript) {
  main()
    .catch((err) => {
      console.error('Erro:', (err as Error).message);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
