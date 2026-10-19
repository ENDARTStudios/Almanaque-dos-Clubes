/**
 * Estatísticas de partidas (`modules/competitions/match-stats.ts`) — tarefas 30, 31 e 33.
 *
 * ── POR QUE ESTE TESTE EXISTE ────────────────────────────────────────────────────────────
 * Tabela de pontos corridos é o tipo de número que ninguém confere na tela: se estiver errado,
 * o clube aparece duas posições acima, o torcedor acha que está certo, e o erro vive para sempre.
 * Diferente de um layout quebrado, ele não chama atenção.
 *
 * Os três pontos que podem errar em silêncio:
 *   1. **Regra de pontos** — 3 por vitória é o padrão, mas somar eras diferentes com a mesma régua
 *      produz um total que nunca existiu.
 *   2. **Empate na pontuação** — sem critério total e estável, a tabela troca de ordem entre duas
 *      requisições, sem nenhum jogo novo.
 *   3. **Rodada como texto** — "10" ordenado como string vem antes de "2", e a evolução
 *      rodada-a-rodada passa a contar a história fora de ordem.
 */
import { describe, it, expect } from 'vitest';
import {
  buildRoundEvolution,
  buildRecords,
  buildTable,
  championsBySeason,
  positionChanges,
  PONTOS_POR_VITORIA_PADRAO,
  type MatchRow,
} from '../../src/modules/competitions/match-stats.js';

const jogo = (
  casa: string,
  fora: string,
  hg: number,
  ag: number,
  extra: Partial<MatchRow> = {},
): MatchRow => ({
  date: new Date('2024-05-01'),
  season: '2024',
  round: '1',
  homeClubId: casa,
  awayClubId: fora,
  homeScore: hg,
  awayScore: ag,
  ...extra,
});

describe('buildTable', () => {
  it('conta 3 pontos por vitória e 1 por empate', () => {
    const t = buildTable([jogo('A', 'B', 2, 0)]);
    const a = t.find((r) => r.clubId === 'A')!;
    const b = t.find((r) => r.clubId === 'B')!;
    expect(a.points).toBe(3);
    expect(a.wins).toBe(1);
    expect(b.points).toBe(0);
    expect(b.losses).toBe(1);
    expect(PONTOS_POR_VITORIA_PADRAO).toBe(3);
  });

  it('empate dá 1 ponto para cada lado', () => {
    const t = buildTable([jogo('A', 'B', 1, 1)]);
    expect(t.map((r) => r.points)).toEqual([1, 1]);
    expect(t.every((r) => r.draws === 1)).toBe(true);
  });

  it('a régua de pontos é PARÂMETRO — 2 pontos por vitória muda o total', () => {
    /* Era 2 antes de 1995. Uma tabela histórica que atravessasse eras com a régua de hoje
       produziria um número que nunca existiu. O teste trava o parâmetro. */
    const t = buildTable([jogo('A', 'B', 1, 0), jogo('A', 'C', 1, 1)], 2);
    const a = t.find((r) => r.clubId === 'A')!;
    expect(a.points).toBe(3); // 1 vitória (2) + 1 empate (1)
    expect(
      buildTable([jogo('A', 'B', 1, 0), jogo('A', 'C', 1, 1)], 3).find((r) => r.clubId === 'A')!
        .points,
    ).toBe(4);
  });

  it('conta gols pró, contra e saldo dos dois lados', () => {
    const t = buildTable([jogo('A', 'B', 3, 1)]);
    const a = t.find((r) => r.clubId === 'A')!;
    const b = t.find((r) => r.clubId === 'B')!;
    expect([a.goalsFor, a.goalsAgainst, a.goalDifference]).toEqual([3, 1, 2]);
    expect([b.goalsFor, b.goalsAgainst, b.goalDifference]).toEqual([1, 3, -2]);
  });

  it('desempata por saldo, depois gols pró', () => {
    /* Quatro clubes, todos com 3 pontos:
         A: 3×0 → saldo +3, 3 gols pró
         B: 1×0 → saldo +1, 1 gol pró
         C: 2×1 → saldo +1, 2 gols pró
         D: 2×1 → saldo +1, 2 gols pró
       Ordem: A (saldo maior), depois C e D (mesmo saldo de B, mas MAIS gols pró), depois B.
       Minha primeira expectativa punha B em 2º — errada, e o teste pegou: 1 gol pró perde
       para 2. Fica registrado aqui para a tabela não ser "consertada" no futuro. */
    const t = buildTable([
      jogo('A', 'X', 3, 0),
      jogo('B', 'Y', 1, 0),
      jogo('C', 'Z', 2, 1),
      jogo('D', 'W', 2, 1),
    ]);
    const pos = (id: string) => t.find((r) => r.clubId === id)!.position;
    expect(pos('A')).toBe(1);
    expect([pos('C'), pos('D')]).toEqual([2, 3]);
    expect(pos('B')).toBe(4);
  });

  it('partida SEM placar não entra em nenhum agregado (não vira 0×0)', () => {
    /* O erro silencioso: tratar ausência de placar como 0×0 daria 1 ponto a cada clube e uma
       "partida jogada" que não existiu. */
    const t = buildTable([jogo('A', 'B', 1, 0), jogo('A', 'C', null as never, null as never)]);
    expect(t).toHaveLength(2);
    expect(t.find((r) => r.clubId === 'A')!.played).toBe(1);
    expect(t.every((r) => r.played === 1)).toBe(true);
  });

  it('lista vazia devolve tabela vazia', () => {
    expect(buildTable([])).toEqual([]);
  });
});

describe('buildRecords', () => {
  it('maior vitória é a de maior margem; empate na margem fica a de mais gols', () => {
    const r = buildRecords([jogo('A', 'B', 1, 0), jogo('C', 'D', 5, 2), jogo('E', 'F', 4, 0)]);
    // margens: 1, 3, 4 -> E 4x0
    expect(r.biggestWin?.homeClubId).toBe('E');
    expect(r.biggestWin?.margin).toBe(4);
  });

  it('diz QUEM VENCEU e QUEM PERDEU na mesma partida', () => {
    /* "Maior goleada" e "maior derrota" são o mesmo jogo visto dos dois lados. Em vez de
       duplicar a partida em dois campos idênticos, o registro carrega os dois papéis. */
    const r = buildRecords([jogo('A', 'B', 7, 1)]);
    expect(r.biggestWin?.winnerClubId).toBe('A');
    expect(r.biggestWin?.loserClubId).toBe('B');
  });

  it('funciona quando a goleada é do visitante', () => {
    const r = buildRecords([jogo('A', 'B', 0, 6)]);
    expect(r.biggestWin?.winnerClubId).toBe('B');
    expect(r.biggestWin?.loserClubId).toBe('A');
  });

  it('maior número de gols é medido no total, não na margem', () => {
    // 4x3 tem margem 1 e 7 gols; 5x0 tem margem 5 e 5 gols.
    const r = buildRecords([jogo('A', 'B', 5, 0), jogo('C', 'D', 4, 3)]);
    expect(r.highestScoring?.homeClubId).toBe('C');
    expect(r.highestScoring?.goals).toBe(7);
    expect(r.biggestWin?.homeClubId).toBe('A');
  });

  it('conta 0×0 como resultado legítimo, não como ausência', () => {
    const r = buildRecords([jogo('A', 'B', 0, 0), jogo('C', 'D', 2, 1)]);
    expect(r.goallessDraws).toBe(1);
    expect(r.matchesUsed).toBe(2);
  });

  it('média de gols com 2 casas; null quando não há partida', () => {
    const r = buildRecords([jogo('A', 'B', 2, 1), jogo('C', 'D', 1, 0)]);
    expect(r.goalsPerMatch).toBe(2);
    expect(buildRecords([]).goalsPerMatch).toBeNull();
    expect(buildRecords([]).biggestWin).toBeNull();
  });

  it('ignora partida sem placar nos recordes', () => {
    const r = buildRecords([jogo('A', 'B', null as never, null as never)]);
    expect(r.matchesUsed).toBe(0);
    expect(r.biggestWin).toBeNull();
  });
});

describe('buildRoundEvolution', () => {
  const jogos = [
    jogo('A', 'B', 1, 0, { round: '1' }),
    jogo('C', 'D', 2, 0, { round: '1' }),
    jogo('A', 'C', 0, 1, { round: '2' }),
    jogo('B', 'D', 3, 0, { round: '9' }),
    jogo('A', 'D', 2, 2, { round: '10' }),
  ];

  it('ordena rodada NUMERICAMENTE — "10" depois de "9", não antes de "2"', () => {
    /* Ordenação de texto poria "1", "10", "2", "9" e a história ficaria fora de ordem. */
    const evo = buildRoundEvolution(jogos);
    expect(evo.map((r) => r.round)).toEqual(['1', '2', '9', '10']);
    expect(evo.map((r) => r.roundNumber)).toEqual([1, 2, 9, 10]);
  });

  it('a tabela de cada rodada é ACUMULADA, não só daquela rodada', () => {
    const evo = buildRoundEvolution(jogos);
    const aposR2 = evo.find((r) => r.round === '2')!;
    const a = aposR2.table.find((t) => t.clubId === 'A')!;
    expect(a.played).toBe(2); // jogou nas rodadas 1 e 2
  });

  it('rodada não numérica vai para o fim e fica sem número', () => {
    const evo = buildRoundEvolution([
      jogo('A', 'B', 1, 0, { round: 'final' }),
      jogo('C', 'D', 1, 0, { round: '1' }),
    ]);
    expect(evo.map((r) => r.round)).toEqual(['1', 'final']);
    expect(evo[1].roundNumber).toBeNull();
  });

  it('conta as partidas de cada rodada', () => {
    const evo = buildRoundEvolution(jogos);
    expect(evo.find((r) => r.round === '1')!.matchesInRound).toBe(2);
    expect(evo.find((r) => r.round === '2')!.matchesInRound).toBe(1);
  });

  it('lista vazia devolve lista vazia', () => {
    expect(buildRoundEvolution([])).toEqual([]);
  });
});

describe('positionChanges', () => {
  it('positivo = subiu (posição menor)', () => {
    const antes = [{ clubId: 'A', position: 1 } as never, { clubId: 'B', position: 2 } as never];
    const depois = [{ clubId: 'B', position: 1 } as never, { clubId: 'A', position: 2 } as never];
    const d = positionChanges(antes, depois);
    expect(d.get('B')).toBe(1); // 2 -> 1, subiu 1
    expect(d.get('A')).toBe(-1); // 1 -> 2, caiu 1
  });

  it('clube que não estava antes fica null, não 0', () => {
    /* "Não estava" não é "subiu 0": 0 significaria que já estava na mesma posição. */
    const d = positionChanges([], [{ clubId: 'X', position: 1 } as never]);
    expect(d.get('X')).toBeNull();
  });
});

describe('championsBySeason', () => {
  it('deriva o campeão pela maior pontuação de cada temporada', () => {
    const campeoes = championsBySeason([
      jogo('A', 'B', 3, 0, { season: '2023' }),
      jogo('C', 'D', 1, 0, { season: '2023' }),
      jogo('C', 'A', 2, 0, { season: '2024' }),
    ]);
    expect(campeoes.find((c) => c.season === '2023')?.clubId).toBe('A');
    expect(campeoes.find((c) => c.season === '2024')?.clubId).toBe('C');
  });

  it('ordena por temporada', () => {
    const campeoes = championsBySeason([
      jogo('A', 'B', 1, 0, { season: '2024' }),
      jogo('A', 'B', 1, 0, { season: '2022' }),
    ]);
    expect(campeoes.map((c) => c.season)).toEqual(['2022', '2024']);
  });
});
