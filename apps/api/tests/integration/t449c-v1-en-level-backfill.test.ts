/**
 * T449c-v1 — Backfill de Competition.level (piloto EN), Postgres real.
 *
 * Tudo roda dentro de uma transação SEMPRE revertida (não polui a base). Casos de
 * competição ausente/ambígua e mapeamento inválido são puros (unit). Aqui: aplicar o plano,
 * nível correto, idempotência (re-run noop), parcial, rollback e — crítico — SCORE INALTERADO.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { Prisma } from '@prisma/client';
import { prisma } from '../../src/config/prisma.js';
import { EN_PYRAMID_TIERS } from '../../src/lib/rankings/tiers/en-pyramid.js';
import {
  planEnLevelBackfill,
  type ExistingCompetition,
} from '../../src/lib/rankings/tiers/plan-backfill.js';
import { applyEnLevelBackfill } from '../../src/lib/rankings/tiers/apply-backfill.js';

let dbOk = true;
const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');
const QIDS = EN_PYRAMID_TIERS.map((t) => t.competitionQid);
const ROLLBACK = Symbol('t449c-rollback');

async function inTx<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  let out!: T;
  try {
    await prisma.$transaction(async (tx) => {
      out = await fn(tx);
      throw ROLLBACK;
    });
  } catch (err) {
    if (err !== ROLLBACK) throw err;
  }
  return out;
}

async function ensureCompsAtLevelNull(
  tx: Prisma.TransactionClient,
): Promise<ExistingCompetition[]> {
  for (const t of EN_PYRAMID_TIERS) {
    await tx.competition.upsert({
      where: { qid: t.competitionQid },
      update: { level: null },
      create: {
        name: t.divisionLabel,
        country: 'GB',
        type: 'LEAGUE',
        qid: t.competitionQid,
        level: null,
        importedFrom: 'test-t449c',
      },
    });
  }
  return tx.competition.findMany({
    where: { qid: { in: QIDS } },
    select: { id: true, qid: true, level: true },
  });
}

beforeAll(async () => {
  if (!isPostgres) return;
  try {
    await prisma.competition.count();
  } catch {
    dbOk = false;
    if (process.env.TEST_REQUIRE_DB === 'true')
      throw new Error('[R1/TEST_REQUIRE_DB] banco ausente no CI');
  }
});

describe('T449c-v1 — backfill EN levels (Postgres real, rollback)', () => {
  it('estado limpo ⇒ apply 5; níveis corretos; re-run noop=5', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await inTx(async (tx) => {
      const rows = await ensureCompsAtLevelNull(tx);
      const plan1 = planEnLevelBackfill(EN_PYRAMID_TIERS, rows);
      const applied = await applyEnLevelBackfill(tx, plan1);
      const after = await tx.competition.findMany({
        where: { qid: { in: QIDS } },
        select: { id: true, qid: true, level: true },
      });
      const plan2 = planEnLevelBackfill(EN_PYRAMID_TIERS, after);
      return { plan1, applied, after, plan2 };
    });
    expect(res.plan1.wouldUpdate).toBe(5);
    expect(res.applied).toEqual({ updated: 5, noop: 0 });
    for (const t of EN_PYRAMID_TIERS) {
      expect(res.after.find((a) => a.qid === t.competitionQid)?.level).toBe(t.level);
    }
    expect(res.plan2).toMatchObject({ wouldUpdate: 0, noop: 5 });
  });

  it('estado parcial ⇒ atualiza apenas o divergente', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await inTx(async (tx) => {
      await ensureCompsAtLevelNull(tx);
      // aplica todos corretos e depois corrompe um (só ele deve ser atualizado)
      for (const t of EN_PYRAMID_TIERS) {
        await tx.competition.update({
          where: { qid: t.competitionQid },
          data: { level: t.level },
        });
      }
      await tx.competition.update({
        where: { qid: EN_PYRAMID_TIERS[1].competitionQid },
        data: { level: 7 },
      });
      const rows = await tx.competition.findMany({
        where: { qid: { in: QIDS } },
        select: { id: true, qid: true, level: true },
      });
      const plan = planEnLevelBackfill(EN_PYRAMID_TIERS, rows);
      const applied = await applyEnLevelBackfill(tx, plan);
      return { plan, applied };
    });
    expect(res.plan.wouldUpdate).toBe(1);
    expect(res.plan.noop).toBe(4);
    expect(res.applied.updated).toBe(1);
    expect(res.applied.noop).toBe(4);
  });

  it('SCORE INALTERADO: apply de levels não muda points/position/base do ranking', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await inTx(async (tx) => {
      await ensureCompsAtLevelNull(tx);
      const a = await tx.club.create({
        data: { name: 'T449c Score A', country: 'BR', qid: null },
      });
      const b = await tx.club.create({
        data: { name: 'T449c Score B', country: 'BR', qid: null },
      });
      const ranking = await tx.ranking.create({
        data: { name: 'T449c score test', season: '2049', publishedAt: new Date() },
      });
      await tx.rankingEntry.createMany({
        data: [
          {
            rankingId: ranking.id,
            clubId: a.id,
            position: 1,
            points: 100,
            baseMatches: 10,
            baseTitles: 1,
            gender: 'men',
          },
          {
            rankingId: ranking.id,
            clubId: b.id,
            position: 2,
            points: 55,
            baseMatches: 8,
            baseTitles: 0,
            gender: 'men',
          },
        ],
      });
      const snapshot = () =>
        tx.rankingEntry.findMany({
          where: { rankingId: ranking.id },
          orderBy: { position: 'asc' },
          select: {
            clubId: true,
            position: true,
            points: true,
            baseMatches: true,
            baseTitles: true,
            gender: true,
          },
        });
      const before = await snapshot();
      const rows = await tx.competition.findMany({
        where: { qid: { in: QIDS } },
        select: { id: true, qid: true, level: true },
      });
      await applyEnLevelBackfill(tx, planEnLevelBackfill(EN_PYRAMID_TIERS, rows));
      const after = await snapshot();
      return { before, after };
    });
    expect(res.after).toEqual(res.before);
    expect(res.before).toHaveLength(2);
  });

  it('rollback (level=NULL) ⇒ plano volta a wouldUpdate=5', async () => {
    if (!dbOk || !isPostgres) return;
    const plan = await inTx(async (tx) => {
      const rows = await ensureCompsAtLevelNull(tx);
      await applyEnLevelBackfill(tx, planEnLevelBackfill(EN_PYRAMID_TIERS, rows));
      await tx.competition.updateMany({ where: { qid: { in: QIDS } }, data: { level: null } });
      const after = await tx.competition.findMany({
        where: { qid: { in: QIDS } },
        select: { id: true, qid: true, level: true },
      });
      return planEnLevelBackfill(EN_PYRAMID_TIERS, after);
    });
    expect(plan).toMatchObject({ wouldUpdate: 5, noop: 0 });
  });
});
