import type { Locale } from './config';

/**
 * T579 — strings dos três ajustes de UI desta rodada (módulo ADITIVO, como manda a regra
 * 4 do design system: não toca `Dictionary` global nem `i18n/types.ts`, que outras
 * sessões editam em paralelo).
 *
 *  - ITEM 19 — bandeira do país clicável que leva ao conteúdo relacionado do país;
 *  - ITEM 20 — partidas na ordem do confronto (casa, placar casa, ×, placar visitante,
 *              visitante), com escudo e leitura falada correta;
 *  - ITEM 21 — filtro "País" de `/rankings` com todos os países do escopo atual.
 *
 * Sobre a redação dos rótulos de bandeira: em pt-br o país pede PREPOSIÇÃO COM GÊNERO
 * ("da Itália" × "de Portugal" × "do Brasil"), e a mesma string tem de servir aos 84
 * países do acervo. Por isso o rótulo é "AÇÃO: {country}" (verbo primeiro, nome do país
 * depois dos dois-pontos) — é a ordem que fica gramatical em todos eles e que um leitor
 * de tela anuncia de forma natural ("Ver clubes: Itália, link").
 */
export interface WT579Strings {
  flag: {
    /** Destino `/clubs?country=XX`. */
    clubs: string;
    /** Destino `/players?country=XX`. */
    players: string;
    /** Destino `/competitions?country=XX`. */
    competitions: string;
  };
  matches: {
    /** Junção FALADA entre os dois placares ("a" / "to"). O "×" da tela é decorativo. */
    scoreJoiner: string;
    /** Placar ausente na fonte — lacuna declarada, nunca `0`. */
    noScore: string;
  };
  /**
   * Rótulos de campo que faltavam no dicionário. Ficam AQUI, e não em
   * `dictionaries/*.ts`, porque a regra desta rodada é não mexer nos dicionários
   * globais (outra sessão edita os mesmos arquivos).
   */
  labels: {
    /** "País" — o dicionário de `playerProfile` não tinha a chave. */
    country: string;
  };
}

export const wt579Strings: Record<Locale, WT579Strings> = {
  'pt-br': {
    flag: {
      clubs: 'Ver clubes: {country}',
      players: 'Ver jogadores: {country}',
      competitions: 'Ver competições: {country}',
    },
    matches: {
      scoreJoiner: 'a',
      noScore: 'sem placar na fonte',
    },
    labels: { country: 'País' },
  },
  'en-us': {
    flag: {
      clubs: 'See clubs: {country}',
      players: 'See players: {country}',
      competitions: 'See competitions: {country}',
    },
    matches: {
      scoreJoiner: 'to',
      noScore: 'no score at the source',
    },
    labels: { country: 'Country' },
  },
  'es-es': {
    flag: {
      clubs: 'Ver clubes: {country}',
      players: 'Ver jugadores: {country}',
      competitions: 'Ver competiciones: {country}',
    },
    matches: {
      scoreJoiner: 'a',
      noScore: 'sin marcador en la fuente',
    },
    labels: { country: 'País' },
  },
};

/** Interpola `{country}` sem depender do provider (o componente roda também no servidor). */
export function flagLabel(
  locale: Locale,
  destination: keyof WT579Strings['flag'],
  country: string,
): string {
  return wt579Strings[locale].flag[destination].replace('{country}', country);
}
