/**
 * T449c-v2 — Agregado country_pyramid (Postgres real, transação SEMPRE revertida).
 * Prova: monta o agregado a partir dos rankings por divisão SEM tocar neles; idempotente.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { Prisma } from '@prisma/client';
import { prisma } from '../../src/config/prisma.js';
import {
  buildCountryPyramid,
  COUNTRY_PYRAMID_FORMULA_VERSION,
  COUNTRY_PYRAMID_SCOPE,
  type SourceRanking,
} from '../../src/lib/rankings/pyramid/country-pyramid.js';
import { EN_PYRAMID_TIER_VERSION } from '../../src/lib/rankings/tiers/en-pyramid.js';

let dbOk = true;
const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');
const ROLLBACK = Symbol('t449c-v2-rollback');
const COUNTRY = 'GB';
const SEASON = '2099';

async function inTx<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  let out!: T;
  try {
    await prisma.$transaction(async (tx) => {
      out = await fn(tx);
      throw ROLLBACK;
    });
  } catch (e) {
    if (e !== ROLLBACK) throw e;
  }
  return out;
}

async function seedDivisions(tx: Prisma.TransactionClient) {
  const clubs = await Promise.all(
    ['Pyramid FC A', 'Pyramid FC B', 'Pyramid FC C', 'Pyramid FC D'].map((name) =>
      tx.club.create({ data: { name, country: 'GB', qid: null }, select: { id: true } }),
    ),
  );
  const divs = [
    { qid: 'Q9900201', level: 1, label: 'Premier League', scores: [100, 50] },
    { qid: 'Q9900202', level: 2, label: 'Championship', scores: [100, 50] },
  ];
  const rankings = [];
  for (let i = 0; i < divs.length; i++) {
    const comp = await tx.competition.create({
      data: {
        name: divs[i].label,
        type: 'LEAGUE',
        country: 'GB',
        qid: divs[i].qid,
        level: divs[i].level,
      },
      select: { id: true },
    });
    const ranking = await tx.ranking.create({
      data: {
        name: `${divs[i].label} ${SEASON}`,
        competitionId: comp.id,
        season: SEASON,
        publishedAt: new Date(),
      },
      select: { id: true },
    });
    rankings.push({ rankingId: ranking.id, level: divs[i].level, label: divs[i].label });
    await tx.rankingEntry.createMany({
      data: [
        {
          rankingId: ranking.id,
          clubId: clubs[i * 2].id,
          position: 1,
          points: divs[i].scores[0],
          baseMatches: 46,
          gender: 'men',
        },
        {
          rankingId: ranking.id,
          clubId: clubs[i * 2 + 1].id,
          position: 2,
          points: divs[i].scores[1],
          baseMatches: 46,
          gender: 'men',
        },
      ],
    });
  }
  return { clubs, rankings };
}

async function collectSources(
  tx: Prisma.TransactionClient,
  rankings: { rankingId: string; level: number; label: string }[],
): Promise<SourceRanking[]> {
  const sources: SourceRanking[] = [];
  for (const r of rankings) {
    const entries = await tx.rankingEntry.findMany({
      where: { rankingId: r.rankingId },
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
    sources.push({ level: r.level, divisionLabel: r.label, gender: 'men', entries });
  }
  return sources;
}

function hashEntries(rows: Array<Record<string, unknown>>): string {
  return JSON.stringify(rows.map((r) => [r.clubId, r.position, r.points]).sort());
}

beforeAll(async () => {
  if (!isPostgres) return;
  try {
    await prisma.ranking.count();
  } catch {
    dbOk = false;
    if (process.env.TEST_REQUIRE_DB === 'true')
      throw new Error('[R1/TEST_REQUIRE_DB] banco ausente no CI');
  }
});

describe('T449c-v2 — country_pyramid (Postgres real, rollback)', () => {
  it('monta o agregado sem alterar os rankings por divisão; idempotente', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await inTx(async (tx) => {
      const { rankings } = await seedDivisions(tx);

      const before = await Promise.all(
        rankings.map((r) =>
          tx.rankingEntry.findMany({
            where: { rankingId: r.rankingId },
            select: { clubId: true, position: true, points: true },
          }),
        ),
      );
      const beforeHash = hashEntries(before.flat() as Array<Record<string, unknown>>);

      const sources = await collectSources(tx, rankings);
      const pyramid = buildCountryPyramid(sources);

      // escreve o ranking agregado (mesma lógica do script)
      const agg = await tx.ranking.create({
        data: {
          name: `Pirâmide Teste ${SEASON}`,
          competitionId: null,
          season: SEASON,
          scope: COUNTRY_PYRAMID_SCOPE,
          country: COUNTRY,
          tierVersion: EN_PYRAMID_TIER_VERSION,
          formulaVersion: COUNTRY_PYRAMID_FORMULA_VERSION,
          publishedAt: new Date(),
        },
        select: { id: true, scope: true, country: true, tierVersion: true, formulaVersion: true },
      });
      const write = (rows: typeof pyramid.rows) =>
        tx.rankingEntry.createMany({
          data: rows.map((r) => ({
            rankingId: agg.id,
            clubId: r.clubId,
            position: r.position,
            points: r.adjustedPoints,
            baseMatches: r.baseMatches,
            gender: r.gender,
          })),
        });
      await write(pyramid.rows);
      const first = await tx.rankingEntry.findMany({
        where: { rankingId: agg.id },
        orderBy: { position: 'asc' },
        select: { clubId: true, position: true, points: true },
      });

      // re-run idempotente: reescreve só as entries do agregado
      await tx.rankingEntry.deleteMany({ where: { rankingId: agg.id } });
      await write(pyramid.rows);
      const second = await tx.rankingEntry.findMany({
        where: { rankingId: agg.id },
        orderBy: { position: 'asc' },
        select: { clubId: true, position: true, points: true },
      });

      const after = await Promise.all(
        rankings.map((r) =>
          tx.rankingEntry.findMany({
            where: { rankingId: r.rankingId },
            select: { clubId: true, position: true, points: true },
          }),
        ),
      );
      return {
        pyramid,
        agg,
        first,
        second,
        beforeHash,
        afterHash: hashEntries(after.flat() as Array<Record<string, unknown>>),
      };
    });

    // agregado com metadados
    expect(res.agg.scope).toBe('country_pyramid');
    expect(res.agg.country).toBe('GB');
    expect(res.agg.formulaVersion).toBe(COUNTRY_PYRAMID_FORMULA_VERSION);
    // top = 100 (L1 1º); L2 1º = 85; ordem cross-division
    expect(res.first.map((e) => e.points)).toEqual([100, 85, 50, 43]);
    expect(res.first.map((e) => e.position)).toEqual([1, 2, 3, 4]);
    // idempotência
    expect(res.second).toEqual(res.first);
    // rankings por divisão INALTERADOS
    expect(res.afterHash).toBe(res.beforeHash);
  });
});
