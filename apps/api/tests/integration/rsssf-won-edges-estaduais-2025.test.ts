/**
 * T448b-2d — Integração do writer estaduais 2025 (GO 2025 / PR 2025), Postgres real.
 * Idempotência, proveniência no DB, restore, fail-fast, homônimos intocados.
 *
 * Isolamento: QIDs SINTÉTICOS dedicados + cada escrita roda dentro de uma transação
 * revertida (`inTx`), então nenhuma aresta rsssf persiste e não há corrida com os testes
 * MG/GO existentes. Os QIDs reais dos packs são cobertos pelos testes unitários do loader.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../../src/config/prisma.js';
import {
  createPrismaGoWonRepo,
  syncGoWonEdges,
  GO_PR_WRITER_VERSION,
  GO_PR_WON_RESTORABLE_REASONS,
} from '../../src/modules/etl/rsssf-won-edges-go.service.js';
import { loadGo2025Pack, loadPr2025Pack } from '../../src/lib/rsssf/estaduais-2025-pack.js';
import type { GoCandidate } from '../../src/lib/rsssf/go/types.js';

let dbOk = true;
const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');
const goPack = loadGo2025Pack();
const prPack = loadPr2025Pack();

const T = {
  go: { comp: 'Q9900001', club: 'Q9900002' },
  pr: { comp: 'Q9900011', club: 'Q9900012' },
  missingComp: 'Q9900091',
  missingClub: 'Q9900092',
  softClub: 'Q9900093',
} as const;
const HOMONYMS = ['Q10391045', 'Q10391046', 'Q671621'];
const ROLLBACK = Symbol('integration-rollback');

function cloneCand(base: GoCandidate, compQid: string, clubQid: string): GoCandidate {
  return { ...base, competitionQid: compQid, clubQid, dedupKey: `${compQid}|2025|${clubQid}|WON` };
}
const goCand = cloneCand(goPack.candidates[0], T.go.comp, T.go.club);
const prCand = cloneCand(prPack.candidates[0], T.pr.comp, T.pr.club);

const goOpts = {
  allowedYears: [2025] as readonly number[],
  expectedCompetitionQid: T.go.comp,
  expectedClubQid: T.go.club,
  writerVersion: GO_PR_WRITER_VERSION,
  restorableReasons: GO_PR_WON_RESTORABLE_REASONS,
};
const prOpts = {
  ...goOpts,
  expectedCompetitionQid: T.pr.comp,
  expectedClubQid: T.pr.club,
};

/** Executa `fn` numa transação que sempre faz rollback; retorna o resultado coletado. */
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

function repoOf(tx: Prisma.TransactionClient) {
  return createPrismaGoWonRepo(tx as unknown as PrismaClient);
}

async function ensureComp(qid: string, name: string): Promise<string> {
  const c = await prisma.competition.upsert({
    where: { qid },
    update: {},
    create: { name, type: 'LEAGUE', country: 'BR', qid, importedFrom: 'wikidata-go-pr-2025-test' },
    select: { id: true },
  });
  return c.id;
}

async function ensureClub(qid: string, name: string, deleted = false): Promise<string> {
  const c = await prisma.club.upsert({
    where: { qid },
    update: {},
    create: { name, country: 'BR', qid, deletedAt: deleted ? new Date() : null },
    select: { id: true },
  });
  return c.id;
}

async function edgesOf(tx: Prisma.TransactionClient, clubId: string, compId: string) {
  return tx.knowledgeGraph.findMany({
    where: { sourceId: clubId, targetId: compId, relation: 'WON' },
    select: { id: true, metadata: true },
  });
}

let goClubId = '';
let prClubId = '';
let goCompId = '';
let prCompId = '';

beforeAll(async () => {
  if (!isPostgres) return;
  try {
    await prisma.knowledgeGraph.count();
  } catch {
    dbOk = false;
    if (process.env.TEST_REQUIRE_DB === 'true')
      throw new Error('[R1/TEST_REQUIRE_DB] banco ausente no CI');
    return;
  }
  goCompId = await ensureComp(T.go.comp, 'Campeonato Goiano de Futebol (test)');
  prCompId = await ensureComp(T.pr.comp, 'Campeonato Paranaense de Futebol (test)');
  goClubId = await ensureClub(T.go.club, 'Vila Nova Futebol Clube (test)');
  prClubId = await ensureClub(T.pr.club, 'Operário Ferroviário Esporte Clube (test)');
});

afterAll(async () => {
  if (!dbOk || !isPostgres) return;
  await prisma.knowledgeGraph.deleteMany({
    where: { relation: 'WON', sourceId: { in: [goClubId, prClubId] } },
  });
  await prisma.club.deleteMany({ where: { qid: { in: [T.go.club, T.pr.club, T.softClub] } } });
  await prisma.competition.deleteMany({ where: { qid: { in: [T.go.comp, T.pr.comp] } } });
});

describe('T448b-2d estaduais 2025 — writer (Postgres real)', () => {
  it('GO 2025 limpo ⇒ create 1 com proveniência completa', async () => {
    if (!dbOk || !isPostgres) return;
    const { res, edges } = await inTx(async (tx) => {
      const r = await syncGoWonEdges([goCand], repoOf(tx), goOpts);
      return { res: r, edges: await edgesOf(tx, goClubId, goCompId) };
    });
    expect(res.counts).toMatchObject({ created: 1, skipped: 0, failed: 0, attributionMissing: 0 });
    expect(edges).toHaveLength(1);
    const m = edges[0].metadata as Record<string, unknown>;
    expect(m.source).toBe('rsssf');
    expect(m.hierarchy).toBe('estadual');
    expect(m.gender).toBe('men');
    expect(m.year).toBe(2025);
    expect(m.sourceUrl).toContain('go2025.htm');
    expect(String(m.authorCredit)).toContain('Rivera');
    expect(String(m.licenseText)).toContain('acknowledgement');
    expect(m.retrievedAt).toBe('2026-09-25T16:26:51Z');
    expect(m.attributionRequired).toBe(true);
    expect(m.writerVersion).toBe('t448b2d-writer-go-pr-v1');
    expect(m.dedupKey).toBe(`${T.go.comp}|2025|${T.go.club}|WON`);
  });

  it('PR 2025 limpo ⇒ create 1 com proveniência completa', async () => {
    if (!dbOk || !isPostgres) return;
    const { res, edges } = await inTx(async (tx) => {
      const r = await syncGoWonEdges([prCand], repoOf(tx), prOpts);
      return { res: r, edges: await edgesOf(tx, prClubId, prCompId) };
    });
    expect(res.counts).toMatchObject({ created: 1, skipped: 0, failed: 0 });
    expect(edges).toHaveLength(1);
    const m = edges[0].metadata as Record<string, unknown>;
    expect(m.sourceUrl).toContain('pr2025.htm');
    expect(String(m.authorCredit)).toContain('Moacir Dalpiaz de Souza');
    expect(m.retrievedAt).toBe('2026-09-25T16:32:38Z');
    expect(m.uf).toBe('PR');
  });

  it('create + re-run ⇒ skip 1 (idempotente)', async () => {
    if (!dbOk || !isPostgres) return;
    const { first, second, count } = await inTx(async (tx) => {
      const a = await syncGoWonEdges([goCand], repoOf(tx), goOpts);
      const b = await syncGoWonEdges([goCand], repoOf(tx), goOpts);
      return {
        first: a.counts,
        second: b.counts,
        count: (await edgesOf(tx, goClubId, goCompId)).length,
      };
    });
    expect(first).toMatchObject({ created: 1, failed: 0 });
    expect(second).toMatchObject({ created: 0, skipped: 1, failed: 0 });
    expect(count).toBe(1);
  });

  it('isolamento: nenhuma aresta persistiu para os clubes sintéticos (homônimos intocados)', async () => {
    if (!dbOk || !isPostgres) return;
    const persisted = await prisma.knowledgeGraph.count({
      where: { relation: 'WON', sourceId: { in: [goClubId, prClubId] } },
    });
    expect(persisted).toBe(0);
    const homonyms = await prisma.club.findMany({
      where: { qid: { in: HOMONYMS } },
      select: { name: true },
    });
    for (const h of homonyms) expect(typeof h.name).toBe('string');
  });

  it('soft-deleted com reason 2025 permitida ⇒ restore', async () => {
    if (!dbOk || !isPostgres) return;
    const { res, after } = await inTx(async (tx) => {
      const a = await syncGoWonEdges([goCand], repoOf(tx), goOpts);
      const [edge] = await edgesOf(tx, goClubId, goCompId);
      const m = edge.metadata as Record<string, unknown>;
      await tx.knowledgeGraph.update({
        where: { id: edge.id },
        data: {
          metadata: {
            ...m,
            deletedAt: '2026-09-25T00:00:00Z',
            deletionReason: 'rollback_t448b2d_go_2025_apply',
          } as unknown as Prisma.InputJsonObject,
        },
      });
      const r = await syncGoWonEdges([goCand], repoOf(tx), goOpts);
      const [restored] = await edgesOf(tx, goClubId, goCompId);
      expect(a.counts.created).toBe(1);
      return { res: r, after: restored.metadata as Record<string, unknown> };
    });
    expect(res.counts.restored).toBe(1);
    expect(after.deletedAt).toBeUndefined();
    expect(after.previousDeletionReason).toBe('rollback_t448b2d_go_2025_apply');
  });

  it('soft-deleted com reason inesperada ⇒ fail', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await inTx(async (tx) => {
      await syncGoWonEdges([goCand], repoOf(tx), goOpts);
      const [edge] = await edgesOf(tx, goClubId, goCompId);
      const m = edge.metadata as Record<string, unknown>;
      await tx.knowledgeGraph.update({
        where: { id: edge.id },
        data: {
          metadata: {
            ...m,
            deletedAt: 't',
            deletionReason: 'manual',
          } as unknown as Prisma.InputJsonObject,
        },
      });
      return syncGoWonEdges([goCand], repoOf(tx), goOpts);
    });
    expect(res.failures.some((f) => f.reason === 'unexpected_soft_deleted_edge')).toBe(true);
  });

  it('duas arestas para o mesmo fato ⇒ duplicate_factual_edges', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await inTx(async (tx) => {
      await syncGoWonEdges([goCand], repoOf(tx), goOpts);
      const [edge] = await edgesOf(tx, goClubId, goCompId);
      await tx.knowledgeGraph.create({
        data: {
          sourceId: goClubId,
          sourceType: 'Club',
          targetId: goCompId,
          targetType: 'Competition',
          relation: 'WON',
          metadata: { ...(edge.metadata as Record<string, unknown>) } as Prisma.InputJsonObject,
        },
      });
      return syncGoWonEdges([goCand], repoOf(tx), goOpts);
    });
    expect(res.failures.some((f) => f.reason === 'duplicate_factual_edges')).toBe(true);
  });

  it('competição ausente / clube ausente / clube soft-deleted ⇒ fail', async () => {
    if (!dbOk || !isPostgres) return;
    await inTx(async (tx) => {
      const repo = repoOf(tx);
      const cComp = { ...goCand, competitionQid: T.missingComp } as GoCandidate;
      const rComp = await syncGoWonEdges([cComp], repo, {
        ...goOpts,
        expectedCompetitionQid: T.missingComp,
      });
      expect(rComp.failures.some((f) => f.reason === 'missing_competition')).toBe(true);

      const cClub = { ...goCand, clubQid: T.missingClub } as GoCandidate;
      const rClub = await syncGoWonEdges([cClub], repo, {
        ...goOpts,
        expectedClubQid: T.missingClub,
      });
      expect(rClub.failures.some((f) => f.reason === 'missing_club')).toBe(true);

      await tx.club.create({
        data: {
          name: 'Clube Soft Deleted (test)',
          country: 'BR',
          qid: T.softClub,
          deletedAt: new Date(),
        },
      });
      const cSoft = { ...goCand, clubQid: T.softClub } as GoCandidate;
      const rSoft = await syncGoWonEdges([cSoft], repo, {
        ...goOpts,
        expectedClubQid: T.softClub,
      });
      expect(rSoft.failures.some((f) => f.reason === 'soft_deleted_club')).toBe(true);
    });
  });
});
