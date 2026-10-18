/**
 * T-24/25 — funções puras dos blocos de insights do overview de competição
 * (`modules/competitions/insights.ts`): history (status/biggestChampion/longest
 * Streak), podium (third só de tabela de liga) e totals (nulls ignorados).
 *
 * Fixtures de standings nos SHAPES REAIS gravados pelo seed T510:
 * `StandingRow & { clubId: string | null; matchedName: string | null }` —
 * copa com coluna "Grp" (Libertadores) e tabela de liga 1..N contígua.
 */
import { describe, it, expect } from 'vitest';
import {
  yearFromSeasonLabel,
  buildHistory,
  buildPodium,
  buildTotals,
  thirdFromStandings,
  type SeasonRowInput,
} from '../../../src/modules/competitions/insights.js';

const season = (overrides: Partial<SeasonRowInput>): SeasonRowInput => ({
  season: '2023',
  championId: null,
  championName: null,
  runnerUpId: null,
  runnerUpName: null,
  totalMatches: null,
  totalGoals: null,
  ...overrides,
});

/** Tabela de liga com posições 1..N únicas (shape real do seed T510). */
const leagueStandings = (names: string[]): unknown =>
  names.map((name, i) => ({
    position: i + 1,
    clubName: name,
    clubArticle: name,
    played: 38,
    won: 20,
    drawn: 8,
    lost: 10,
    goalsFor: 60,
    goalsAgainst: 40,
    points: 68,
    clubId: `club-${i + 1}`,
    matchedName: name,
  }));

/** Tabela combinada de fase de GRUPOS de copa (coluna "Grp" — Libertadores). */
const cupGroupStandings = (): unknown =>
  Array.from({ length: 8 }, (_, i) => ({
    position: (i % 4) + 1,
    clubName: `Copa Club ${i + 1}`,
    clubArticle: `Copa Club ${i + 1}`,
    played: 6,
    won: 3,
    drawn: 1,
    lost: 2,
    goalsFor: 8,
    goalsAgainst: 6,
    points: 10,
    group: i < 4 ? 'A' : 'B',
    clubId: `cup-${i + 1}`,
    matchedName: `Copa Club ${i + 1}`,
  }));

describe('yearFromSeasonLabel', () => {
  it('extrai o 1º ano dos rótulos reais do seed', () => {
    expect(yearFromSeasonLabel('2023')).toBe(2023);
    expect(yearFromSeasonLabel('2023-24')).toBe(2023);
    expect(yearFromSeasonLabel('2011 Aper')).toBe(2011);
  });

  it('sem ano plausível = null', () => {
    expect(yearFromSeasonLabel('Apertura')).toBeNull();
    expect(yearFromSeasonLabel('')).toBeNull();
  });
});

describe('buildHistory — status', () => {
  it('dissolvedAt gravado → extinta (mesmo com edição recente)', () => {
    const h = buildHistory(
      [season({ season: '2023', championId: 'c1' })],
      new Date('2008-12-19T00:00:00Z'),
    );
    expect(h.status).toBe('extinta');
  });

  it('edição no ano corrente ou no anterior → vigente', () => {
    const now = new Date('2026-10-17T00:00:00Z');
    expect(buildHistory([season({ season: '2026', championId: 'c1' })], null, now).status).toBe(
      'vigente',
    );
    expect(buildHistory([season({ season: '2025', championId: 'c1' })], null, now).status).toBe(
      'vigente',
    );
  });

  it('sem edição recente (ou sem edições) → sem_edicao_recente (nunca inventa)', () => {
    const now = new Date('2026-10-17T00:00:00Z');
    expect(buildHistory([season({ season: '2002', championId: 'c1' })], null, now).status).toBe(
      'sem_edicao_recente',
    );
    expect(buildHistory([], null, now).status).toBe('sem_edicao_recente');
  });
});

describe('buildHistory — edições e campeões', () => {
  const rows = [
    season({ season: '2020', championId: 'c1', championName: 'Clube A' }),
    season({ season: '2021', championId: 'c1', championName: 'Clube A' }),
    season({ season: '2022', championId: 'c2', championName: 'Clube B' }),
    season({ season: '2023-24', championId: 'c1', championName: 'Clube A' }),
    season({ season: 'sem campeão' }), // rótulo sem ano → fora
  ];

  it('conta edições por rótulo com ano válido e campeões preenchidos', () => {
    const h = buildHistory(rows, null, new Date('2026-10-17T00:00:00Z'));
    expect(h.editionsCount).toBe(4);
    expect(h.editionsWithChampion).toBe(4);
    expect(h.firstEditionYear).toBe(2020);
    expect(h.lastEditionYear).toBe(2023);
  });

  it('biggestChampion vem de championId com desempate alfabético', () => {
    const h = buildHistory(rows, null, new Date('2026-10-17T00:00:00Z'));
    expect(h.biggestChampion).toEqual({ clubId: 'c1', clubName: 'Clube A', titles: 3 });
  });

  it('longestStreak exige anos CONSECUTIVOS do mesmo campeão', () => {
    const h = buildHistory(rows, null, new Date('2026-10-17T00:00:00Z'));
    // 2020→2021 do c1 (2 anos); 2023 NÃO é consecutivo de 2022 (c2).
    expect(h.longestStreak).toEqual({ clubName: 'Clube A', from: 2020, to: 2021 });
  });

  it('sequência interrompida por outro campeão não conta', () => {
    const h = buildHistory(
      [
        season({ season: '2020', championId: 'c1', championName: 'Clube A' }),
        season({ season: '2021', championId: 'c2', championName: 'Clube B' }),
        season({ season: '2022', championId: 'c1', championName: 'Clube A' }),
      ],
      null,
      new Date('2026-10-17T00:00:00Z'),
    );
    expect(h.longestStreak).toEqual({ clubName: 'Clube A', from: 2020, to: 2020 });
  });

  it('sem edições com ano → blocos null honestos', () => {
    const h = buildHistory([season({ season: 'x' })], null);
    expect(h).toMatchObject({
      firstEditionYear: null,
      lastEditionYear: null,
      editionsCount: 0,
      biggestChampion: null,
      longestStreak: null,
    });
  });
});

describe('thirdFromStandings', () => {
  it('liga 1..N contígua → 3º colocado com clubId do match do seed', () => {
    expect(thirdFromStandings(leagueStandings(['A', 'B', 'C', 'D', 'E']))).toEqual({
      clubId: 'club-3',
      clubName: 'C',
    });
  });

  it('copa com coluna de grupo ("Grp") → null honesto', () => {
    expect(thirdFromStandings(cupGroupStandings())).toBeNull();
  });

  it('posições repetidas ou buracos → null (não é tabela única de liga)', () => {
    const dup = [
      { position: 1, clubName: 'A', clubId: 'a', matchedName: 'A' },
      { position: 1, clubName: 'B', clubId: 'b', matchedName: 'B' },
      { position: 2, clubName: 'C', clubId: 'c', matchedName: 'C' },
      { position: 3, clubName: 'D', clubId: 'd', matchedName: 'D' },
    ];
    expect(thirdFromStandings(dup)).toBeNull();
    const hole = [
      { position: 1, clubName: 'A', clubId: 'a', matchedName: 'A' },
      { position: 3, clubName: 'C', clubId: 'c', matchedName: 'C' },
      { position: 4, clubName: 'D', clubId: 'd', matchedName: 'D' },
    ];
    expect(thirdFromStandings(hole)).toBeNull();
  });

  it('menos de 3 linhas / não-array / sem JSON → null', () => {
    expect(thirdFromStandings(leagueStandings(['A', 'B']))).toBeNull();
    expect(thirdFromStandings('lixo')).toBeNull();
    expect(thirdFromStandings(null)).toBeNull();
    expect(thirdFromStandings(undefined)).toBeNull();
  });

  it('sem match de clube (clubId null) mantém o NOME — honesto', () => {
    const rows = [
      { position: 1, clubName: 'A FC', clubId: 'a', matchedName: 'A FC' },
      { position: 2, clubName: 'B FC', clubId: 'b', matchedName: 'B FC' },
      { position: 3, clubName: 'C United', clubId: null, matchedName: null },
    ];
    expect(thirdFromStandings(rows)).toEqual({ clubId: null, clubName: 'C United' });
  });
});

describe('buildPodium', () => {
  const rows: SeasonRowInput[] = [
    season({
      season: '2022',
      championId: 'c1',
      championName: 'Clube A',
      runnerUpId: 'c2',
      runnerUpName: 'Clube B',
    }),
    season({
      season: '2023',
      championId: 'c3',
      championName: 'Clube C',
      runnerUpId: 'c1',
      runnerUpName: 'Clube A',
      standings: leagueStandings(['Clube C', 'Clube A', 'Clube B', 'Clube D']),
    }),
  ];

  it('pódio da ÚLTIMA edição COM campeão', () => {
    const p = buildPodium(rows, true);
    expect(p.champion).toEqual({ clubId: 'c3', clubName: 'Clube C' });
    expect(p.runnerUp).toEqual({ clubId: 'c1', clubName: 'Clube A' });
    expect(p.third).toEqual({ clubId: 'club-3', clubName: 'Clube B' });
  });

  it('copa (isLeague=false) → third null honesto, champion/runnerUp mantidos', () => {
    const p = buildPodium(rows, false);
    expect(p.champion).toEqual({ clubId: 'c3', clubName: 'Clube C' });
    expect(p.third).toBeNull();
  });

  it('sem nenhuma edição com campeão → pódio vazio', () => {
    expect(buildPodium([season({ season: '2020' })], true)).toEqual({
      champion: null,
      runnerUp: null,
      third: null,
    });
  });
});

describe('buildTotals', () => {
  it('soma totalMatches/totalGoals ignorando nulls', () => {
    expect(
      buildTotals([
        season({ totalMatches: 380, totalGoals: 1000 }),
        season({ totalMatches: 380, totalGoals: null }),
        season({ totalMatches: null, totalGoals: 900 }),
      ]),
    ).toEqual({ matches: 760, goals: 1900 });
  });

  it('nada somável = null (lacuna honesta, não zero)', () => {
    expect(buildTotals([season({}), season({})])).toEqual({ matches: null, goals: null });
    expect(buildTotals([])).toEqual({ matches: null, goals: null });
  });
});
