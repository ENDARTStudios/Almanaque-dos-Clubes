/**
 * T561 — contagem por tipo na busca global.
 *
 * O que isto resolve: o usuário via o total ("83 resultados") mas não sabia como ele se
 * distribuía. Filtrando por clubes, ele não tinha como saber que havia 33 jogadores sem clicar
 * na aba — e cada clique é uma requisição. Com `counts`, o número aparece ao lado de cada aba.
 *
 * A conta sai de graça porque `all` já contém os três tipos antes da paginação; a alternativa
 * seria o cliente disparar quatro buscas por tecla digitada.
 */
import { describe, it, expect } from 'vitest';
import {
  contarPorTipo,
  type GlobalSearchResult,
} from '../../src/modules/search/global-search.service.js';

const r = (type: 'club' | 'competition' | 'player', name: string): GlobalSearchResult =>
  ({
    type,
    id: `id-${name}`,
    qid: null,
    name,
    subtitle: null,
    country: null,
    score: 1,
    sourceUrl: null,
  }) as GlobalSearchResult;

describe('contarPorTipo — distribuição do termo por tipo', () => {
  it('conta cada tipo e usa `all` como o total', () => {
    const counts = contarPorTipo([r('club', 'a'), r('club', 'b'), r('player', 'c')]);
    expect(counts).toEqual({ all: 3, club: 2, competition: 0, player: 1 });
  });

  it('tipo sem resultado fica em ZERO, e não some da resposta', () => {
    // Zero é resposta: a aba "Competições" precisa poder dizer "0" em vez de não dizer nada.
    // Se a chave sumisse, o cliente não distinguiria "não perguntei" de "não há".
    const counts = contarPorTipo([r('club', 'a')]);
    expect(counts.competition).toBe(0);
    expect(Object.keys(counts).sort()).toEqual(['all', 'club', 'competition', 'player']);
  });

  it('lista vazia devolve tudo zerado (e não `undefined`)', () => {
    expect(contarPorTipo([])).toEqual({ all: 0, club: 0, competition: 0, player: 0 });
  });

  it('`all` é a soma dos três — a invariante que dá sentido ao número', () => {
    const results = [
      r('club', 'a'),
      r('club', 'b'),
      r('competition', 'c'),
      r('player', 'd'),
      r('player', 'e'),
      r('player', 'f'),
    ];
    const c = contarPorTipo(results);
    expect(c.all).toBe(c.club + c.competition + c.player);
    expect(c.all).toBe(6);
  });

  it('a ordem não importa', () => {
    const a = contarPorTipo([r('club', 'x'), r('player', 'y'), r('competition', 'z')]);
    const b = contarPorTipo([r('competition', 'z'), r('player', 'y'), r('club', 'x')]);
    expect(a).toEqual(b);
  });
});
