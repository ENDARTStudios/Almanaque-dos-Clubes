import type { Locale } from './config';

/**
 * WS-C-7 — strings da comparação entre clubes (/clubs/compare).
 * Módulo ADITIVO (não altera o Dictionary global); consumido por Server Components
 * (via cookie de locale) e pelo CompareSelector (client, via prop ou useI18n).
 */
export interface WsC7Strings {
  compare: {
    title: string;
    subtitle: string;
    clubA: string;
    clubB: string;
    searchPlaceholder: string;
    compareButton: string;
    missingParams: string;
    error: string;
    sameClub: string;
    founded: string;
    city: string;
    country: string;
    ranking: string;
    totalTitles: string;
    recentTitles: string;
    headToHead: string;
    h2hNone: string;
    h2hWith: string;
    viewProfile: string;
    noRanking: string;
  };
}

export const wsC7Strings: Record<Locale, WsC7Strings> = {
  'pt-br': {
    compare: {
      title: 'Comparar clubes',
      subtitle: 'Títulos, ranking e confronto — lado a lado, com proveniência.',
      clubA: 'Clube A',
      clubB: 'Clube B',
      searchPlaceholder: 'Buscar clube…',
      compareButton: 'Comparar',
      missingParams: 'Escolha dois clubes para comparar.',
      error: 'Não foi possível carregar a comparação.',
      sameClub: 'Os dois clubes são iguais.',
      founded: 'Fundação',
      city: 'Cidade',
      country: 'País',
      ranking: 'Ranking publicado',
      totalTitles: 'Total de títulos',
      recentTitles: 'Conquistas recentes (últimos 5 anos)',
      headToHead: 'Confronto direto',
      h2hNone: 'Sem confronto registrado no acervo',
      h2hWith: 'Aresta explícita no Knowledge Graph',
      viewProfile: 'Ver perfil',
      noRanking: 'Sem ranking publicado',
    },
  },
  'en-us': {
    compare: {
      title: 'Compare clubs',
      subtitle: 'Titles, ranking and head-to-head — side by side, with provenance.',
      clubA: 'Club A',
      clubB: 'Club B',
      searchPlaceholder: 'Search club…',
      compareButton: 'Compare',
      missingParams: 'Pick two clubs to compare.',
      error: 'Could not load the comparison.',
      sameClub: 'Both clubs are the same.',
      founded: 'Founded',
      city: 'City',
      country: 'Country',
      ranking: 'Published ranking',
      totalTitles: 'Total titles',
      recentTitles: 'Recent titles (last 5 years)',
      headToHead: 'Head-to-head',
      h2hNone: 'No matchup recorded in the collection',
      h2hWith: 'Explicit edge in the Knowledge Graph',
      viewProfile: 'View profile',
      noRanking: 'No published ranking',
    },
  },
  'es-es': {
    compare: {
      title: 'Comparar clubes',
      subtitle: 'Títulos, ranking y enfrentamientos — lado a lado, con procedencia.',
      clubA: 'Club A',
      clubB: 'Club B',
      searchPlaceholder: 'Buscar club…',
      compareButton: 'Comparar',
      missingParams: 'Elige dos clubes para comparar.',
      error: 'No se pudo cargar la comparación.',
      sameClub: 'Los dos clubes son iguales.',
      founded: 'Fundación',
      city: 'Ciudad',
      country: 'País',
      ranking: 'Ranking publicado',
      totalTitles: 'Total de títulos',
      recentTitles: 'Títulos recientes (últimos 5 años)',
      headToHead: 'Enfrentamiento directo',
      h2hNone: 'Sin enfrentamiento registrado en el acervo',
      h2hWith: 'Arista explícita en el Knowledge Graph',
      viewProfile: 'Ver perfil',
      noRanking: 'Sin ranking publicado',
    },
  },
};
