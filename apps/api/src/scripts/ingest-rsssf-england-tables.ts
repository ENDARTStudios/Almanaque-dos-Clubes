/**
 * T449a — RSSSF (tabelas finais por divisão) → ranking 0-100 por competição/temporada.
 * Piloto: England 2022/23 (5 divisões). NÃO popula `matches` (decisão: tabelas→ranking).
 *
 * Uso: tsx src/scripts/ingest-rsssf-england-tables.ts [--apply]  (prod: node dist/scripts/...)
 * Licença RSSSF = ATRIBUIÇÃO obrigatória. Rank: por competição/temporada (tier EMERGE).
 * Reversível: DELETE ranking_entries/rankings do piloto (proveniência dataSourceIds=['rsssf']).
 */
import { PrismaClient } from '@prisma/client';
import {
  parseEnglandFinalTables,
  rankDivision,
  rsssfSeasonUrl,
  RSSSF_ATTRIBUTION,
  RSSSF_LICENSE,
} from '../modules/etl/connectors/rsssf-tables.connector.js';
import { normalizeClubName } from '../modules/etl/connectors/wikidata-en-clubs.connector.js';
import { fetchWithRetry } from '../lib/http-resilience.js';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const SEASON = '2023';
const COUNTRY = 'GB';
const METHOD_VERSION = 't449a-rsssf-tables-v1';
const UA =
  'AlmanaqueDosClubes/0.1 (t449a rsssf; https://github.com/ENDARTStudios/Almanaque-dos-Clubes)';

/** Divisões RSSSF → QID da competição JÁ existente (não duplicar por nome). */
export const DIVISION_QID: Record<string, string> = {
  'Premier League': 'Q9448',
  Championship: 'Q19510',
  'Division 1': 'Q19565',
  'Division 2': 'Q48837',
  'National League': 'Q18504',
};

async function main(): Promise<void> {
  const url = rsssfSeasonUrl(SEASON);
  console.log('Fonte:', url);
  const res = await fetchWithRetry(
    url,
    { headers: { 'user-agent': UA } },
    { label: 't449a-rsssf' },
  );
  const tables = parseEnglandFinalTables(await res.text());
  console.log('Divisões:', tables.map((t) => `${t.division}(${t.rows.length})`).join(' · '));

  const activeClubs = await prisma.club.findMany({
    where: { country: COUNTRY, deletedAt: null },
    select: { id: true, name: true },
  });
  const byNorm = new Map(activeClubs.map((c) => [normalizeClubName(c.name), c.id]));

  let totalMatched = 0;
  let totalRows = 0;
  for (const table of tables) {
    const ranked = rankDivision(table.rows);
    totalRows += ranked.length;
    const matched = ranked
      .map((r) => ({ ...r, clubId: byNorm.get(normalizeClubName(r.club)) }))
      .filter((r): r is typeof r & { clubId: string } => !!r.clubId);
    totalMatched += matched.length;
    console.log(`\n[${table.division}] ${ranked.length} clubes · casados ${matched.length}`);

    if (!APPLY) continue;

    const qid = DIVISION_QID[table.division];
    const competition = qid
      ? await prisma.competition.findUnique({ where: { qid }, select: { id: true } })
      : null;
    if (!competition) {
      console.log(`  ! competição sem match (QID ${qid}) — pulando divisão`);
      continue;
    }
    let ranking = await prisma.ranking.findFirst({
      where: { competitionId: competition.id, season: SEASON },
      select: { id: true },
    });
    if (!ranking) {
      ranking = await prisma.ranking.create({
        data: {
          name: `${table.division} ${SEASON}`,
          competitionId: competition.id,
          season: SEASON,
          publishedAt: new Date(),
        },
        select: { id: true },
      });
    }
    for (const r of matched) {
      await prisma.rankingEntry.upsert({
        where: { rankingId_clubId: { rankingId: ranking.id, clubId: r.clubId } },
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
          clubId: r.clubId,
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
    `\nTotal: ${totalMatched}/${totalRows} casados · methodVersion=${METHOD_VERSION} · atribuição=${RSSSF_ATTRIBUTION} · licença=${RSSSF_LICENSE}`,
  );
  if (!APPLY) console.log('DRY-RUN — nada gravado.');
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
