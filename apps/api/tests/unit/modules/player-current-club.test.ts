/**
 * T551 — a regra de "clube atual" a partir do P54. É uma INFERÊNCIA sobre um dado que tem
 * falhas conhecidas na origem, então cada corte tem teste — incluindo os DOIS casos reais
 * que quase foram publicados errados (Diomande: "aberto" de 2015; Pelé: "aberto" sem data).
 *
 * Fixtures usam QIDs numéricos de propósito: o guarda `/^Q\d+$/` recusa valor que não é
 * entidade (a primeira versão usava `Qantigo`/`Qnovo` e o CI pegou).
 */
import { describe, it, expect } from 'vitest';
import {
  currentTeamQid,
  type P54StatementLike,
} from '../../../src/modules/etl/player-current-club.js';

// Relógio fixo: com 5 anos de janela, o corte é 2021-10-15.
const AGORA = new Date('2026-10-15T00:00:00Z');
const OPTS = { now: AGORA };

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
  it('contrato em aberto recente é o clube atual', () => {
    expect(currentTeamQid([st('Q7156', '2024-07-01')], OPTS)).toBe('Q7156');
  });

  it('"aberto" VELHO é recusado — caso Diomande (dois P54 abertos de 2015)', () => {
    const diomande = [st('Q19477', '2015-01-01'), st('Q184387', '2015-01-01')];
    expect(currentTeamQid(diomande, OPTS)).toBeNull();
  });

  it('"aberto" SEM data é recusado — caso Pelé (aberto sem P580, morto em 2022)', () => {
    const pele = [st('Q4201740'), st('Q1049171'), st('Q47762', '1998-01-01', '2021-01-01')];
    expect(currentTeamQid(pele, OPTS)).toBeNull();
  });

  it('aposentado (todos com P582) NÃO tem clube atual', () => {
    expect(currentTeamQid([st('Q128829', '1956-01-01', '1974-10-01')], OPTS)).toBeNull();
  });

  it('com dois em aberto recentes, vence o P580 mais recente', () => {
    const lista = [st('Q1001', '2024-08-01'), st('Q1002', '2026-01-01')];
    expect(currentTeamQid(lista, OPTS)).toBe('Q1002');
  });

  it('aberto velho não compete com aberto recente', () => {
    const lista = [st('Q1003', '2015-01-01'), st('Q1004', '2025-06-01')];
    expect(currentTeamQid(lista, OPTS)).toBe('Q1004');
  });

  it('a janela é a fronteira: exatamente no corte entra, um dia antes não', () => {
    expect(currentTeamQid([st('Q1005', '2021-10-15')], OPTS)).toBe('Q1005');
    expect(currentTeamQid([st('Q1006', '2021-10-14')], OPTS)).toBeNull();
  });

  it('statement encerrado não "vence" só por ser o último da lista', () => {
    const lista = [st('Q1007', '2020-01-01', '2021-01-01'), st('Q1008', '2021-06-01')];
    expect(currentTeamQid(lista, OPTS)).toBe('Q1008');
  });

  it('valor que NÃO é QID é recusado — guarda de identidade', () => {
    expect(
      currentTeamQid([st('Qantigo', '2025-01-01'), st('somevalue', '2025-01-01')], OPTS),
    ).toBeNull();
    expect(currentTeamQid([st('Qantigo', '2025-01-01'), st('Q1234', '2024-01-01')], OPTS)).toBe(
      'Q1234',
    );
  });

  it('sem P54 (ou lista vazia) devolve null', () => {
    expect(currentTeamQid(undefined, OPTS)).toBeNull();
    expect(currentTeamQid([], OPTS)).toBeNull();
    expect(currentTeamQid([st(null, '2025-01-01')], OPTS)).toBeNull();
  });
});
