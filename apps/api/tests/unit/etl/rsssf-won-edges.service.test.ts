import { describe, it, expect } from 'vitest';
import {
  buildRsssfWonMetadata,
  isSameStableData,
  syncRsssfWonEdges,
  RSSSF_WON_WRITER_VERSION,
  type RsssfWonRepo,
} from '../../../src/modules/etl/rsssf-won-edges.service.js';
import type { WonCandidate } from '../../../src/lib/rsssf/types.js';

// T448b-2b #198 — proveniência (retrievedAt) + idempotência sobre soft-deleted. Sem rede/DB.

function cand(over: Partial<WonCandidate> = {}): WonCandidate {
  return {
    relation: 'WON',
    competitionQid: 'Q731877',
    competitionName: 'Campeonato Mineiro',
    competitionId: null,
    seasonYear: 2023,
    clubQid: 'Q270995',
    clubName: 'Atlético',
    clubId: null,
    hierarchy: 'estadual',
    gender: 'men',
    source: 'rsssf',
    sourceUrl: 'https://rsssfbrasil.com/tablesfq/mg2023.htm',
    retrievedAt: '2026-09-23T22:59:09Z',
    authorCredit: '(C) Copyright Claudio Freati, RSSSF and RSSSF Brazil 2022-2023.',
    licenseText: 'free to copy provided that proper acknowledgement is given.',
    attributionRequired: true,
    externalId: 'abc123',
    dedupKey: 'Q731877|2023|Q270995|WON',
    metadataExtras: {
      pageChampionPhrase: '** X **',
      tablePosition: 1,
      sourcePageUrlHash: 'h',
      parserVersion: 't448b2b-fase1-v1',
    },
    ...over,
  };
}

function mockRepo(over: Partial<RsssfWonRepo> = {}): RsssfWonRepo {
  return {
    findClubByQid: async () => ({ id: 'club1', qid: 'Q270995', name: 'Atl', deletedAt: null }),
    findClubsByName: async () => [],
    setClubQid: async () => {},
    findCompetitionByQid: async () => ({ id: 'comp1' }),
    createCompetition: async () => ({ id: 'comp1' }),
    findWonEdges: async () => [],
    createWonEdge: async () => ({ id: 'edge-new' }),
    updateWonEdgeMetadata: async () => {},
    ...over,
  };
}

describe('T448b-2b #198 — buildRsssfWonMetadata', () => {
  it('persiste retrievedAt do candidate (não now) + bump de parserVersion', () => {
    const m = buildRsssfWonMetadata(cand(), new Date('2027-01-01T00:00:00Z'));
    expect(m.retrievedAt).toBe('2026-09-23T22:59:09Z');
    expect(m.parserVersion).toBe(RSSSF_WON_WRITER_VERSION);
    expect(m.candidateParserVersion).toBe('t448b2b-fase1-v1');
    expect(m.sourceUrl).toContain('rsssfbrasil.com');
    expect(m.authorCredit).toContain('Copyright');
    expect(m.licenseText).toContain('acknowledgement');
    expect(m.dedupKey).toBe('Q731877|2023|Q270995|WON');
  });

  it('fail-fast se retrievedAt ausente ou inválido', () => {
    expect(() =>
      buildRsssfWonMetadata(cand({ retrievedAt: undefined as never }), new Date()),
    ).toThrow(/retrievedAt/);
    expect(() => buildRsssfWonMetadata(cand({ retrievedAt: 'not-a-date' }), new Date())).toThrow(
      /retrievedAt/,
    );
  });
});

describe('T448b-2b #198 — isSameStableData', () => {
  const prev = buildRsssfWonMetadata(cand(), new Date('2027-01-01T00:00:00Z'));
  const next = buildRsssfWonMetadata(cand(), new Date('2027-02-02T00:00:00Z'));

  it('true quando estáveis iguais mesmo com importedAt diferente', () => {
    expect(prev.importedAt).not.toBe(next.importedAt);
    expect(isSameStableData(prev, next)).toBe(true);
  });

  it('false se retrievedAt mudar', () => {
    expect(isSameStableData({ ...prev, retrievedAt: '2020-01-01T00:00:00Z' }, next)).toBe(false);
  });

  it('false se parserVersion mudar', () => {
    expect(isSameStableData({ ...prev, parserVersion: 'old' }, next)).toBe(false);
  });

  it('false se authorCredit/sourceUrl mudarem', () => {
    expect(isSameStableData({ ...prev, authorCredit: 'x' }, next)).toBe(false);
    expect(isSameStableData({ ...prev, sourceUrl: 'y' }, next)).toBe(false);
  });

  it('ignora deletedAt/deletionReason/reactivatedAt', () => {
    expect(
      isSameStableData({ ...prev, deletedAt: 't', deletionReason: 'r', reactivatedAt: 't' }, next),
    ).toBe(true);
  });
});

describe('T448b-2b #198 — plano de upsert', () => {
  it('sem existente ⇒ create', async () => {
    const res = await syncRsssfWonEdges([cand()], mockRepo());
    expect(res.counts.created).toBe(1);
    expect(res.counts.failed).toBe(0);
  });

  it('ativa completa ⇒ skip', async () => {
    const existing = buildRsssfWonMetadata(cand(), new Date());
    const res = await syncRsssfWonEdges(
      [cand()],
      mockRepo({ findWonEdges: async () => [{ id: 'e1', metadata: existing }] }),
    );
    expect(res.counts.skipped).toBe(1);
    expect(res.counts.created).toBe(0);
  });

  it('ativa sem retrievedAt ⇒ update', async () => {
    const existing: Record<string, unknown> = buildRsssfWonMetadata(cand(), new Date());
    delete existing.retrievedAt;
    const res = await syncRsssfWonEdges(
      [cand()],
      mockRepo({ findWonEdges: async () => [{ id: 'e1', metadata: existing }] }),
    );
    expect(res.counts.updated).toBe(1);
    expect(res.counts.created).toBe(0);
  });

  it('soft-deleted com reason de rollback ⇒ restore (sem deletedAt + trilha)', async () => {
    let written: Record<string, unknown> | null = null;
    const existing = {
      ...buildRsssfWonMetadata(cand(), new Date()),
      deletedAt: '2026-09-24T00:00:00Z',
      deletionReason: 'rollback_t448b2b_mg_apply',
    };
    const res = await syncRsssfWonEdges(
      [cand()],
      mockRepo({
        findWonEdges: async () => [{ id: 'e1', metadata: existing }],
        updateWonEdgeMetadata: async (_id, m) => {
          written = m as unknown as Record<string, unknown>;
        },
      }),
    );
    expect(res.counts.restored).toBe(1);
    expect(res.counts.created).toBe(0);
    expect(written!.deletedAt).toBeUndefined();
    expect(written!.deletionReason).toBeUndefined();
    expect(written!.previousDeletionReason).toBe('rollback_t448b2b_mg_apply');
    expect(written!.retrievedAt).toBe('2026-09-23T22:59:09Z');
  });

  it('soft-deleted com reason inesperado ⇒ fail', async () => {
    const existing = {
      ...buildRsssfWonMetadata(cand(), new Date()),
      deletedAt: 't',
      deletionReason: 'manual_review',
    };
    const res = await syncRsssfWonEdges(
      [cand()],
      mockRepo({ findWonEdges: async () => [{ id: 'e1', metadata: existing }] }),
    );
    expect(res.counts.failed).toBe(1);
    expect(res.failures.some((f) => f.reason === 'unexpected_soft_deleted_edge')).toBe(true);
  });

  it('múltiplas arestas do mesmo fato ⇒ fail (duplicate_factual_edges)', async () => {
    const e = buildRsssfWonMetadata(cand(), new Date());
    const res = await syncRsssfWonEdges(
      [cand()],
      mockRepo({
        findWonEdges: async () => [
          { id: 'e1', metadata: e },
          { id: 'e2', metadata: e },
        ],
      }),
    );
    expect(res.counts.failed).toBe(1);
    expect(res.failures.some((f) => f.reason === 'duplicate_factual_edges')).toBe(true);
  });

  it('re-run após completo ⇒ skip total', async () => {
    const e = buildRsssfWonMetadata(cand(), new Date());
    const res = await syncRsssfWonEdges(
      [cand()],
      mockRepo({ findWonEdges: async () => [{ id: 'e1', metadata: e }] }),
    );
    expect(res.counts).toMatchObject({
      created: 0,
      updated: 0,
      restored: 0,
      skipped: 1,
      failed: 0,
    });
  });
});
