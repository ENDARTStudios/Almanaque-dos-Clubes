/**
 * T551 — a regra de "clube atual" a partir do P54. É uma INFERÊNCIA, então cada corte
 * tem teste: contrato em aberto vence, o mais recente entre vários vence, aposentado não
 * tem clube atual, e statement sem time (ou cujo valor não é QID) é ignorado.
 *
 * As fixtures usam QIDs NUMÉRICOS de propósito: o guarda `/^Q\d+$/` recusa valor que não
 * é entidade — e a primeira versão destes testes usava `Qantigo`/`Qnovo`, que ele recusava.
 * O CI pegou; o caso ficou aqui explícito, para a próxima pessoa não repetir.
 */
import { describe, it, expect } from 'vitest';
import {
  currentTeamQid,
  type P54StatementLike,
} from '../../../src/modules/etl/player-current-club.js';

const time = (iso: string) => [{ datavalue: { value: { time: `+${iso}T00:00:00Z` } } }];

function st(teamValue: string | null, inicio?: string, fim?: string): P54StatementLike {
  return {
    ...(teamValue ? { mainsnak: { datavalue: { value: { id: teamValue } } } } : { mainsnak: {} }),
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
    const lista = [st('Q1001', '2019-01-01'), st('Q1002', '2024-08-01')];
    expect(currentTeamQid(lista)).toBe('Q1002');
  });

  it('em aberto sem P580 perde para o datado (sem data = mais antigo)', () => {
    const lista = [st('Q1005'), st('Q1006', '2023-01-01')];
    expect(currentTeamQid(lista)).toBe('Q1006');
  });

  it('statement encerrado não "vence" só por ser o último da lista', () => {
    const lista = [st('Q1003', '2020-01-01', '2021-01-01'), st('Q1004', '2021-06-01')];
    expect(currentTeamQid(lista)).toBe('Q1004');
  });

  it('statement sem entidade de time é ignorado', () => {
    const lista = [st(null), st('Q7156', '2024-01-01')];
    expect(currentTeamQid(lista)).toBe('Q7156');
  });

  it('valor que NÃO é QID é recusado — guarda de identidade', () => {
    // 'Qantigo' não casa /^Q\d+$/; string solta não tem datavalue de entidade.
    expect(currentTeamQid([st('Qantigo'), st('somevalue')])).toBeNull();
    expect(currentTeamQid([st('Qantigo'), st('Q1234', '2024-01-01')])).toBe('Q1234');
  });

  it('sem P54 (ou lista vazia) devolve null', () => {
    expect(currentTeamQid(undefined)).toBeNull();
    expect(currentTeamQid([])).toBeNull();
    expect(currentTeamQid([st(null)])).toBeNull();
  });
});
