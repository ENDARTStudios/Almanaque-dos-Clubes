import { describe, it, expect } from 'vitest';
import {
  countByHierarchy,
  pickRecentTitles,
  buildComparison,
  type CompareClub,
} from '../../../src/modules/clubs/compare.service.js';
import type { ClubTitleView } from '../../../src/modules/clubs/repository.js';

// WS-C-7 — comparação: agregação por hierarquia, janela recente e montagem pura.

function title(over: Partial<ClubTitleView> = {}): ClubTitleView {
  return {
    year: 2020,
    season: null,
    competition: { id: 'k1', name: 'Competição' },
    competitionQid: null,
    hierarchy: 'nacional',
    gender: 'men',
    sourceUrl: null,
    source: 'wikidata',
    ...over,
  };
}

function club(over: Partial<CompareClub> = {}): CompareClub {
  return {
    id: 'a',
    qid: 'QA',
    name: 'Clube A',
    city: 'Cidade',
    state: null,
    country: 'BR',
    foundedYear: 1914,
    coords: { latitude: -23.5, longitude: -46.6 },
    ...over,
  };
}

describe('countByHierarchy (WS-C-7)', () => {
  it('agrega por hierarquia com total', () => {
    const c = countByHierarchy([
      title({ hierarchy: 'mundial' }),
      title({ hierarchy: 'mundial' }),
      title({ hierarchy: 'continental' }),
      title({ hierarchy: 'nacional' }),
    ]);
    expect(c).toEqual({
      mundial: 2,
      continental: 1,
      nacional: 1,
      estadual: 0,
      municipal: 0,
      total: 4,
    });
  });

  it('clube sem títulos → zeros com total 0', () => {
    expect(countByHierarchy([])).toEqual({
      mundial: 0,
      continental: 0,
      nacional: 0,
      estadual: 0,
      municipal: 0,
      total: 0,
    });
  });
});

describe('pickRecentTitles (WS-C-7)', () => {
  it('filtra janela de 5 anos, ordena ano DESC e corta em 5', () => {
    const recent = pickRecentTitles(
      [
        title({ year: 2010, competition: { id: 'old', name: 'Antiga' } }),
        title({ year: 2025, competition: { id: 'b', name: 'B' } }),
        title({ year: 2026, competition: { id: 'c', name: 'C' } }),
        title({ year: null, competition: { id: 'n', name: 'Sem ano' } }),
        title({ year: 2024, competition: { id: 'd', name: 'D' } }),
        title({ year: 2023, competition: { id: 'e', name: 'E' } }),
        title({ year: 2022, competition: { id: 'f', name: 'F' } }),
        title({ year: 2021, competition: { id: 'g', name: 'G' } }),
      ],
      2026,
    );
    // janela = year >= 2021; ordenado DESC; cap 5
    expect(recent.map((r) => r.year)).toEqual([2026, 2025, 2024, 2023, 2022]);
    expect(recent[0].competitionName).toBe('C');
  });

  it('nada na janela → vazio', () => {
    expect(pickRecentTitles([title({ year: 1990 })], 2026)).toEqual([]);
  });
});

describe('buildComparison (WS-C-7)', () => {
  it('monta comparação completa com rankings e head-to-head explícito', () => {
    const cmp = buildComparison({
      clubA: club(),
      clubB: club({ id: 'b', qid: 'QB', name: 'Clube B' }),
      titlesA: [title({ hierarchy: 'mundial', year: 2024 })],
      titlesB: [],
      rankingsA: [{ rankingName: 'Rank', position: 1, points: 90, season: '2025' }],
      rankingsB: null,
      h2hRelations: ['RIVAL', 'RIVAL', 'PART_OF'],
      currentYear: 2026,
    });
    expect(cmp.titles.clubA.total).toBe(1);
    expect(cmp.titles.clubB.total).toBe(0);
    expect(cmp.rankings.clubA).toHaveLength(1);
    expect(cmp.rankings.clubB).toBeNull(); // sem ranking → null
    expect(cmp.recentTitles.clubA).toHaveLength(1);
    expect(cmp.recentTitles.clubB).toEqual([]);
    expect(cmp.headToHead).toEqual({ exists: true, relations: ['PART_OF', 'RIVAL'], matches: [] });
  });

  it('sem aresta explícita → head-to-head não existe (nunca inferido)', () => {
    const cmp = buildComparison({
      clubA: club(),
      clubB: club({ id: 'b' }),
      titlesA: [],
      titlesB: [],
      rankingsA: null,
      rankingsB: null,
      h2hRelations: [],
      currentYear: 2026,
    });
    expect(cmp.headToHead.exists).toBe(false);
    expect(cmp.headToHead.relations).toEqual([]);
    expect(cmp.headToHead.matches).toEqual([]);
  });
});
