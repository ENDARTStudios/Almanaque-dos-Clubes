import type { Locale } from './config';

/**
 * Strings de LISTAGEM que ainda estavam literais em português (módulo ADITIVO, como manda a
 * regra 4 do design system: não toca o `Dictionary` global nem `i18n/types.ts`).
 *
 * O DEFEITO MEDIDO (auditoria visual em produção, 16/10): em `en-us` e `es-es` o `/players`
 * mostrava "Jogadores diferentes no acervo", "Jogadores no acervo" e "Nenhum jogador
 * encontrado."; e os cartões de `/clubs` (inclusive as listagens filtradas) mostravam o status
 * "Ativo" em português — os demais status apareciam como o valor cru do banco ("INACTIVE",
 * "DISSOLVED"). Nenhum desses textos é dado do acervo: é copy de interface e pertence ao
 * idioma da página.
 *
 * Os nomes de status são as chaves do enum `ClubStatus` do Prisma. Valor desconhecido cai no
 * valor cru na chamada (nunca é inventado um rótulo).
 */
export interface ListingStrings {
  players: {
    /** `{n}` = total de jogadores distintos no recorte. */
    total: string;
    /** Título (sr-only) do conjunto de cartões. */
    listTitle: string;
    empty: string;
  };
  clubs: {
    empty: string;
    /** Rótulos visíveis dos valores de `ClubStatus`. */
    status: {
      ACTIVE: string;
      INACTIVE: string;
      DISSOLVED: string;
    };
  };
}

export const listingStrings: Record<Locale, ListingStrings> = {
  'pt-br': {
    players: {
      total: 'Jogadores diferentes no acervo: {n}',
      listTitle: 'Jogadores no acervo',
      empty: 'Nenhum jogador encontrado.',
    },
    clubs: {
      empty: 'Nenhum clube encontrado.',
      status: {
        ACTIVE: 'Ativo',
        INACTIVE: 'Inativo',
        DISSOLVED: 'Dissolvido',
      },
    },
  },
  'en-us': {
    players: {
      total: 'Distinct players in the archive: {n}',
      listTitle: 'Players in the archive',
      empty: 'No players found.',
    },
    clubs: {
      empty: 'No clubs found.',
      status: {
        ACTIVE: 'Active',
        INACTIVE: 'Inactive',
        DISSOLVED: 'Dissolved',
      },
    },
  },
  'es-es': {
    players: {
      total: 'Jugadores distintos en el acervo: {n}',
      listTitle: 'Jugadores en el acervo',
      empty: 'Ningún jugador encontrado.',
    },
    clubs: {
      empty: 'Ningún club encontrado.',
      status: {
        ACTIVE: 'Activo',
        INACTIVE: 'Inactivo',
        DISSOLVED: 'Disuelto',
      },
    },
  },
};
