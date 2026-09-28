import { describe, it, expect } from 'vitest';
import {
  auditGeoAttribution,
  planRankingRefreshDiff,
  planRsssfStateChampions,
  planWikidataEnrichment,
  planWikidataIdentityScan,
  type RankingEntryInput,
} from '../../../src/lib/orchestration/planners.js';

// WS-G-1 — planners puros (dry-run). Sem rede, sem I/O.

describe('planWikidataIdentityScan', () => {
  it('cria só QIDs novos; skips existing/soft-deleted/duplicado/sem qid', () => {
    const r = planWikidataIdentityScan({
      candidates: [
        { qid: 'Q1', label: 'Novo', country: 'BR' },
        { qid: 'Q2', label: 'Existente', country: 'BR' },
        { qid: 'Q3', label: 'Soft', country: 'BR' },
        { qid: 'Q1', label: 'Dup', country: 'BR' },
        { qid: null, label: 'SemQid', country: 'BR' },
      ],
      existing: [
        { qid: 'Q2', deletedAt: null },
        { qid: 'Q3', deletedAt: '2026-01-01T00:00:00Z' },
      ],
    });
    expect(r.planned.map((p) => (p.entity as { qid: string }).qid)).toEqual(['Q1']);
    const reasons = r.skipped.map((s) => s.reason).sort();
    expect(reasons).toEqual(['duplicate', 'existing_qid', 'missing_qid', 'soft_deleted_qid']);
  });

  it('nunca casa por nome (sem fuzzy)', () => {
    const r = planWikidataIdentityScan({
      candidates: [{ qid: 'Q10', label: 'Flamengo', country: 'BR' }],
      existing: [{ qid: 'Q999', deletedAt: null }],
    });
    expect(r.planned).toHaveLength(1); // Q10 difere de Q999 por QID, apesar do nome
  });
});

describe('planWikidataEnrichment', () => {
  it('only-fill: não sobrescreve campo não-nulo; não inventa sem fonte', () => {
    const r = planWikidataEnrichment({
      clubs: [
        { qid: 'Q1', fullName: null, city: null, latitude: null, longitude: null },
        { qid: 'Q2', fullName: 'Já tem', city: null, latitude: 1, longitude: 2 },
        { qid: 'Q3', fullName: null, city: null, latitude: null, longitude: null },
      ],
      fetched: [
        { qid: 'Q1', fullName: 'Nome Completo', city: 'Cidade', latitude: -1, longitude: -2 },
        { qid: 'Q2', city: 'Cidade2' },
        { qid: 'Q3' },
      ],
      fields: ['fullName', 'city', 'coordinates'],
    });
    const q1 = r.planned.find((p) => (p.entity as { qid: string }).qid === 'Q1');
    expect((q1?.entity as { fields: string[] }).fields).toEqual([
      'fullName',
      'city',
      'coordinates',
    ]);
    const q2 = r.planned.find((p) => (p.entity as { qid: string }).qid === 'Q2');
    expect((q2?.entity as { fields: string[] }).fields).toEqual(['city']); // não re-preenche fullName/coords
    expect(r.skipped.find((s) => s.key === 'Q3')?.reason).toBe('no_fetched_data');
  });
});

describe('planRsssfStateChampions', () => {
  it('emite aresta WON com proveniência; omite ambíguo; skip sem QID', () => {
    const r = planRsssfStateChampions({
      rows: [
        {
          uf: 'GO',
          year: 2025,
          clubQid: 'Q1',
          clubLabel: 'Vila',
          authorCredit: 'Rivera',
          sourceUrl: 'u',
        },
        {
          uf: 'MG',
          year: 2025,
          clubQid: 'Q2',
          clubLabel: 'Atlético',
          authorCredit: 'Freati',
          sourceUrl: 'u',
        },
        {
          uf: 'MG',
          year: 2025,
          clubQid: 'Q3',
          clubLabel: 'Cruzeiro',
          authorCredit: 'Freati',
          sourceUrl: 'u',
        },
        {
          uf: 'PR',
          year: 2025,
          clubQid: null,
          clubLabel: 'Sem',
          authorCredit: 'Dalpiaz',
          sourceUrl: 'u',
        },
      ],
    });
    const plannedKeys = r.planned.map(
      (p) => `${(p.entity as { uf: string }).uf}:${(p.entity as { year: number }).year}`,
    );
    expect(plannedKeys).toContain('GO:2025');
    expect(plannedKeys).not.toContain('MG:2025'); // ambíguo omitido
    expect(r.skipped.find((s) => s.key === 'MG|2025')?.reason).toBe('ambiguous');
    expect(r.skipped.find((s) => s.key === 'PR|2025')?.reason).toBe('missing_qid');
  });
});

describe('planRankingRefreshDiff', () => {
  it('detecta adicionados/alterados/removidos e marca unchanged', () => {
    const { plan, hasChanges } = planRankingRefreshDiff({
      current: [
        { rankingId: 'R1', clubId: 'a', position: 1, points: 100 },
        { rankingId: 'R1', clubId: 'b', position: 2, points: 90 },
        { rankingId: 'R1', clubId: 'c', position: 3, points: 80 },
      ],
      proposed: [
        { rankingId: 'R1', clubId: 'a', position: 1, points: 100 },
        { rankingId: 'R1', clubId: 'b', position: 3, points: 70 },
        { rankingId: 'R1', clubId: 'd', position: 2, points: 95 },
      ],
    });
    expect(hasChanges).toBe(true);
    const changed = plan.planned.map((p) => (p.entity as { clubId: string }).clubId).sort();
    expect(changed).toEqual(['b', 'c', 'd']); // a unchanged
    expect(plan.skipped.find((s) => s.key === 'R1|a')?.reason).toBe('unchanged');
  });

  // WS-G-1.2 — anti-falso-positivo: a chave é rankingId+clubId (nunca clubId isolado).
  function fp(current: RankingEntryInput[], proposed: RankingEntryInput[]) {
    const { plan, hasChanges } = planRankingRefreshDiff({ current, proposed });
    return {
      hasChanges,
      wouldCreate: 0,
      wouldUpdate: plan.planned.length,
      wouldChangePoints: plan.planned.filter((p) => p.entity.from?.points !== p.entity.to?.points)
        .length,
      wouldChangePositions: plan.planned.filter(
        (p) => p.entity.from?.position !== p.entity.to?.position,
      ).length,
    };
  }

  it('mesmo clube em dois rankings diferentes → sem diff', () => {
    const rows: RankingEntryInput[] = [
      { rankingId: 'R-div', clubId: 'a', position: 1, points: 100 },
      { rankingId: 'R-pyramid', clubId: 'a', position: 1, points: 100 },
    ];
    expect(fp(rows, rows)).toEqual({
      hasChanges: false,
      wouldCreate: 0,
      wouldUpdate: 0,
      wouldChangePoints: 0,
      wouldChangePositions: 0,
    });
  });

  it('mesmo clube, mesma posição, rankings diferentes → sem diff', () => {
    const rows: RankingEntryInput[] = [
      { rankingId: 'R1', clubId: 'a', position: 1, points: 100 },
      { rankingId: 'R2', clubId: 'a', position: 1, points: 100 },
    ];
    expect(fp(rows, rows).wouldUpdate).toBe(0);
  });

  it('mesmo clube, mesmos points, rankings diferentes → sem diff', () => {
    const rows: RankingEntryInput[] = [
      { rankingId: 'R1', clubId: 'a', position: 3, points: 80 },
      { rankingId: 'R2', clubId: 'a', position: 5, points: 80 },
    ];
    expect(fp(rows, rows).wouldChangePoints).toBe(0);
    expect(fp(rows, rows).wouldUpdate).toBe(0);
  });

  it('mesmo clube em temporadas/divisões distintas → sem diff', () => {
    const rows: RankingEntryInput[] = [
      { rankingId: 'R-2023', clubId: 'a', position: 1, points: 100 },
      { rankingId: 'R-2024', clubId: 'a', position: 2, points: 90 },
      { rankingId: 'R-div2', clubId: 'a', position: 1, points: 70 },
    ];
    expect(fp(rows, rows)).toEqual({
      hasChanges: false,
      wouldCreate: 0,
      wouldUpdate: 0,
      wouldChangePoints: 0,
      wouldChangePositions: 0,
    });
  });

  it('clubId repetido entre rankings NÃO gera falso positivo (regressão do bug)', () => {
    // Antes: chave=clubId → 2ª ocorrência sobrescrevia a 1ª e gerava diff espúrio.
    const current: RankingEntryInput[] = [
      { rankingId: 'R1', clubId: 'a', position: 1, points: 100 },
      { rankingId: 'R2', clubId: 'a', position: 4, points: 60 },
    ];
    expect(fp(current, current).wouldUpdate).toBe(0);
  });
});

describe('auditGeoAttribution', () => {
  it('sinaliza missing/inconsistent para OSM; ignora Wikidata', () => {
    const r = auditGeoAttribution({
      clubs: [
        { id: 'c1', qid: 'Q1', metadata: { coordSource: 'nominatim' } },
        { id: 'c2', qid: 'Q2', metadata: { coordSource: 'nominatim', coordAttribution: 'algo' } },
        {
          id: 'c3',
          qid: 'Q3',
          metadata: {
            coordSource: 'nominatim',
            coordAttribution: '© OpenStreetMap contributors (ODbL)',
          },
        },
        { id: 'c4', qid: 'Q4', metadata: { coordSource: 'P115_P131' } },
      ],
    });
    const byId = new Map(
      r.planned.map((p) => [
        (p.entity as { id: string }).id,
        (p.entity as { issue: string }).issue,
      ]),
    );
    expect(byId.get('c1')).toBe('missing_attribution');
    expect(byId.get('c2')).toBe('inconsistent_attribution');
    expect(byId.has('c3')).toBe(false);
    expect(byId.has('c4')).toBe(false);
  });
});
