/**
 * T551 — a regra de "clube atual" a partir do P54. É uma INFERÊNCIA, então cada corte
 * tem teste: contrato em aberto vence, o mais recente entre vários vence, aposentado não
 * tem clube atual, e statement sem time é ignorado.
 */
import { describe, it, expect } from 'vitest';
import {
  currentTeamQid,
  type P54StatementLike,
} from '../../../src/modules/etl/player-current-club.js';

const time = (iso: string) => [{ datavalue: { value: { time: `+${iso}T00:00:00Z` } } }];

function st(teamQid: string | null, inicio?: string, fim?: string): P54StatementLike {
  return {
    ...(teamQid ? { mainsnak: { datavalue: { value: { id: teamQid } } } } : { mainsnak: {} }),
    qualifiers: {
      ...(inicio ? { P580: time(inicio) } : {}),
      ...(fim ? { P582: time(fim) } : {}),
    },
  };
}

describe('T551 — clube atual a partir do P54', () => {
  it('contrato em aberto (sem P582) é o clube atual', () => {
    expect(currentTeamQid([st('Q7156', '2024-07-01')])).toBe('Q7156');
  });

  it('aposentado (todos com P582) NÃO tem clube atual — não se grava o último como atual', () => {
    expect(currentTeamQid([st('Q128829', '1956-01-01', '1974-10-01')])).toBeNull();
  });

  it('com dois em aberto, vence o P580 mais recente', () => {
    const lista = [st('Qantigo', '2019-01-01'), st('Qnovo', '2024-08-01')];
    expect(currentTeamQid(lista)).toBe('Qnovo');
  });

  it('em aberto sem P580 perde para o datado (sem data = mais antigo)', () => {
    const lista = [st('Qsemdata'), st('Qdatado', '2023-01-01')];
    expect(currentTeamQid(lista)).toBe('Qdatado');
  });

  it('statement encerrado não "vence" só por ser o último da lista', () => {
    const lista = [st('Qencerrado', '2020-01-01', '2021-01-01'), st('Qaberto', '2021-06-01')];
    expect(currentTeamQid(lista)).toBe('Qaberto');
  });

  it('statement sem entidade de time é ignorado', () => {
    const lista = [st(null), st('Q7156', '2024-01-01')];
    expect(currentTeamQid(lista)).toBe('Q7156');
  });

  it('sem P54 (ou lista vazia) devolve null', () => {
    expect(currentTeamQid(undefined)).toBeNull();
    expect(currentTeamQid([])).toBeNull();
    expect(currentTeamQid([st(null)])).toBeNull();
  });
});
