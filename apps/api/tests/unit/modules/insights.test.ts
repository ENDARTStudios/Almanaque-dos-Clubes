import { describe, it, expect } from 'vitest';
import {
  buildTimeline,
  mergeRelated,
  RELATED_CONFIDENCE,
  RELATED_LIMIT,
  type RelatedItem,
} from '../../../src/modules/clubs/insights.service.js';
import type { ClubTitleView } from '../../../src/modules/clubs/repository.js';

// WS-C-5 — timeline (ordenação/porHierarchy) e related (dedupe/self/prioridade/cap).

function title(over: Partial<ClubTitleView> = {}): ClubTitleView {
  return {
    year: 2020,
    season: '2020',
    competition: { id: 'comp-1', name: 'Competição' },
    competitionQid: 'Q100',
    hierarchy: 'nacional',
    gender: 'men',
    sourceUrl: 'https://www.wikidata.org/wiki/Q99',
    source: 'wikidata',
    ...over,
  };
}

describe('buildTimeline', () => {
  const club = { id: 'c1', qid: 'Q1', name: 'Clube' };

  it('ordena por ano DESC (nulos por último) com nome como desempate', () => {
    const t = buildTimeline(club, [
      title({ year: 2020, competition: { id: 'a', name: 'B' } }),
      title({ year: 2023, competition: { id: 'b', name: 'A' } }),
      title({ year: 2023, competition: { id: 'c', name: 'B' } }),
      title({ year: null, competition: { id: 'd', name: 'Z' } }),
    ]);
    expect(t.timeline.map((x) => x.competitionId)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('timeline vazia é vazio-honesta (total 0, byHierarchy zerado)', () => {
    const t = buildTimeline(club, []);
    expect(t.totalTitles).toBe(0);
    expect(t.timeline).toEqual([]);
    expect(t.byHierarchy).toEqual({
      mundial: 0,
      continental: 0,
      nacional: 0,
      estadual: 0,
      municipal: 0,
    });
  });

  it('agrega byHierarchy e preserva proveniência por aresta', () => {
    const t = buildTimeline(club, [
      title({ hierarchy: 'mundial' }),
      title({ hierarchy: 'mundial' }),
      title({ hierarchy: 'continental' }),
      title({ hierarchy: 'estadual' }),
    ]);
    expect(t.totalTitles).toBe(4);
    expect(t.byHierarchy.mundial).toBe(2);
    expect(t.byHierarchy.continental).toBe(1);
    expect(t.byHierarchy.estadual).toBe(1);
    expect(t.timeline[0].competitionQid).toBe('Q100');
    expect(t.timeline[0].source).toBe('wikidata');
    expect(t.timeline[0].sourceUrl).toContain('wikidata.org');
  });
});

function rel(over: Partial<RelatedItem> = {}): RelatedItem {
  return {
    clubId: 'x',
    qid: null,
    name: 'Outro',
    city: null,
    state: null,
    country: null,
    relationType: 'same_city',
    confidence: RELATED_CONFIDENCE.same_city,
    ...over,
  };
}

describe('mergeRelated', () => {
  it('exclui o próprio clube', () => {
    const out = mergeRelated([rel({ clubId: 'self', name: 'Eu' }), rel({ clubId: 'a' })], 'self');
    expect(out.map((r) => r.clubId)).toEqual(['a']);
  });

  it('dedupe por clube mantendo a melhor confiança (empate → prioridade rival)', () => {
    const out = mergeRelated(
      [
        rel({ clubId: 'a', relationType: 'same_state', confidence: 0.7 }),
        rel({ clubId: 'a', relationType: 'same_city', confidence: 0.9 }),
        rel({ clubId: 'b', relationType: 'same_state', confidence: 0.7 }),
        rel({ clubId: 'b', relationType: 'rival', confidence: 1 }),
      ],
      'self',
    );
    expect(out.map((r) => r.clubId)).toEqual(['b', 'a']);
    expect(out[1].relationType).toBe('same_city');
    expect(out[0].relationType).toBe('rival');
  });

  it('não inventa rival: só entra o que veio de aresta explícita', () => {
    const out = mergeRelated(
      [rel({ clubId: 'a', relationType: 'same_city', confidence: 0.9 })],
      'self',
    );
    expect(out.every((r) => r.relationType !== 'rival')).toBe(true);
  });

  it('corta no teto de 12 e ordena por confiança desc', () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      rel({ clubId: `c${i}`, name: `C${i}`, confidence: i / 20 }),
    );
    const out = mergeRelated(many, 'self');
    expect(out).toHaveLength(RELATED_LIMIT);
    const confs = out.map((r) => r.confidence);
    expect([...confs].sort((a, b) => b - a)).toEqual(confs);
  });
});
