/**
 * T448b-2b FASE 2 — Integração: writer de arestas WON estaduais (RSSSF) com
 * Prisma real + leitura pública (GET /clubs/:id/titles) com soft-delete lógico.
 *
 * Fixture escopada (R2): nome/QIDs/ANOS únicos; limpeza no afterAll.
 * Requer Postgres; local sem Postgres → skip honesto; TEST_REQUIRE_DB=true → falha.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import {
  createPrismaRsssfWonRepo,
  syncRsssfWonEdges,
} from '../../src/modules/etl/rsssf-won-edges.service.js';
import { clubsRepository } from '../../src/modules/clubs/repository.js';
import type { WonCandidate } from '../../src/lib/rsssf/types.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let dbOk = true;
const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');

const CLUB_NAME = 'RSSSF Writer FC T448b2b';
const QID_CLUB = 'Q94802001';
const QID_COMP = 'Q94802002';
const COMP_NAME = 'Estadual de Teste T448b2b';
const YEARS = [1902, 1903, 1904];

let clubId = '';

function cand(over: Partial<WonCandidate> = {}): WonCandidate {
  const base = {
    relation: 'WON',
    competitionQid: QID_COMP,
    competitionName: COMP_NAME,
    seasonYear: 1902,
    clubQid: QID_CLUB,
    clubName: CLUB_NAME,
    clubId: null,
    hierarchy: 'estadual',
    gender: 'men',
    source: 'rsssf',
    sourceUrl: 'https://rsssfbrasil.com/tablesfq/mg2023.htm',
    retrievedAt: '2026-09-24T00:00:00Z',
    authorCredit: '(C) Copyright Test Author, RSSSF and RSSSF Brazil.',
    licenseText:
      'You are free to copy this document provided that proper acknowledgement is given. All rights reserved.',
    attributionRequired: true,
    externalId: 'aaaa1111bbbb2222',
    dedupKey: `${QID_COMP}|1902|${QID_CLUB}|WON`,
    metadataExtras: {
      pageChampionPhrase: '** X are champions **',
      tablePosition: 1,
      sourcePageUrlHash: 'shash',
      parserVersion: 't448b2b-fase1-v1',
    },
    ...over,
  } as WonCandidate;
  base.dedupKey = `${base.competitionQid}|${base.seasonYear}|${base.clubQid}|WON`;
  return base;
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  if (!isPostgres) return;
  try {
    await prisma.knowledgeGraph.count();
  } catch {
    dbOk = false;
    if (process.env.TEST_REQUIRE_DB === 'true')
      throw new Error('[R1/TEST_REQUIRE_DB] banco ausente no CI — falha, não skip (D-2026-09-18)');
    return;
  }
  // Clube SEM qid, criado só por NOME — exercita a ponte de identidade por nome.
  const club = await prisma.club.create({ data: { name: CLUB_NAME, country: 'BR' } });
  clubId = club.id;
  // Competição-mãe NÃO criada — o writer faz o upsert por qid.
});

afterAll(async () => {
  if (dbOk && isPostgres) {
    const comp = await prisma.competition.findUnique({
      where: { qid: QID_COMP },
      select: { id: true },
    });
    await prisma.knowledgeGraph.deleteMany({
      where: { OR: [{ sourceType: 'Club', sourceId: clubId }] },
    });
    if (comp) await prisma.competition.deleteMany({ where: { id: comp.id } });
    await prisma.club.deleteMany({ where: { id: clubId } });
  }
  await app?.close();
});

describe('T448b-2b FASE 2 — writer WON RSSSF (Postgres real)', () => {
  it('FASE 0.5 skip-honesto quando não há Postgres', () => {
    if (!isPostgres) expect(dbOk).toBe(true);
  });

  it('ponte de identidade: cria mãe, vincula qid do clube e grava 3 arestas', async () => {
    if (!dbOk || !isPostgres) return;
    const candidates = YEARS.map((y) => cand({ seasonYear: y }));
    const repo = createPrismaRsssfWonRepo(prisma);
    const res = await syncRsssfWonEdges(candidates, repo, {
      importedAt: new Date('2026-09-24T00:00:00Z'),
    });

    expect(res.counts.created).toBe(3);
    expect(res.counts.updated).toBe(0);
    expect(res.counts.failed).toBe(0);
    expect(res.competitionsCreated).toEqual([{ qid: QID_COMP, name: COMP_NAME }]);
    expect(res.clubsLinked).toEqual([{ id: clubId, qid: QID_CLUB }]);

    const club = await prisma.club.findUnique({ where: { id: clubId }, select: { qid: true } });
    expect(club?.qid).toBe(QID_CLUB);
    const comp = await prisma.competition.findUnique({
      where: { qid: QID_COMP },
      select: { id: true },
    });
    expect(comp).not.toBeNull();

    const edges = await prisma.knowledgeGraph.findMany({
      where: { sourceId: clubId, relation: 'WON' },
      select: { id: true, metadata: true },
    });
    expect(edges).toHaveLength(3);
    const meta = edges[0].metadata as Record<string, unknown>;
    expect(meta.sourceUrl).toBe('https://rsssfbrasil.com/tablesfq/mg2023.htm');
    expect(meta.authorCredit).toContain('Copyright');
    expect(meta.licenseText).toContain('acknowledgement');
    expect(meta.hierarchy).toBe('estadual');
    expect(meta.dataSource).toBe('rsssf');
  });

  it('idempotência: 2ª rodada NÃO cria nada (created=0, skipped=3)', async () => {
    if (!dbOk || !isPostgres) return;
    const candidates = YEARS.map((y) => cand({ seasonYear: y }));
    const res = await syncRsssfWonEdges(candidates, createPrismaRsssfWonRepo(prisma));
    expect(res.counts.created).toBe(0);
    expect(res.counts.skipped).toBe(3);
    const count = await prisma.knowledgeGraph.count({
      where: { sourceId: clubId, relation: 'WON' },
    });
    expect(count).toBe(3);
  });

  it('fail-fast: clube inexistente NÃO cria órfão', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await syncRsssfWonEdges(
      [cand({ clubQid: 'Q94999999', clubName: 'Clube Inexistente T448b2b', seasonYear: 1905 })],
      createPrismaRsssfWonRepo(prisma),
    );
    expect(res.counts.created).toBe(0);
    expect(res.failures.some((f) => f.reason === 'club_missing')).toBe(true);
  });

  it('atribuição ausente bloqueia a escrita', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await syncRsssfWonEdges(
      [cand({ seasonYear: 1906, licenseText: '' })],
      createPrismaRsssfWonRepo(prisma),
    );
    expect(res.counts.attributionMissing).toBe(1);
    expect(res.counts.created).toBe(0);
  });

  it('API /clubs/:id/titles retorna os 3 títulos com fonte', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await app.inject({ method: 'GET', url: `/api/v1/clubs/${clubId}/titles` });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      data: Array<{ sourceUrl: string | null; hierarchy: string }>;
      total: number;
    };
    expect(body.total).toBe(3);
    expect(body.data[0].sourceUrl).toContain('rsssfbrasil.com');
    expect(body.data[0].hierarchy).toBe('estadual');
  });

  it('soft-delete (metadata.deletedAt) exclui das leituras', async () => {
    if (!dbOk || !isPostgres) return;
    const edge = await prisma.knowledgeGraph.findFirstOrThrow({
      where: { sourceId: clubId, relation: 'WON' },
      select: { id: true, metadata: true },
    });
    const meta = edge.metadata as Record<string, unknown>;
    await prisma.knowledgeGraph.update({
      where: { id: edge.id },
      data: { metadata: { ...meta, deletedAt: '2026-09-24T00:00:00Z', deletionReason: 'test' } },
    });
    const titles = await clubsRepository.listTitlesByClub(clubId);
    expect(titles).toHaveLength(2);
  });
});
