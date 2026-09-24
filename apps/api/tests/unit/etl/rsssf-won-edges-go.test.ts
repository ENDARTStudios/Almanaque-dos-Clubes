import { describe, it, expect } from 'vitest';
import {
  buildGoWonEdgeMetadata,
  isSameGoStableData,
  syncGoWonEdges,
  GO_WRITER_VERSION,
  type GoWonRepo,
} from '../../../src/modules/etl/rsssf-won-edges-go.service.js';
import { loadGoPack } from '../../../src/lib/rsssf/go/index.js';
import type { GoCandidate } from '../../../src/lib/rsssf/go/types.js';

// T448b-2d GO — writer idempotente. Sem rede/DB.

const pack = loadGoPack();
const TWO = pack.candidates; // 2023, 2024

function mockRepo(over: Partial<GoWonRepo> = {}): GoWonRepo {
  return {
    findCompetitionByQid: async () => [{ id: 'comp1' }],
    findClubByQid: async () => [{ id: 'club1', qid: 'Q198034', name: 'Atl', deletedAt: null }],
    findWonEdges: async () => [],
    createWonEdge: async () => ({ id: 'edge-new' }),
    updateWonEdgeMetadata: async () => {},
    ...over,
  };
}

describe('T448b-2d GO — build metadata', () => {
  it('retrievedAt vem do candidate (não now) + writerVersion', () => {
    const m = buildGoWonEdgeMetadata(TWO[0], new Date('2027-01-01T00:00:00Z'));
    expect(m.retrievedAt).toBe(TWO[0].retrievedAt);
    expect(m.writerVersion).toBe(GO_WRITER_VERSION);
    expect(m.parserVersion).toBe('t448b2d-go-parser-v1');
    expect(m.uf).toBe('GO');
    expect(m.pilotScope).toBe('go-2023-2024');
    expect(m.dedupKey).toBe('Q931386|2023|Q198034|WON');
  });

  it('isSameGoStableData ignora importedAt/deletedAt', () => {
    const a = buildGoWonEdgeMetadata(TWO[0], new Date('2027-01-01T00:00:00Z'));
    const b = buildGoWonEdgeMetadata(TWO[0], new Date('2027-02-02T00:00:00Z'));
    expect(a.importedAt).not.toBe(b.importedAt);
    expect(isSameGoStableData(a, b)).toBe(true);
    expect(isSameGoStableData({ ...a, deletedAt: 'x' }, b)).toBe(true);
    expect(isSameGoStableData({ ...a, retrievedAt: '2020-01-01T00:00:00Z' }, b)).toBe(false);
  });
});

describe('T448b-2d GO — sync', () => {
  it('cenário limpo ⇒ create 2', async () => {
    const res = await syncGoWonEdges(TWO, mockRepo());
    expect(res.counts).toMatchObject({
      created: 2,
      updated: 0,
      restored: 0,
      skipped: 0,
      failed: 0,
    });
  });

  it('re-run ⇒ skip 2', async () => {
    const e = buildGoWonEdgeMetadata(TWO[0], new Date());
    const res = await syncGoWonEdges(
      [TWO[0]],
      mockRepo({ findWonEdges: async () => [{ id: 'e1', metadata: e }] }),
    );
    expect(res.counts.skipped).toBe(1);
  });

  it('ativa incompleta ⇒ update', async () => {
    const e: Record<string, unknown> = buildGoWonEdgeMetadata(TWO[0], new Date());
    delete e.retrievedAt;
    const res = await syncGoWonEdges(
      [TWO[0]],
      mockRepo({ findWonEdges: async () => [{ id: 'e1', metadata: e }] }),
    );
    expect(res.counts.updated).toBe(1);
  });

  it('soft-deleted com reason GO permitida ⇒ restore', async () => {
    let written: Record<string, unknown> | null = null;
    const e = {
      ...buildGoWonEdgeMetadata(TWO[0], new Date()),
      deletedAt: 't',
      deletionReason: 'rollback_t448b2d_go_apply',
    };
    const res = await syncGoWonEdges(
      [TWO[0]],
      mockRepo({
        findWonEdges: async () => [{ id: 'e1', metadata: e }],
        updateWonEdgeMetadata: async (_i, m) => {
          written = m as unknown as Record<string, unknown>;
        },
      }),
    );
    expect(res.counts.restored).toBe(1);
    expect(written!.deletedAt).toBeUndefined();
    expect(written!.previousDeletionReason).toBe('rollback_t448b2d_go_apply');
  });

  it('soft-deleted com reason inesperada ⇒ fail', async () => {
    const e = {
      ...buildGoWonEdgeMetadata(TWO[0], new Date()),
      deletedAt: 't',
      deletionReason: 'manual',
    };
    const res = await syncGoWonEdges(
      [TWO[0]],
      mockRepo({ findWonEdges: async () => [{ id: 'e1', metadata: e }] }),
    );
    expect(res.failures.some((f) => f.reason === 'unexpected_soft_deleted_edge')).toBe(true);
  });

  it('múltiplas arestas ⇒ duplicate_factual_edges', async () => {
    const e = buildGoWonEdgeMetadata(TWO[0], new Date());
    const res = await syncGoWonEdges(
      [TWO[0]],
      mockRepo({
        findWonEdges: async () => [
          { id: 'e1', metadata: e },
          { id: 'e2', metadata: e },
        ],
      }),
    );
    expect(res.failures.some((f) => f.reason === 'duplicate_factual_edges')).toBe(true);
  });

  it('competição ausente ⇒ missing_competition', async () => {
    const res = await syncGoWonEdges([TWO[0]], mockRepo({ findCompetitionByQid: async () => [] }));
    expect(res.failures.some((f) => f.reason === 'missing_competition')).toBe(true);
  });

  it('clube ausente ⇒ missing_club; soft-deleted ⇒ soft_deleted_club', async () => {
    expect(
      (await syncGoWonEdges([TWO[0]], mockRepo({ findClubByQid: async () => [] }))).failures.some(
        (f) => f.reason === 'missing_club',
      ),
    ).toBe(true);
    const sd = mockRepo({
      findClubByQid: async () => [{ id: 'c', qid: 'Q198034', name: 'A', deletedAt: new Date() }],
    });
    expect(
      (await syncGoWonEdges([TWO[0]], sd)).failures.some((f) => f.reason === 'soft_deleted_club'),
    ).toBe(true);
  });

  it('rejeita 2025 e Q1513287 (fail-fast, zero create)', async () => {
    let created = 0;
    const repo = mockRepo({
      createWonEdge: async () => {
        created += 1;
        return { id: 'x' };
      },
    });
    const c2025 = { ...TWO[0], seasonYear: 2025 } as GoCandidate;
    const cVN = { ...TWO[0], clubQid: 'Q1513287' } as GoCandidate;
    expect((await syncGoWonEdges([c2025], repo)).counts.created).toBe(0);
    expect((await syncGoWonEdges([cVN], repo)).counts.created).toBe(0);
    expect(created).toBe(0);
  });
});
