/**
 * T448b-2d GO — Integração do writer (Postgres real). Sem produzir 2025; sem tocar homônimos.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../src/config/prisma.js';
import {
  createPrismaGoWonRepo,
  syncGoWonEdges,
} from '../../src/modules/etl/rsssf-won-edges-go.service.js';
import { loadGoPack } from '../../src/lib/rsssf/go/index.js';

let dbOk = true;
const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');
const pack = loadGoPack();
const QID_MOTHER = 'Q931386';
const QID_CLUB = 'Q198034';
const QID_VN_RN = 'Q10391045';
const QID_VN_ES = 'Q10391046';
let motherId = '';
let clubId = '';
const createdClubIds: string[] = [];
let createdMother = false;

async function ensureClub(qid: string, name: string): Promise<string> {
  const e = await prisma.club.findUnique({ where: { qid }, select: { id: true } });
  if (e) return e.id;
  const c = await prisma.club.create({ data: { name, country: 'BR', qid }, select: { id: true } });
  createdClubIds.push(c.id);
  return c.id;
}

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
  let mother = await prisma.competition.findUnique({
    where: { qid: QID_MOTHER },
    select: { id: true },
  });
  if (!mother) {
    mother = await prisma.competition.create({
      data: {
        name: 'Campeonato Goiano de Futebol',
        type: 'LEAGUE',
        country: 'BR',
        qid: QID_MOTHER,
        importedFrom: 'wikidata-go-pre',
      },
      select: { id: true },
    });
    createdMother = true;
  }
  motherId = mother.id;
  clubId = await ensureClub(QID_CLUB, 'Atlético Clube Goianiense');
  await ensureClub(QID_VN_RN, 'Vila Nova Futebol Clube');
  await ensureClub(QID_VN_ES, 'Vila Nova FC (ES)');
  // limpar arestas GO prévias
  await prisma.knowledgeGraph.deleteMany({
    where: { sourceId: clubId, targetId: motherId, relation: 'WON' },
  });
});

afterAll(async () => {
  if (dbOk && isPostgres) {
    await prisma.knowledgeGraph.deleteMany({
      where: { sourceId: clubId, targetId: motherId, relation: 'WON' },
    });
    if (createdClubIds.length)
      await prisma.club.deleteMany({ where: { id: { in: createdClubIds } } });
    if (createdMother) await prisma.competition.deleteMany({ where: { qid: QID_MOTHER } });
  }
});

describe('T448b-2d GO — writer (Postgres real)', () => {
  it('create 2 arestas GO 2023/2024 com proveniência completa', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await syncGoWonEdges(pack.candidates, createPrismaGoWonRepo(prisma), {
      importedAt: new Date('2026-09-25T00:00:00Z'),
    });
    expect(res.counts).toMatchObject({
      created: 2,
      updated: 0,
      restored: 0,
      skipped: 0,
      failed: 0,
    });

    const edges = await prisma.knowledgeGraph.findMany({
      where: { sourceId: clubId, targetId: motherId, relation: 'WON' },
      select: { metadata: true },
    });
    expect(edges).toHaveLength(2);
    for (const e of edges) {
      const m = e.metadata as Record<string, unknown>;
      expect(m.source).toBe('rsssf');
      expect(m.hierarchy).toBe('estadual');
      expect(m.gender).toBe('men');
      expect(m.retrievedAt).toBe('2026-09-24T20:03:52Z');
      expect(String(m.authorCredit)).toContain('Rivera');
      expect(String(m.licenseText)).toContain('acknowledgement');
      expect(m.writerVersion).toBe('t448b2d-writer-go-v1');
    }
    expect(new Set(edges.map((e) => (e.metadata as Record<string, unknown>).year))).toEqual(
      new Set([2023, 2024]),
    );
  });

  it('re-run ⇒ skip 2 (idempotente)', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await syncGoWonEdges(pack.candidates, createPrismaGoWonRepo(prisma));
    expect(res.counts).toMatchObject({ created: 0, restored: 0, skipped: 2, failed: 0 });
    expect(
      await prisma.knowledgeGraph.count({
        where: { sourceId: clubId, targetId: motherId, relation: 'WON' },
      }),
    ).toBe(2);
  });

  it('zero 2025; homônimos intactos; Q1513287 ausente', async () => {
    if (!dbOk || !isPostgres) return;
    const e2025 = await prisma.knowledgeGraph.count({
      where: {
        sourceId: clubId,
        targetId: motherId,
        relation: 'WON',
        metadata: { path: ['year'], equals: 2025 },
      },
    });
    expect(e2025).toBe(0);
    const rn = await prisma.club.findUnique({ where: { qid: QID_VN_RN }, select: { name: true } });
    const es = await prisma.club.findUnique({ where: { qid: QID_VN_ES }, select: { name: true } });
    expect(rn?.name).toBe('Vila Nova Futebol Clube');
    expect(es?.name).toBe('Vila Nova FC (ES)');
    expect(await prisma.club.count({ where: { qid: 'Q1513287' } })).toBe(0);
  });

  it('MG intocado no banco de teste (zero arestas MG)', async () => {
    if (!dbOk || !isPostgres) return;
    const mg = await prisma.knowledgeGraph.count({
      where: {
        relation: 'WON',
        metadata: { path: ['source'], equals: 'rsssf' },
        targetId: { not: motherId },
      },
    });
    expect(mg).toBe(0);
  });
});
