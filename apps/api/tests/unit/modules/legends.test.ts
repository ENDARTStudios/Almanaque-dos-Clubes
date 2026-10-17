import { describe, it, expect } from 'vitest';
import {
  buildTopChampions,
  buildCompetitionLeaders,
  pickBiggestWin,
  pickMostGoalsMatch,
  buildMostGoalsClubSeason,
  findLongestUnbeatenRun,
  yearOfEdge,
  type WonTitleEdge,
  type ClubRef,
  type CompetitionRef,
  type RecordMatchRow,
} from '../../../src/modules/legends/service.js';

// Legends — agregações puras com fixtures (sem banco; CI valida o carregador
// no teste de integração contra Postgres real).

const clubs: ClubRef[] = [
  { id: 'c1', name: 'Alba FC', country: 'ES' },
  { id: 'c2', name: 'Boreal United', country: 'GB' },
  { id: 'c3', name: 'Costa SC', country: 'BR' },
  { id: 'c4', name: 'Delta AC', country: 'FR' },
];

const comps: CompetitionRef[] = [
  { id: 'k1', name: 'Copa Nacional', type: 'CUP', country: 'BR' },
  { id: 'k2', name: 'Liga Continental', type: 'TOURNAMENT', country: null },
];

const won = (sourceId: string, targetId: string, year?: number): WonTitleEdge => ({
  sourceId,
  targetId,
  metadata: year === undefined ? {} : { year },
});

describe('yearOfEdge', () => {
  it('ano presente, ausente e não-numérico', () => {
    expect(yearOfEdge({ year: 1994 })).toBe(1994);
    expect(yearOfEdge({})).toBeNull();
    expect(yearOfEdge({ year: '1994' })).toBeNull(); // string não é ano auditável
    expect(yearOfEdge(null)).toBeNull();
  });
});

describe('buildTopChampions', () => {
  const edges: WonTitleEdge[] = [
    // c1: 3 títulos (1994 é o mais recente)
    won('c1', 'k1', 1994),
    won('c1', 'k1', 1990),
    won('c1', 'k2', 2001),
    // c2: 3 títulos, todos SEM ano → perde o desempate de ano para c1
    won('c2', 'k1'),
    won('c2', 'k2'),
    won('c2', 'k2'),
    // c3: 1 título com ano 2101 (futuro NÃO é filtrado aqui — guarda de vigência
    // é papel do carrossel; aqui a agregação conta o que a fonte afirma)
    won('c3', 'k1', 2101),
    // c4: sem arestas → não aparece
    // aresta para competição fora do acervo não afeta a contagem por clube
    won('c3', 'kX', 1999),
    // aresta órfã (clube fora do acervo ativo) é descartada
    won('ghost', 'k1', 1950),
  ];

  it('ordena por títulos, desempata por último ano (sem ano por último) e nome', () => {
    const top = buildTopChampions(edges, clubs);
    expect(top.map((t) => t.clubId)).toEqual(['c1', 'c2', 'c3']);
    expect(top[0]).toMatchObject({ clubName: 'Alba FC', titles: 3, lastTitleYear: 2001 });
    expect(top[1]).toMatchObject({ clubName: 'Boreal United', titles: 3, lastTitleYear: null });
  });

  it('clube sem arestas não entra; respeita o limite', () => {
    const top = buildTopChampions(edges, clubs, 2);
    expect(top).toHaveLength(2);
    expect(top.some((t) => t.clubId === 'c4')).toBe(false);
  });

  it('sem arestas devolve lista vazia (vazio verdadeiro)', () => {
    expect(buildTopChampions([], clubs)).toEqual([]);
  });
});

describe('buildCompetitionLeaders', () => {
  const edges: WonTitleEdge[] = [
    won('c1', 'k1', 1994),
    won('c1', 'k1', 1990),
    won('c2', 'k1', 1999), // k1: c1 2×1 c2 → líder c1 (mais títulos)
    won('c2', 'k2'),
    won('c3', 'k2'), // k2: empate 1×1 → c2 vence pelo ano? ambos sem ano → nome asc ('Alba FC' não é; 'Boreal' < 'Costa') → c2
    won('ghost', 'k1', 2000), // órfão ignorado no líder
  ];

  it('elege o líder por competição e ordena por nº de títulos', () => {
    const leaders = buildCompetitionLeaders(edges, comps, clubs);
    expect(leaders).toHaveLength(2);
    expect(leaders[0]).toMatchObject({
      competitionId: 'k1',
      competitionName: 'Copa Nacional',
      leaderClubId: 'c1',
      titles: 2,
      lastTitleYear: 1994,
    });
    expect(leaders[1]).toMatchObject({
      competitionId: 'k2',
      leaderClubId: 'c2',
      titles: 1,
    });
  });

  it('exclui competição sem linha no acervo (sem nome honesto)', () => {
    const leaders = buildCompetitionLeaders([won('c1', 'kX', 2000)], comps, clubs);
    expect(leaders).toEqual([]);
  });

  it('exclui competição cujo único campeão está fora do acervo ativo', () => {
    const onlyComp = [comps[0]];
    const leaders = buildCompetitionLeaders([won('ghost', 'k1', 2000)], onlyComp, clubs);
    expect(leaders).toEqual([]);
  });
});

const row = (over: Partial<RecordMatchRow>): RecordMatchRow => ({
  id: 'm1',
  homeClubId: 'c1',
  homeClubName: 'Alba FC',
  awayClubId: 'c2',
  awayClubName: 'Boreal United',
  homeScore: 1,
  awayScore: 0,
  date: '2020-05-01T00:00:00.000Z',
  competitionId: 'k1',
  competitionName: 'Copa Nacional',
  seasonId: 's1',
  seasonName: '2020',
  sourceUrl: null,
  ...over,
});

describe('pickBiggestWin / pickMostGoalsMatch', () => {
  const rows: RecordMatchRow[] = [
    row({ id: 'mA', homeScore: 5, awayScore: 1, date: '2020-03-01T00:00:00.000Z' }), // margem 4
    row({ id: 'mB', homeScore: 7, awayScore: 3, date: '2020-02-01T00:00:00.000Z' }), // margem 4, mais gols
    row({ id: 'mC', awayClubId: 'c3', awayClubName: 'Costa SC', homeScore: 0, awayScore: 6 }), // margem 6
  ];

  it('biggestWin: maior saldo, com metadados completos', () => {
    const win = pickBiggestWin(rows);
    expect(win).toMatchObject({
      matchId: 'mC',
      margin: 6,
      homeScore: 0,
      awayScore: 6,
      awayClubName: 'Costa SC',
      competitionName: 'Copa Nacional',
      seasonName: '2020',
    });
  });

  it('mostGoalsMatch: soma dos gols vence margem', () => {
    expect(pickMostGoalsMatch(rows)?.matchId).toBe('mB');
  });

  it('empate de margem cai para o jogo com mais gols', () => {
    expect(pickBiggestWin([rows[0], rows[1]])?.matchId).toBe('mB');
  });

  it('sem partidas devolve null', () => {
    expect(pickBiggestWin([])).toBeNull();
    expect(pickMostGoalsMatch([])).toBeNull();
  });
});

describe('buildMostGoalsClubSeason', () => {
  it('soma gols marcados em casa e fora, separado por temporada', () => {
    const rows: RecordMatchRow[] = [
      // c1 marca 3 em casa
      row({ id: 'm1', homeClubId: 'c1', homeClubName: 'Alba FC', homeScore: 3, awayScore: 1 }),
      // c1 marca 4 fora
      row({ id: 'm2', homeClubId: 'c2', awayClubId: 'c1', homeScore: 0, awayScore: 4 }),
      // temporada anterior: só 1 gol
      row({
        id: 'm3',
        homeClubId: 'c1',
        homeClubName: 'Alba FC',
        homeScore: 1,
        awayScore: 0,
        seasonId: 's0',
        seasonName: '2019',
      }),
    ];
    const top = buildMostGoalsClubSeason(rows);
    expect(top).toMatchObject({
      clubId: 'c1',
      clubName: 'Alba FC',
      seasonId: 's1',
      seasonName: '2020',
      goals: 7,
      matches: 2,
    });
  });

  it('sem partidas devolve null', () => {
    expect(buildMostGoalsClubSeason([])).toBeNull();
  });
});

describe('findLongestUnbeatenRun', () => {
  it('conta vitórias e empates; derrota encerra a sequência (por data)', () => {
    const rows: RecordMatchRow[] = [
      // c1 em s1: V (jan), E (fev), D (mar), V (abr) → sequência 2 e depois 1
      row({
        id: 'm1',
        homeClubId: 'c1',
        homeClubName: 'Alba FC',
        homeScore: 2,
        awayScore: 0,
        date: '2020-01-10T00:00:00.000Z',
      }),
      row({
        id: 'm2',
        awayClubId: 'c1',
        homeClubId: 'c2',
        homeScore: 1,
        awayScore: 1,
        date: '2020-02-10T00:00:00.000Z',
      }),
      row({
        id: 'm3',
        homeClubId: 'c1',
        homeClubName: 'Alba FC',
        homeScore: 0,
        awayScore: 3,
        date: '2020-03-10T00:00:00.000Z',
      }),
      row({
        id: 'm4',
        homeClubId: 'c1',
        homeClubName: 'Alba FC',
        homeScore: 1,
        awayScore: 0,
        date: '2020-04-10T00:00:00.000Z',
      }),
    ];
    const run = findLongestUnbeatenRun(rows);
    expect(run).toMatchObject({
      clubId: 'c1',
      clubName: 'Alba FC',
      seasonId: 's1',
      seasonName: '2020',
      length: 2,
      fromDate: '2020-01-10T00:00:00.000Z',
      toDate: '2020-02-10T00:00:00.000Z',
    });
  });

  it('sequência invicta que fecha a temporada (sem derrota depois) também conta', () => {
    const rows: RecordMatchRow[] = [
      // c2: D (m1), V (m3), V (m4) → sequência final de 2 é a maior dele;
      // c1: V, E, D, V → 2. Empate 2×2 → toDate mais antigo (c1) vence.
      row({
        id: 'm1',
        homeClubId: 'c1',
        homeClubName: 'Alba FC',
        homeScore: 2,
        awayScore: 0,
        date: '2020-01-10T00:00:00.000Z',
      }),
      row({
        id: 'm2',
        awayClubId: 'c1',
        homeClubId: 'c2',
        homeScore: 1,
        awayScore: 1,
        date: '2020-02-10T00:00:00.000Z',
      }),
      row({
        id: 'm3',
        homeClubId: 'c1',
        homeClubName: 'Alba FC',
        homeScore: 0,
        awayScore: 3,
        date: '2020-03-10T00:00:00.000Z',
      }),
      row({
        id: 'm4',
        homeClubId: 'c1',
        homeClubName: 'Alba FC',
        homeScore: 1,
        awayScore: 0,
        date: '2020-04-10T00:00:00.000Z',
      }),
    ];
    const run = findLongestUnbeatenRun(rows);
    expect(run).toMatchObject({ clubId: 'c1', length: 2 });
    // c2 fecha com V,V (mar, abr) — 2 jogos; o desempate fica com c1 (fev < abr).
    expect(run?.toDate).toBe('2020-02-10T00:00:00.000Z');
  });

  it('não mistura temporadas do mesmo clube', () => {
    const rows: RecordMatchRow[] = [
      row({
        id: 'm1',
        homeClubId: 'c1',
        homeClubName: 'Alba FC',
        homeScore: 1,
        awayScore: 0,
        seasonId: 's1',
        seasonName: '2020',
        date: '2020-01-01T00:00:00.000Z',
      }),
      row({
        id: 'm2',
        homeClubId: 'c1',
        homeClubName: 'Alba FC',
        homeScore: 1,
        awayScore: 0,
        seasonId: 's2',
        seasonName: '2021',
        date: '2021-01-01T00:00:00.000Z',
      }),
      row({
        id: 'm3',
        homeClubId: 'c1',
        homeClubName: 'Alba FC',
        homeScore: 1,
        awayScore: 0,
        seasonId: 's2',
        seasonName: '2021',
        date: '2021-02-01T00:00:00.000Z',
      }),
    ];
    const run = findLongestUnbeatenRun(rows);
    expect(run).toMatchObject({ clubId: 'c1', seasonName: '2021', length: 2 });
  });

  it('empate de tamanho: sequência mais antiga vence (determinístico)', () => {
    const rows: RecordMatchRow[] = [
      // c1: 2 invicto (2020) · c3: 2 invicto (2021) → c1 ganha pelo toDate mais antigo
      row({
        id: 'a1',
        homeClubId: 'c1',
        homeClubName: 'Alba FC',
        homeScore: 1,
        awayScore: 0,
        date: '2020-01-01T00:00:00.000Z',
      }),
      row({
        id: 'a2',
        homeClubId: 'c1',
        homeClubName: 'Alba FC',
        homeScore: 2,
        awayScore: 2,
        date: '2020-02-01T00:00:00.000Z',
      }),
      row({
        id: 'b1',
        homeClubId: 'c3',
        homeClubName: 'Costa SC',
        homeScore: 3,
        awayScore: 0,
        date: '2021-01-01T00:00:00.000Z',
      }),
      row({
        id: 'b2',
        homeClubId: 'c3',
        homeClubName: 'Costa SC',
        homeScore: 1,
        awayScore: 1,
        date: '2021-02-01T00:00:00.000Z',
      }),
    ];
    const run = findLongestUnbeatenRun(rows);
    expect(run?.clubId).toBe('c1');
    expect(run?.length).toBe(2);
  });

  it('sem partidas devolve null', () => {
    expect(findLongestUnbeatenRun([])).toBeNull();
  });
});
