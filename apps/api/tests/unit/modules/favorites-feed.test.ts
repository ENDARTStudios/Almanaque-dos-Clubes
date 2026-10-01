import { describe, it, expect } from 'vitest';
import {
  buildFeed,
  FEED_LIMIT,
  type FavoriteFeedItem,
} from '../../../src/modules/favorites/service.js';

// WS-C-6 — feed de conquistas: ordenação por ano DESC (nulos por último) e teto 20.

function item(over: Partial<FavoriteFeedItem> = {}): FavoriteFeedItem {
  return {
    clubId: 'c1',
    clubName: 'Clube',
    year: 2020,
    season: null,
    competitionId: 'k1',
    competitionName: 'Competição',
    hierarchy: 'nacional',
    sourceUrl: null,
    ...over,
  };
}

describe('buildFeed (WS-C-6)', () => {
  it('ordena por ano DESC com nulos por último e desempata por competição', () => {
    const feed = buildFeed([
      item({ year: 2020, competitionName: 'B', clubName: 'A' }),
      item({ year: 2023, competitionName: 'A', clubName: 'B' }),
      item({ year: 2023, competitionName: 'B', clubName: 'C' }),
      item({ year: null, competitionName: 'Z', clubName: 'D' }),
    ]);
    expect(feed.map((f) => [f.year, f.competitionName])).toEqual([
      [2023, 'A'],
      [2023, 'B'],
      [2020, 'B'],
      [null, 'Z'],
    ]);
  });

  it('corta no teto de 20', () => {
    const many = Array.from({ length: 35 }, (_, i) =>
      item({ year: 2000 + i, competitionId: `k${i}` }),
    );
    expect(buildFeed(many)).toHaveLength(FEED_LIMIT);
    expect(buildFeed(many)[0].year).toBe(2034);
  });

  it('feed vazio permanece vazio', () => {
    expect(buildFeed([])).toEqual([]);
  });
});
