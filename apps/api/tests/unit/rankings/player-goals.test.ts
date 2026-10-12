import { describe, it, expect } from 'vitest';
import {
  aggregatePlayerGoals,
  isPlausibleScorer,
  normalizePlayerName,
  resolveScorer,
  type CandidatePlayer,
} from '../../../src/lib/rankings/player-goals.js';

// T522 — agregação de gols por jogador a partir de `matches.scorers`.
// A resolução de identidade é o ponto sensível: um match exato de nome escolheria
// o HOMÔNIMO errado (o acervo tem um "Everaldo" de 1944 e o goleiro "Fábio").

const p = (
  id: string,
  fullName: string,
  extra: Partial<CandidatePlayer> = {},
): CandidatePlayer => ({
  id,
  fullName,
  country: 'BR',
  position: 'FORWARD',
  birthDate: new Date(Date.UTC(1995, 0, 1)),
  qid: null,
  ...extra,
});

const index = (players: CandidatePlayer[]) => {
  const m = new Map<string, CandidatePlayer[]>();
  for (const c of players) {
    const k = normalizePlayerName(c.fullName);
    m.set(k, [...(m.get(k) ?? []), c]);
  }
  return m;
};

describe('player-goals — plausibilidade do autor de gol', () => {
  it('recusa goleiro (não marca em jogada normal)', () => {
    expect(isPlausibleScorer({ position: 'GOALKEEPER', birthDate: new Date(Date.UTC(1980, 0, 1)) })).toBe(
      false,
    );
  });

  it('recusa nascido antes de 1980 e menor de idade', () => {
    expect(isPlausibleScorer({ position: 'FORWARD', birthDate: new Date(Date.UTC(1944, 0, 1)) })).toBe(
      false,
    );
    expect(isPlausibleScorer({ position: 'FORWARD', birthDate: new Date(Date.UTC(2015, 0, 1)) })).toBe(
      false,
    );
  });

  it('aceita jogador de linha em idade plausível', () => {
    expect(isPlausibleScorer({ position: 'FORWARD', birthDate: new Date(Date.UTC(1991, 0, 1)) })).toBe(
      true,
    );
  });
});

describe('player-goals — resolução de nome', () => {
  it('resolve nome exato quando há um único candidato plausível', () => {
    const ctx = { byNormalizedName: index([p('1', 'Endrick', { birthDate: new Date(Date.UTC(2006, 6, 21)) })]) };
    expect(resolveScorer('Endrick', ctx)?.id).toBe('1');
  });

  it('NÃO resolve nome ambíguo (dois candidatos plausíveis) — vira gap', () => {
    const ctx = { byNormalizedName: index([p('1', 'Artur'), p('2', 'Artur', { country: 'PT' })]) };
    expect(resolveScorer('Artur', ctx)).toBeNull();
  });

  it('desempata a armadilha do homônimo antigo pelo alias + plausibilidade', () => {
    // "Everaldo" sozinho casaria com o jogador de 1944 (implausível); o alias
    // aponta para "Everaldo Stum" (1991), que é o que marcou em 2023.
    const ctx = {
      byNormalizedName: index([
        p('velho', 'Everaldo', { birthDate: new Date(Date.UTC(1944, 8, 11)) }),
        p('stum', 'Everaldo Stum', { birthDate: new Date(Date.UTC(1991, 6, 5)) }),
      ]),
    };
    expect(resolveScorer('Everaldo', ctx)?.id).toBe('stum');
  });

  it('não resolve goleiro homônimo nem nome ausente', () => {
    const ctx = {
      byNormalizedName: index([p('gk', 'Fábio', { position: 'GOALKEEPER' })]),
    };
    expect(resolveScorer('Fábio', ctx)).toBeNull();
    expect(resolveScorer('Raniele', ctx)).toBeNull();
  });
});

describe('player-goals — agregação', () => {
  const ctx = {
    byNormalizedName: index([
      p('pedro', 'Pedro Guilherme Abreu dos Santos', { birthDate: new Date(Date.UTC(1997, 5, 20)) }),
      p('yuri', 'Yuri Alberto', { birthDate: new Date(Date.UTC(2001, 2, 18)) }),
    ]),
  };

  it('conta dois gols do mesmo jogador no mesmo jogo e exclui gol contra', () => {
    const r = aggregatePlayerGoals(
      [
        {
          id: 'm1',
          competitionId: 'comp1',
          homeScore: 3,
          awayScore: 1,
          // `[Pedro 7pen, 90]` = dois gols do Pedro; `Sidimar 48og` = gol contra.
          scorersRaw: 'Pedro 7pen, 90, Gabriel Barbosa 45; Sidimar 48og',
          sourceUrl: 'https://rsssf.org/x',
          importedFrom: 'rsssf',
        },
      ],
      ctx,
    );
    const pedro = r.players.find((x) => x.playerId === 'pedro');
    expect(pedro).toMatchObject({ goals: 2, scoringMatches: 1 });
    expect(r.ownGoalsExcluded).toBe(1);
    // "Gabriel Barbosa" não está no índice (o acervo usa "Gabigol" — alias curado
    // resolve em produção): aqui entra como não resolvido, e NÃO como gol de ninguém.
    expect(r.unresolved.get('Gabriel Barbosa')).toBe(1);
  });

  it('base = partidas em que marcou (não inventa aparições)', () => {
    const mk = (id: string) => ({
      id,
      competitionId: 'comp1',
      homeScore: 1,
      awayScore: 0,
      scorersRaw: 'Yuri Alberto 10',
      sourceUrl: null,
      importedFrom: 'rsssf',
    });
    const r = aggregatePlayerGoals([mk('m1'), mk('m2'), mk('m3')], ctx);
    const yuri = r.players.find((x) => x.playerId === 'yuri');
    expect(yuri).toMatchObject({ goals: 3, scoringMatches: 3 });
  });

  it('ordena por gols e mantém a proveniência', () => {
    const r = aggregatePlayerGoals(
      [
        {
          id: 'm1',
          competitionId: 'comp1',
          homeScore: 2,
          awayScore: 0,
          scorersRaw: 'Yuri Alberto 10, Pedro Guilherme Abreu dos Santos 20',
          sourceUrl: 'https://rsssf.org/a',
          importedFrom: 'rsssf',
        },
      ],
      ctx,
    );
    expect(r.players.map((x) => x.goals)).toEqual([1, 1]);
    expect(r.players[0].sourceUrls).toEqual(['https://rsssf.org/a']);
  });
});
