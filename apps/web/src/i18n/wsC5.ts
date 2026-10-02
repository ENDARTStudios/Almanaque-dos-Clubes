import type { Locale } from './config';

/**
 * WS-C-5 — strings da timeline de conquistas e clubes relacionados.
 * Módulo ADITIVO (não altera o Dictionary global); consumido por Server Components
 * do perfil do clube (via cookie de locale).
 */
export interface WsC5Strings {
  timeline: {
    title: string;
    empty: string;
    source: string;
    hierarchies: Record<
      'mundial' | 'continental' | 'nacional' | 'estadual' | 'municipal',
      string
    >;
  };
  related: {
    title: string;
    empty: string;
    relations: Record<'same_city' | 'same_state' | 'same_competition' | 'rival', string>;
  };
}

export const wsC5Strings: Record<Locale, WsC5Strings> = {
  'pt-br': {
    timeline: {
      title: 'Linha do tempo de conquistas',
      empty: 'Nenhuma conquista registrada',
      source: 'fonte',
      hierarchies: {
        mundial: 'Mundial',
        continental: 'Continental',
        nacional: 'Nacional',
        estadual: 'Estadual',
        municipal: 'Municipal',
      },
    },
    related: {
      title: 'Clubes relacionados',
      empty: 'Nenhum clube relacionado registrado',
      relations: {
        same_city: 'Mesma cidade',
        same_state: 'Mesmo estado',
        same_competition: 'Mesma competição',
        rival: 'Rivalidade',
      },
    },
  },
  'en-us': {
    timeline: {
      title: 'Titles timeline',
      empty: 'No titles recorded',
      source: 'source',
      hierarchies: {
        mundial: 'World',
        continental: 'Continental',
        nacional: 'National',
        estadual: 'State',
        municipal: 'Municipal',
      },
    },
    related: {
      title: 'Related clubs',
      empty: 'No related clubs recorded',
      relations: {
        same_city: 'Same city',
        same_state: 'Same state',
        same_competition: 'Same competition',
        rival: 'Rivalry',
      },
    },
  },
  'es-es': {
    timeline: {
      title: 'Línea de tiempo de títulos',
      empty: 'Ningún título registrado',
      source: 'fuente',
      hierarchies: {
        mundial: 'Mundial',
        continental: 'Continental',
        nacional: 'Nacional',
        estadual: 'Estatal',
        municipal: 'Municipal',
      },
    },
    related: {
      title: 'Clubes relacionados',
      empty: 'Ningún club relacionado registrado',
      relations: {
        same_city: 'Misma ciudad',
        same_state: 'Mismo estado',
        same_competition: 'Misma competición',
        rival: 'Rivalidad',
      },
    },
  },
};
