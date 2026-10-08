import { describe, it, expect } from 'vitest';
import {
  buildCompetitionOverview,
  type OverviewEdge,
  type OverviewClub,
} from '../../../src/modules/competitions/overview.js';

// Mapeamento do portal (Entrega 2) — regras do overview de competição.

const clubs: OverviewClub[] = [
  { id: 'c1', name: 'Clube A', city: 'Cidade X', country: 'BR' },
  { id: 'c2', name: 'Clube B', country: 'BR' },
  { id: 'c3', name: 'Clube C', country: 'AR' },
];

function won(sourceId: string, year: number, deletedAt?: string): OverviewEdge {
  return { sourceId, metadata: { year, relation: 'WON', ...(deletedAt ? { deletedAt } : {}) } };
}

describe('buildCompetitionOverview (Entrega 2)', () => {
  it('agrupa edições por ano (mais recente primeiro) e ranqueia maiores campeões', () => {
    const { editions, topWinners, totalEditions } = buildCompetitionOverview(
      [won('c1', 2020), won('c2', 2021), won('c1', 2022), won('c1', 2023)],
      clubs,
    );
    expect(editions.map((e) => e.year)).toEqual([2023, 2022, 2021, 2020]);
    expect(editions[0].champion).toEqual({ id: 'c1', name: 'Clube A' });
    expect(totalEditions).toBe(4);
    expect(topWinners[0]).toEqual({ clubId: 'c1', name: 'Clube A', titles: 3 });
    expect(topWinners[1].titles).toBe(1);
  });

  it('ano com múltiplos campeões → ambíguo, fora das edições (honesto)', () => {
    const { editions, ambiguousYears, totalEditions } = buildCompetitionOverview(
      [won('c1', 2020), won('c2', 2020)],
      clubs,
    );
    expect(editions).toHaveLength(0);
    expect(ambiguousYears).toBe(1);
    expect(totalEditions).toBe(0);
  });

  it('aresta soft-deleted (metadata.deletedAt) é ignorada', () => {
    const { editions, topWinners } = buildCompetitionOverview(
      [won('c1', 2020), won('c2', 2021, '2026-01-01')],
      clubs,
    );
    expect(editions).toHaveLength(1);
    expect(editions[0].year).toBe(2020);
    expect(topWinners.map((t) => t.clubId)).toEqual(['c1']);
  });

  it('aresta sem clube no acervo não inventa campeão', () => {
    const { editions } = buildCompetitionOverview([won('ghost', 2020)], clubs);
    expect(editions).toHaveLength(0);
  });

  it('participantes = clubes com títulos catalogados, ordem alfabética', () => {
    const { participants } = buildCompetitionOverview([won('c2', 2020), won('c1', 2021)], clubs);
    expect(participants.map((p) => p.name)).toEqual(['Clube A', 'Clube B']);
  });

  it('sem arestas → tudo vazio (estado honesto)', () => {
    const o = buildCompetitionOverview([], clubs);
    expect(o.editions).toHaveLength(0);
    expect(o.topWinners).toHaveLength(0);
    expect(o.participants).toHaveLength(0);
    expect(o.totalEditions).toBe(0);
  });
});
