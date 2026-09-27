/**
 * T449c-v2 — Constrói o Ranking agregado `country_pyramid` (Pirâmide Inglesa) a partir dos
 * rankings POR DIVISÃO existentes (não os altera). Default DRY; `--apply` grava (produção exige
 * `--allow-production`). Idempotente (re-run = mesmo resultado; reescreve SÓ as entries deste
 * ranking). Reversível: apagar o ranking `scope='country_pyramid'` (cascade nas entries).
 *
 * Uso:
 *   tsx src/scripts/build-country-pyramid.ts --dry-run
 *   tsx src/scripts/build-country-pyramid.ts --apply --allow-production
 */
import { Prisma, PrismaClient } from '@prisma/client';
import { EN_PYRAMID_TIERS, EN_PYRAMID_TIER_VERSION } from '../lib/rankings/tiers/en-pyramid.js';
import {
  buildCountryPyramid,
  COUNTRY_PYRAMID_FORMULA_VERSION,
  COUNTRY_PYRAMID_SCOPE,
  type SourceEntry,
  type SourceRanking,
} from '../lib/rankings/pyramid/country-pyramid.js';

const COUNTRY = 'GB';
const SEASON = '2023';
const NAME = `Pirâmide Inglesa ${SEASON}`;

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply') && !process.argv.includes('--dry-run');
  const allowProduction = process.argv.includes('--allow-production');
  const url = process.env.DATABASE_URL ?? '';
  if (!url.startsWith('postgres')) {
    console.error('BLOQUEADO: exige DATABASE_URL postgres.');
    process.exit(1);
  }
  if (apply && process.env.NODE_ENV === 'production' && !allowProduction) {
    console.error('BLOQUEADO: --apply em produção exige --allow-production explícito.');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const qids = EN_PYRAMID_TIERS.map((t) => t.competitionQid);
    const comps = await prisma.competition.findMany({
      where: { qid: { in: qids } },
      select: { id: true, qid: true },
    });
    const compByQid = new Map(comps.map((c) => [c.qid, c.id]));

    const sources: SourceRanking[] = [];
    const missing: string[] = [];
    for (const t of EN_PYRAMID_TIERS) {
      const compId = compByQid.get(t.competitionQid);
      if (!compId) {
        missing.push(t.competitionQid);
        continue;
      }
      const ranking = await prisma.ranking.findFirst({
        where: { competitionId: compId, season: SEASON },
        select: { id: true },
      });
      if (!ranking) {
        missing.push(`${t.competitionQid}(no-ranking)`);
        continue;
      }
      const entries = await prisma.rankingEntry.findMany({
        where: { rankingId: ranking.id },
        select: {
          clubId: true,
          position: true,
          points: true,
          baseMatches: true,
          baseTitles: true,
          dataSourceIds: true,
          gender: true,
        },
      });
      sources.push({
        level: t.level,
        divisionLabel: t.divisionLabel,
        gender: 'men',
        entries: entries as SourceEntry[],
      });
    }

    if (missing.length) {
      console.log(JSON.stringify({ mode: apply ? 'APPLY' : 'DRY', errors: missing }, null, 2));
      process.exit(1);
    }

    const result = buildCountryPyramid(sources);

    const summary = {
      scope: COUNTRY_PYRAMID_SCOPE,
      country: COUNTRY,
      season: SEASON,
      tierVersion: EN_PYRAMID_TIER_VERSION,
      formulaVersion: COUNTRY_PYRAMID_FORMULA_VERSION,
      divisions: result.byLevel.length,
      rankedCount: result.rankedCount,
      excludedCount: result.excludedCount,
      byLevel: result.byLevel,
      top: result.rows.slice(0, 10).map((r) => ({
        pos: r.position,
        clubId: r.clubId,
        level: r.level,
        division: r.divisionLabel,
        points: r.adjustedPoints,
      })),
    };

    if (!apply) {
      console.log(
        JSON.stringify({ mode: 'DRY', name: NAME, ...summary, wouldWrite: true }, null, 2),
      );
      return;
    }

    const rankingId = await prisma.$transaction(
      async (tx) => {
        let ranking = await tx.ranking.findFirst({
          where: { scope: COUNTRY_PYRAMID_SCOPE, country: COUNTRY, season: SEASON },
          select: { id: true, publishedAt: true },
        });
        if (!ranking) {
          ranking = await tx.ranking.create({
            data: {
              name: NAME,
              competitionId: null,
              season: SEASON,
              scope: COUNTRY_PYRAMID_SCOPE,
              country: COUNTRY,
              tierVersion: EN_PYRAMID_TIER_VERSION,
              formulaVersion: COUNTRY_PYRAMID_FORMULA_VERSION,
              publishedAt: new Date(),
            },
            select: { id: true, publishedAt: true },
          });
        } else {
          await tx.ranking.update({
            where: { id: ranking.id },
            data: {
              name: NAME,
              tierVersion: EN_PYRAMID_TIER_VERSION,
              formulaVersion: COUNTRY_PYRAMID_FORMULA_VERSION,
              ...(ranking.publishedAt ? {} : { publishedAt: new Date() }),
            },
          });
        }
        // Reescreve SÓ as entries deste ranking (idempotente).
        await tx.rankingEntry.deleteMany({ where: { rankingId: ranking.id } });
        await tx.rankingEntry.createMany({
          data: result.rows.map((r) => ({
            rankingId: ranking!.id,
            clubId: r.clubId,
            position: r.position,
            points: r.adjustedPoints,
            baseMatches: r.baseMatches,
            baseTitles: r.baseTitles,
            dataSourceIds: (r.dataSourceIds ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            gender: r.gender,
            reason: null,
          })),
        });
        return ranking.id;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    console.log(
      JSON.stringify(
        {
          mode: 'APPLY',
          name: NAME,
          rankingId,
          ...summary,
          errors: 0,
          hardDeletes: 0,
          migrations: 0,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

const invoked = /scripts\/build-country-pyramid\.(ts|js)$/.test(
  (process.argv[1] ?? '').replace(/\\/g, '/'),
);
if (invoked) {
  main().catch((err) => {
    console.error('Erro:', (err as Error).message);
    process.exit(1);
  });
}
