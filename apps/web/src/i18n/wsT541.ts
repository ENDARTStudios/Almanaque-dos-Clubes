import type { Locale } from './config';

/**
 * T541 — strings da página /matches (listagem de partidas).
 *
 * Módulo ADITIVO, como manda a regra 4 do design system: NÃO altera o Dictionary
 * global nem `i18n/types.ts`. Foi escrito assim de propósito — a sessão paralela tem
 * modificações em voo exatamente nos dicionários e no types.ts (T541 foi feito em
 * worktree isolado para não arrastar o work-in-progress dela).
 */
export interface WT541Strings {
  title: string;
  subtitle: string;
  filters: {
    legend: string;
    competition: string;
    allCompetitions: string;
    season: string;
    allSeasons: string;
    from: string;
    to: string;
    apply: string;
    clear: string;
    results: string;
    noResults: string;
    noResultsHint: string;
  };
  table: {
    date: string;
    competition: string;
    season: string;
    match: string;
    score: string;
    round: string;
  };
  pagination: { previous: string; next: string; page: string };
  /** Rodapé de proveniência — o dado tem fonte declarada por partida. */
  source: string;
}

export const wt541Strings: Record<Locale, WT541Strings> = {
  'pt-br': {
    title: 'Partidas',
    subtitle:
      'Resultados rodada a rodada das competições do acervo, com placar e proveniência por partida.',
    filters: {
      legend: 'Filtrar partidas',
      competition: 'Competição',
      allCompetitions: 'Todas as competições',
      season: 'Temporada',
      allSeasons: 'Todas as temporadas',
      from: 'De',
      to: 'Até',
      apply: 'Filtrar',
      clear: 'Limpar',
      results: 'partidas encontradas',
      noResults: 'Nenhuma partida para estes filtros',
      noResultsHint: 'O acervo só mostra o que tem fonte: ajuste os filtros e tente de novo.',
    },
    table: {
      date: 'Data',
      competition: 'Competição',
      season: 'Temporada',
      match: 'Partida',
      score: 'Placar',
      round: 'Rodada',
    },
    pagination: { previous: 'Anterior', next: 'Próxima', page: 'Página' },
    source: 'Fonte: RSSSF (resultados por temporada). Placar ausente na fonte não é inventado.',
  },
  'en-us': {
    title: 'Matches',
    subtitle: 'Round-by-round results across the archive, with score and per-match provenance.',
    filters: {
      legend: 'Filter matches',
      competition: 'Competition',
      allCompetitions: 'All competitions',
      season: 'Season',
      allSeasons: 'All seasons',
      from: 'From',
      to: 'To',
      apply: 'Filter',
      clear: 'Clear',
      results: 'matches found',
      noResults: 'No matches for these filters',
      noResultsHint: 'The archive only shows what has a source: adjust the filters and try again.',
    },
    table: {
      date: 'Date',
      competition: 'Competition',
      season: 'Season',
      match: 'Match',
      score: 'Score',
      round: 'Round',
    },
    pagination: { previous: 'Previous', next: 'Next', page: 'Page' },
    source: 'Source: RSSSF (season results). A score missing at the source is never invented.',
  },
  'es-es': {
    title: 'Partidos',
    subtitle:
      'Resultados jornada a jornada de las competiciones del acervo, con marcador y procedencia por partido.',
    filters: {
      legend: 'Filtrar partidos',
      competition: 'Competición',
      allCompetitions: 'Todas las competiciones',
      season: 'Temporada',
      allSeasons: 'Todas las temporadas',
      from: 'Desde',
      to: 'Hasta',
      apply: 'Filtrar',
      clear: 'Limpiar',
      results: 'partidos encontrados',
      noResults: 'Ningún partido para estos filtros',
      noResultsHint:
        'El acervo solo muestra lo que tiene fuente: ajusta los filtros e inténtalo de nuevo.',
    },
    table: {
      date: 'Fecha',
      competition: 'Competición',
      season: 'Temporada',
      match: 'Partido',
      score: 'Marcador',
      round: 'Jornada',
    },
    pagination: { previous: 'Anterior', next: 'Siguiente', page: 'Página' },
    source:
      'Fuente: RSSSF (resultados por temporada). Un marcador ausente en la fuente no se inventa.',
  },
};
