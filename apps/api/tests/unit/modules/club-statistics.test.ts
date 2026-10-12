import { describe, it, expect } from 'vitest';
import {
  accumulateMatch,
  buildClubStatistics,
  type StatsMatchRow,
} from '../../../src/modules/clubs/statistics.service.js';

// T523 — agregação de estatísticas por clube (pura). A validação contra as
// tabelas oficiais (CompetitionSeason) é feita em produção, clube a clube.

const row = (over: Partial<StatsMatchRow>): StatsMatchRow => ({
  homeClubId: 'a',
  awayClubId: 'b',
  homeScore: 1,
  awayScore: 0,
  competitionId: 'comp',
  competitionName: 'Brasileirão',
  season: '2023',
  ...over,
});

describe('accumulateMatch (T523)', () => {
  it('casa: vitória com gols no lado certo', () => {
    const v = { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
    accumulateMatch(v, true, 2, 1);
    expect(v).toEqual({ played: 1, wins: 1, draws: 0, losses: 0, goalsFor: 2, goalsAgainst: 1 });
  });

  it('fora: derrota e gols espelhados', () => {
    const v = { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
    accumulateMatch(v, false, 2, 1);
    expect(v).toEqual({ played: 1, wins: 0, draws: 0, losses: 1, goalsFor: 1, goalsAgainst: 2 });
  });
});

describe('buildClubStatistics (T523)', () => {
  const clubId = 'a';
  const rows: StatsMatchRow[] = [
    // Brasileirão 2023: 2 em casa (2V), 1 fora (E), 1 fora (D)
    row({ homeScore: 2, awayScore: 0 }),
    row({ homeScore: 1, awayScore: 0, awayClubId: 'c' }),
    row({ homeClubId: 'd', awayClubId: 'a', homeScore: 1, awayScore: 1 }),
    row({ homeClubId: 'e', awayClubId: 'a', homeScore: 3, awayScore: 1 }),
    // Libertadores 2023: 1 em casa (V)
    row({
      competitionId: 'lib',
      competitionName: 'Libertadores',
      homeScore: 3,
      awayScore: 1,
      awayClubId: 'f',
    }),
  ];

  const r = buildClubStatistics(rows, clubId);

  it('geral com split casa/fora, saldo e pontos (V×3+E)', () => {
    expect(r.overall).toEqual({
      played: 5,
      wins: 3,
      draws: 1,
      losses: 1,
      goalsFor: 8,
      goalsAgainst: 5,
      goalDiff: 3,
      points: 10,
      home: { played: 3, wins: 3, draws: 0, losses: 0, goalsFor: 6, goalsAgainst: 1 },
      away: { played: 2, wins: 0, draws: 1, losses: 1, goalsFor: 2, goalsAgainst: 4 },
    });
  });

  it('quebra por competição+temporada com as mesmas métricas', () => {
    expect(r.byCompetition).toHaveLength(2);
    const bra = r.byCompetition.find((c) => c.competitionName === 'Brasileirão');
    expect(bra).toMatchObject({ played: 4, wins: 2, draws: 1, losses: 1, points: 7 });
    const lib = r.byCompetition.find((c) => c.competitionName === 'Libertadores');
    expect(lib).toMatchObject({ played: 1, wins: 1, points: 3 });
  });

  it('confronto direto por adversário, ordenado por jogos', () => {
    expect(r.rivals.map((x) => x.opponentId)).toEqual(['b', 'c', 'd', 'e', 'f']);
    const vsB = r.rivals[0];
    expect(vsB).toMatchObject({
      opponentId: 'b',
      played: 1,
      wins: 1,
      goalsFor: 2,
      goalsAgainst: 0,
      points: 3,
    });
  });

  it('clube sem partidas devolve zeros verdadeiros (não null)', () => {
    const empty = buildClubStatistics([], 'x');
    expect(empty.overall.played).toBe(0);
    expect(empty.overall.points).toBe(0);
    expect(empty.byCompetition).toEqual([]);
    expect(empty.rivals).toEqual([]);
  });
});
