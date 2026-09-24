/**
 * T448b-2b #198 — Integração: restauração/atualização idempotente sobre arestas
 * soft-deleted + proveniência (retrievedAt) persistida. Postgres real; sem produção.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../src/config/prisma.js';
import {
  createPrismaRsssfWonRepo,
  syncRsssfWonEdges,
} from '../../src/modules/etl/rsssf-won-edges.service.js';
import type { WonCandidate } from '../../src/lib/rsssf/types.js';

let dbOk = true;
const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');

const QID_CLUB = 'Q94803001';
const QID_COMP = 'Q94803002';
let clubId = '';
let compId = '';

function cand(year: number): WonCandidate {
  const sourceUrl = `https://rsssfbrasil.com/tablesfq/mg${year}.htm`;
  return {
    relation: 'WON',
    competitionQid: QID_COMP,
    competitionName: 'Prov Test T448b2b',
    competitionId: null,
    seasonYear: year,
    clubQid: QID_CLUB,
    clubName: 'RSSSF Prov FC T448b2b',
    clubId: null,
    hierarchy: 'estadual',
    gender: 'men',
    source: 'rsssf',
    sourceUrl,
    retrievedAt: '2026-09-23T22:59:09Z',
    authorCredit: '(C) Copyright Claudio Freati, RSSSF and RSSSF Brazil.',
    licenseText: 'free to copy provided that proper acknowledgement is given.',
    attributionRequired: true,
    externalId: `ext-${year}`,
    dedupKey: `${QID_COMP}|${year}|${QID_CLUB}|WON`,
    metadataExtras: {
      pageChampionPhrase: '** X **',
      tablePosition: 1,
      sourcePageUrlHash: `h-${year}`,
      parserVersion: 't448b2b-fase1-v1',
    },
  };
}

/** Metadata "estilo prod v1" (sem retrievedAt), opcionalmente soft-deleted. */
function prodLikeMetadata(year: number, deletionReason?: string): Record<string, unknown> {
  return {
    year,
    season: String(year),
    hierarchy: 'estadual',
    gender: 'men',
    dataSource: 'rsssf',
    source: 'rsssf',
    sourceUrl: `https://rsssfbrasil.com/tablesfq/mg${year}.htm`,
    license: 'RSSSF: uso condicionado a atribuição adequada',
    authorCredit: '(C) Copyright Claudio Freati, RSSSF and RSSSF Brazil.',
    licenseText: 'free to copy provided that proper acknowledgement is given.',
    attributionRequired: true,
    editionQid: null,
    parserVersion: 't448b2b-fase1-v1',
    externalId: `ext-${year}`,
    importedAt: '2026-09-24T00:00:00Z',
    ...(deletionReason ? { deletedAt: '2026-09-24T01:00:00Z', deletionReason } : {}),
  };
}

async function insertEdge(year: number, deletionReason?: string): Promise<string> {
  const e = await prisma.knowledgeGraph.create({
    data: {
      sourceId: clubId,
      sourceType: 'Club',
      targetId: compId,
      targetType: 'Competition',
      relation: 'WON',
      metadata: prodLikeMetadata(year, deletionReason) as never,
    },
    select: { id: true },
  });
  return e.id;
}

async function countEdges(where: Record<string, unknown>): Promise<number> {
  return prisma.knowledgeGraph.count({ where: { sourceId: clubId, relation: 'WON', ...where } });
}

beforeAll(async () => {
  if (!isPostgres) return;
  try {
    await prisma.knowledgeGraph.count();
  } catch {
    dbOk = false;
    if (process.env.TEST_REQUIRE_DB === 'true')
      throw new Error('[R1/TEST_REQUIRE_DB] banco ausente no CI — falha, não skip (D-2026-09-18)');
    return;
  }
  const club = await prisma.club.create({
    data: { name: 'RSSSF Prov FC T448b2b', country: 'BR', qid: QID_CLUB },
  });
  clubId = club.id;
  const comp = await prisma.competition.create({
    data: { name: 'Prov Test T448b2b', type: 'LEAGUE', qid: QID_COMP, importedFrom: 'manual' },
  });
  compId = comp.id;
  // Replica o estado de produção: 3 arestas soft-deleted pelo rollback, sem retrievedAt.
  await insertEdge(1910, 'rollback_t448b2b_mg_apply');
  await insertEdge(1911, 'rollback_t448b2b_mg_apply');
  await insertEdge(1912, 'rollback_t448b2b_mg_apply');
});

afterAll(async () => {
  if (dbOk && isPostgres) {
    await prisma.knowledgeGraph.deleteMany({ where: { sourceId: clubId } });
    await prisma.competition.deleteMany({ where: { qid: QID_COMP } });
    await prisma.club.deleteMany({ where: { id: clubId } });
  }
});

describe('T448b-2b #198 — restauração + proveniência (Postgres real)', () => {
  it('restaura 3 soft-deleted (rollback) e grava retrievedAt; sem duplicar', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await syncRsssfWonEdges(
      [cand(1910), cand(1911), cand(1912)],
      createPrismaRsssfWonRepo(prisma),
      { importedAt: new Date('2026-09-25T00:00:00Z') },
    );
    expect(res.counts).toMatchObject({
      created: 0,
      updated: 0,
      restored: 3,
      skipped: 0,
      failed: 0,
    });

    const active = await prisma.knowledgeGraph.findMany({
      where: { sourceId: clubId, relation: 'WON' },
      select: { id: true, metadata: true },
    });
    expect(active).toHaveLength(3); // nenhuma linha nova
    for (const e of active) {
      const m = e.metadata as Record<string, unknown>;
      expect(m.retrievedAt).toBe('2026-09-23T22:59:09Z');
      expect(m.deletedAt).toBeUndefined();
      expect(m.deletionReason).toBeUndefined();
      expect(m.previousDeletionReason).toBe('rollback_t448b2b_mg_apply');
      expect(m.parserVersion).toBe('t448b2b-fase2-provenance-v2');
    }
  });

  it('re-run ⇒ skip total (idempotente)', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await syncRsssfWonEdges(
      [cand(1910), cand(1911), cand(1912)],
      createPrismaRsssfWonRepo(prisma),
    );
    expect(res.counts).toMatchObject({
      created: 0,
      updated: 0,
      restored: 0,
      skipped: 3,
      failed: 0,
    });
  });

  it('ativa incompleta (sem retrievedAt) ⇒ update, não create', async () => {
    if (!dbOk || !isPostgres) return;
    const id = await insertEdge(1913); // ativa, sem retrievedAt
    const res = await syncRsssfWonEdges([cand(1913)], createPrismaRsssfWonRepo(prisma));
    expect(res.counts).toMatchObject({ created: 0, updated: 1, failed: 0 });
    const row = await prisma.knowledgeGraph.findUniqueOrThrow({
      where: { id },
      select: { metadata: true },
    });
    expect((row.metadata as Record<string, unknown>).retrievedAt).toBe('2026-09-23T22:59:09Z');
    expect(await countEdges({})).toBe(4); // 3 restauradas + 1 atualizada — nenhuma linha nova
  });

  it('soft-deleted com reason inesperado ⇒ fail-fast (não restaura)', async () => {
    if (!dbOk || !isPostgres) return;
    await insertEdge(1914, 'manual_review');
    const res = await syncRsssfWonEdges([cand(1914)], createPrismaRsssfWonRepo(prisma));
    expect(res.counts.failed).toBe(1);
    expect(res.failures.some((f) => f.reason === 'unexpected_soft_deleted_edge')).toBe(true);
    const stillDeleted = await prisma.knowledgeGraph.findFirst({
      where: { sourceId: clubId, relation: 'WON' },
    });
    expect(stillDeleted).not.toBeNull();
  });
});
