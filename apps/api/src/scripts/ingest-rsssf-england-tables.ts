/**
 * T449a — Ingestão RSSSF (tabelas finais por divisão) → ranking 0-100.
 * Piloto: England 2022/23 (5 divisões). Sem partidas individuais (T449b).
 *
 * Uso:
 *   pnpm --filter @almanaque/api exec tsx src/scripts/ingest-rsssf-england-tables.ts          # DRY-RUN
 *   pnpm --filter @almanaque/api exec tsx src/scripts/ingest-rsssf-england-tables.ts --apply  # grava
 * Produção (lição #162): node apps/api/dist/scripts/ingest-rsssf-england-tables.js [--apply]
 *
 * Licença RSSSF: ATRIBUIÇÃO obrigatória (RSSSF_ATTRIBUTION); proveniência por registro.
 * Reversível: DELETE ranking_entries/rankings WHERE dataSourceIds @> '["rsssf"]' etc.
 */
import { PrismaClient } from '@prisma/client';
import {
  parseEnglandFinalTables,
  rankDivision,
  rsssfSeasonUrl,
  RSSSF_ATTRIBUTION,
  RSSSF_LICENSE,
} from '../modules/etl/connectors/rsssf-tables.connector.js';
import { fetchWithRetry } from '../lib/http-resilience.js';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const SEASON = '2023'; // temporada 2022/23
const COUNTRY = 'GB'; // Inglaterra (Wikidata P297 = GB)
const UA =
  'AlmanaqueDosClubes/0.1 (t449 rsssf tables; https://github.com/ENDARTStudios/Almanaque-dos-Clubes)';

async function fetchPage(url: string): Promise<string> {
  const res = await fetchWithRetry(url, { headers: { 'user-agent': UA } }, { label: 't449-rsssf' });
  return res.text();
}

async function main(): Promise<void> {
  const url = rsssfSeasonUrl(SEASON);
  console.log('Fonte:', url);
  const page = await fetchPage(url);
  const tables = parseEnglandFinalTables(page);
  console.log(
    'Divisões parseadas:',
    tables.map((t) => `${t.division}(${t.rows.length})`).join(' · '),
  );

  let totalMatched = 0;
  let totalRows = 0;
  for (const table of tables) {
    totalRows += table.rows.length;
    const ranked = rankDivision(table.rows);
    const names = ranked.map((r) => r.club);
    const clubs = await prisma.club.findMany({
      where: { name: { in: names, mode: 'insensitive' } },
      select: { id: true, name: true },
    });
    const byName = new Map(clubs.map((c) => [c.name.toLowerCase(), c.id]));
    const matched = ranked.filter((r) => byName.has(r.club.toLowerCase()));
    totalMatched += matched.length;
    console.log(`\n[${table.division}] ${ranked.length} clubes · casados ${matched.length}`);
    for (const r of ranked.slice(0, 3)) {
      console.log(
        `  ${r.position}. ${r.club} pts=${r.points} score=${r.score} ${byName.has(r.club.toLowerCase()) ? '✓' : '·sem clube'}`,
      );
    }
    if (!APPLY) continue;

    // APPLY: competição da divisão + ranking + entries (idempotente)
    const compName = `England ${table.division} ${SEASON}`;
    let competition = await prisma.competition.findFirst({
      where: { name: compName, country: COUNTRY },
      select: { id: true },
    });
    if (!competition) {
      competition = await prisma.competition.create({
        data: {
          name: compName,
          country: COUNTRY,
          type: 'LEAGUE',
          importedFrom: 'rsssf',
          importedAt: new Date(),
          sourceUrl: url,
        },
        select: { id: true },
      });
    }
    const ranking =
      (await prisma.ranking.findFirst({
        where: { competitionId: competition.id, season: SEASON },
      })) ??
      (await prisma.ranking.create({
        data: {
          name: `${table.division} ${SEASON}`,
          competitionId: competition.id,
          season: SEASON,
          publishedAt: new Date(),
        },
        select: { id: true },
      }));
    for (const r of matched) {
      const clubId = byName.get(r.club.toLowerCase()) as string;
      await prisma.rankingEntry.upsert({
        where: { rankingId_clubId: { rankingId: ranking.id, clubId } },
        update: {
          position: r.position,
          points: r.score,
          baseMatches: r.played,
          dataSourceIds: ['rsssf'],
          gender: 'men',
          reason: null,
        },
        create: {
          rankingId: ranking.id,
          clubId,
          position: r.position,
          points: r.score,
          baseMatches: r.played,
          dataSourceIds: ['rsssf'],
          gender: 'men',
        },
      });
    }
  }

  console.log(
    `\nTotal: ${totalMatched}/${totalRows} clubes casados. Atribuição: ${RSSSF_ATTRIBUTION}. Licença: ${RSSSF_LICENSE}`,
  );
  if (!APPLY) console.log('DRY-RUN — nada gravado. Rode com --apply.');
}

const invokedAsScript = /scripts\/ingest-rsssf-england-tables\.(ts|js)$/.test(
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
