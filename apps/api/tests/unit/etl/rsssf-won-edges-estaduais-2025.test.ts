import { describe, it, expect } from 'vitest';
import {
  loadGo2025Pack,
  loadPr2025Pack,
  loadEstadual2025Pack,
  validateEstadual2025Pack,
  GO_2025_EXPECTED,
  PR_2025_EXPECTED,
  Estadual2025PackError,
} from '../../../src/lib/rsssf/estaduais-2025-pack.js';
import goRaw from '../../../src/lib/rsssf/data/go-2025-pilot-candidates.json' with { type: 'json' };
import {
  buildGoWonEdgeMetadata,
  syncGoWonEdges,
  GO_PR_WRITER_VERSION,
  GO_PR_WON_RESTORABLE_REASONS,
  type GoWonRepo,
} from '../../../src/modules/etl/rsssf-won-edges-go.service.js';
import type { GoCandidate } from '../../../src/lib/rsssf/go/types.js';

// T448b-2d — writer estaduais 2025 (GO 2025 / PR 2025). Sem rede/DB.

const GO_OPTS = {
  allowedYears: [2025] as readonly number[],
  expectedCompetitionQid: 'Q931386',
  expectedClubQid: 'Q1513287',
  writerVersion: GO_PR_WRITER_VERSION,
  restorableReasons: GO_PR_WON_RESTORABLE_REASONS,
};
const PR_OPTS = {
  ...GO_OPTS,
  expectedCompetitionQid: 'Q920397',
  expectedClubQid: 'Q2580083',
};

function mockRepo(over: Partial<GoWonRepo> = {}): GoWonRepo {
  return {
    findCompetitionByQid: async () => [{ id: 'comp1' }],
    findClubByQid: async (qid) => [{ id: 'club1', qid, name: 'X', deletedAt: null }],
    findWonEdges: async () => [],
    createWonEdge: async () => ({ id: 'edge-new' }),
    updateWonEdgeMetadata: async () => {},
    ...over,
  };
}

describe('T448b-2d estaduais 2025 — packs', () => {
  it('go-2025: 1 candidate (Q931386|2025|Q1513287|WON)', () => {
    const p = loadGo2025Pack();
    expect(p.pilotScope).toBe('go-2025');
    expect(p.candidates).toHaveLength(1);
    expect(p.candidates[0].dedupKey).toBe('Q931386|2025|Q1513287|WON');
    expect(p.candidates[0].sourceUrl).toContain('go2025.htm');
    expect(p.candidates[0].authorCredit).toContain('Guillermo Alexander Rivera');
    expect(p.doNotTouch).toEqual(['Q10391045', 'Q10391046']);
  });

  it('pr-2025: 1 candidate (Q920397|2025|Q2580083|WON)', () => {
    const p = loadPr2025Pack();
    expect(p.pilotScope).toBe('pr-2025');
    expect(p.candidates).toHaveLength(1);
    expect(p.candidates[0].dedupKey).toBe('Q920397|2025|Q2580083|WON');
    expect(p.candidates[0].sourceUrl).toContain('pr2025.htm');
    expect(p.candidates[0].authorCredit).toContain('Moacir Dalpiaz de Souza');
    expect(p.doNotTouch).toEqual(['Q671621']);
  });

  it('retrievedAt é estático (ISO do pack); externalId estável entre loads', () => {
    const a = loadGo2025Pack().candidates[0];
    const b = loadEstadual2025Pack('go-2025').candidates[0];
    expect(a.retrievedAt).toBe('2026-09-25T16:26:51Z');
    expect(a.externalId).toBe('92058076686c04aa');
    expect(a.externalId).toBe(b.externalId);
  });

  it('validação rejeita ano/competição/clube fora do escopo', () => {
    const base = JSON.parse(JSON.stringify(goRaw)) as { candidates: GoCandidate[] };
    const mut = (patch: Record<string, unknown>) => {
      const c = JSON.parse(JSON.stringify(base)) as {
        candidates: Array<Record<string, unknown>>;
      };
      Object.assign(c.candidates[0], patch);
      return c;
    };
    expect(() => validateEstadual2025Pack(mut({ seasonYear: 2024 }), GO_2025_EXPECTED)).toThrow(
      Estadual2025PackError,
    );
    expect(() => validateEstadual2025Pack(mut({ competitionQid: 'Q1' }), GO_2025_EXPECTED)).toThrow(
      Estadual2025PackError,
    );
    expect(() => validateEstadual2025Pack(mut({ clubQid: 'Q1' }), GO_2025_EXPECTED)).toThrow(
      Estadual2025PackError,
    );
  });

  it('validação rejeita attribution ausente / retrievedAt inválido / doNotTouch', () => {
    const base = JSON.parse(JSON.stringify(goRaw)) as { candidates: GoCandidate[] };
    const mut = (patch: Record<string, unknown>) => {
      const c = JSON.parse(JSON.stringify(base)) as {
        candidates: Array<Record<string, unknown>>;
      };
      Object.assign(c.candidates[0], patch);
      return c;
    };
    expect(() => validateEstadual2025Pack(mut({ authorCredit: '  ' }), GO_2025_EXPECTED)).toThrow(
      Estadual2025PackError,
    );
    expect(() =>
      validateEstadual2025Pack(mut({ retrievedAt: 'nao-data' }), GO_2025_EXPECTED),
    ).toThrow(Estadual2025PackError);
    expect(() =>
      validateEstadual2025Pack(mut({ attributionRequired: false }), GO_2025_EXPECTED),
    ).toThrow(Estadual2025PackError);
    expect(() =>
      validateEstadual2025Pack({ ...base, doNotTouch: ['Q1513287'] }, GO_2025_EXPECTED),
    ).toThrow(Estadual2025PackError);
  });

  it('PR expected mismatch é rejeitado (escopo cruzado)', () => {
    expect(() => validateEstadual2025Pack(goRaw, PR_2025_EXPECTED)).toThrow(Estadual2025PackError);
  });
});

describe('T448b-2d estaduais 2025 — metadata', () => {
  it('retrievedAt vem do candidate; writerVersion/uf do escopo 2025', () => {
    const c = loadGo2025Pack().candidates[0];
    const m = buildGoWonEdgeMetadata(c, new Date('2030-01-01T00:00:00Z'), {
      writerVersion: GO_PR_WRITER_VERSION,
    });
    expect(m.retrievedAt).toBe(c.retrievedAt);
    expect(m.importedAt).toBe('2030-01-01T00:00:00.000Z');
    expect(m.writerVersion).toBe('t448b2d-writer-go-pr-v1');
    expect(m.parserVersion).toBe('t448b2d-go-parser-v1');
    expect(m.uf).toBe('GO');
    expect(m.dedupKey).toBe('Q931386|2025|Q1513287|WON');
  });

  it('PR herda uf=PR do candidate', () => {
    const c = loadPr2025Pack().candidates[0];
    const m = buildGoWonEdgeMetadata(c, new Date(), { writerVersion: GO_PR_WRITER_VERSION });
    expect(m.uf).toBe('PR');
  });
});

describe('T448b-2d estaduais 2025 — sync', () => {
  it('cenário limpo ⇒ create 1 (GO) e 1 (PR)', async () => {
    const go = await syncGoWonEdges(loadGo2025Pack().candidates, mockRepo(), GO_OPTS);
    expect(go.counts).toMatchObject({ created: 1, failed: 0, attributionMissing: 0 });
    const pr = await syncGoWonEdges(loadPr2025Pack().candidates, mockRepo(), PR_OPTS);
    expect(pr.counts).toMatchObject({ created: 1, failed: 0 });
  });

  it('re-run ⇒ skip 1', async () => {
    const c = loadGo2025Pack().candidates[0];
    const e = buildGoWonEdgeMetadata(c, new Date(), { writerVersion: GO_PR_WRITER_VERSION });
    const res = await syncGoWonEdges(
      [c],
      mockRepo({ findWonEdges: async () => [{ id: 'e1', metadata: e }] }),
      GO_OPTS,
    );
    expect(res.counts.skipped).toBe(1);
  });

  it('candidate 2024 no escopo 2025 ⇒ out_of_scope_season (zero create)', async () => {
    const c = { ...loadGo2025Pack().candidates[0], seasonYear: 2024 } as GoCandidate;
    const res = await syncGoWonEdges([c], mockRepo(), GO_OPTS);
    expect(res.counts.created).toBe(0);
    expect(res.failures.some((f) => f.reason === 'out_of_scope_season')).toBe(true);
  });

  it('competição/clube fora do escopo ⇒ fail-fast', async () => {
    const cComp = { ...loadGo2025Pack().candidates[0], competitionQid: 'Q920397' } as GoCandidate;
    expect(
      (await syncGoWonEdges([cComp], mockRepo(), GO_OPTS)).failures.some(
        (f) => f.reason === 'out_of_scope_competition',
      ),
    ).toBe(true);
    const cClub = { ...loadGo2025Pack().candidates[0], clubQid: 'Q2580083' } as GoCandidate;
    expect(
      (await syncGoWonEdges([cClub], mockRepo(), GO_OPTS)).failures.some(
        (f) => f.reason === 'out_of_scope_club',
      ),
    ).toBe(true);
  });

  it('pack default (GO 2023–2024) rejeita o candidate 2025 (retrocompatível)', async () => {
    const res = await syncGoWonEdges(loadGo2025Pack().candidates, mockRepo());
    expect(res.counts.created).toBe(0);
    expect(res.failures.some((f) => f.reason === 'out_of_scope_season')).toBe(true);
  });

  it('homônimos em doNotTouch nunca consultados', async () => {
    const seen = new Set<string>();
    const repo = mockRepo({
      findClubByQid: async (qid) => {
        seen.add(qid);
        return [{ id: 'c', qid, name: 'X', deletedAt: null }];
      },
    });
    await syncGoWonEdges(loadGo2025Pack().candidates, repo, GO_OPTS);
    expect([...seen]).toEqual(['Q1513287']);
    expect(seen.has('Q10391045')).toBe(false);
    expect(seen.has('Q10391046')).toBe(false);
  });

  it('soft-deleted com reason 2025 permitida ⇒ restore', async () => {
    const c = loadGo2025Pack().candidates[0];
    const e = {
      ...buildGoWonEdgeMetadata(c, new Date(), { writerVersion: GO_PR_WRITER_VERSION }),
      deletedAt: 't',
      deletionReason: 'rollback_t448b2d_go_2025_apply',
    };
    const res = await syncGoWonEdges(
      [c],
      mockRepo({ findWonEdges: async () => [{ id: 'e1', metadata: e }] }),
      GO_OPTS,
    );
    expect(res.counts.restored).toBe(1);
  });

  it('soft-deleted com reason inesperada ⇒ fail', async () => {
    const c = loadGo2025Pack().candidates[0];
    const e = {
      ...buildGoWonEdgeMetadata(c, new Date(), { writerVersion: GO_PR_WRITER_VERSION }),
      deletedAt: 't',
      deletionReason: 'manual',
    };
    const res = await syncGoWonEdges(
      [c],
      mockRepo({ findWonEdges: async () => [{ id: 'e1', metadata: e }] }),
      GO_OPTS,
    );
    expect(res.failures.some((f) => f.reason === 'unexpected_soft_deleted_edge')).toBe(true);
  });
});
