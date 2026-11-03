import type { Locale } from './config';

/**
 * RANKING — strings da rota `/rankings/[id]`.
 *
 * Módulo ADITIVO. Rótulos de coluna e os três estados da tabela moram aqui; o resto da página de
 * rankings continua nas strings que já existiam (`pages.rankings`).
 */
export interface RankingDetalheStrings {
  backToRankings: string;
  colPosition: string;
  colName: string;
  colPoints: string;
  colBase: string;
  /** Base auditável: "com base em N partidas / T títulos". */
  baseMatches: string;
  baseTitles: string;
  noPosition: string;
  /** Entrada sem posição publicada (T425). */
  unranked: string;
  unpublished: string;
  published: string;
  season: string;
  scopeCountry: string;
  provenance: string;
  notFound: string;
}

export const rankingDetalheStrings: Record<Locale, RankingDetalheStrings> = {
  'pt-br': {
    backToRankings: 'Todos os rankings',
    colPosition: 'Posição',
    colName: 'Clube',
    colPoints: 'Pontos',
    colBase: 'Base',
    baseMatches: 'partidas',
    baseTitles: 'títulos',
    noPosition: 'Sem posição publicada',
    unranked: 'Não ranqueado',
    unpublished: 'Não publicado',
    published: 'Publicado',
    season: 'Temporada',
    scopeCountry: 'País',
    provenance:
      'Pontuação normalizada por gênero. A coluna "Base" mostra em quantas partidas e quantos títulos a posição se apoia — sem ela, o número é uma afirmação sem lastro.',
    notFound: 'Ranking não encontrado',
  },
  'en-us': {
    backToRankings: 'All rankings',
    colPosition: 'Position',
    colName: 'Club',
    colPoints: 'Points',
    colBase: 'Base',
    baseMatches: 'matches',
    baseTitles: 'titles',
    noPosition: 'No published position',
    unranked: 'Unranked',
    unpublished: 'Unpublished',
    published: 'Published',
    season: 'Season',
    scopeCountry: 'Country',
    provenance:
      'Score normalised by gender. The "Base" column shows how many matches and titles the position rests on — without it the number is a claim without support.',
    notFound: 'Ranking not found',
  },
  'es-es': {
    backToRankings: 'Todos los rankings',
    colPosition: 'Posición',
    colName: 'Club',
    colPoints: 'Puntos',
    colBase: 'Base',
    baseMatches: 'partidos',
    baseTitles: 'títulos',
    noPosition: 'Sin posición publicada',
    unranked: 'No clasificado',
    unpublished: 'No publicado',
    published: 'Publicado',
    season: 'Temporada',
    scopeCountry: 'País',
    provenance:
      'Puntuación normalizada por género. La columna "Base" muestra en cuántos partidos y cuántos títulos se apoya la posición — sin ella, el número es una afirmación sin respaldo.',
    notFound: 'Ranking no encontrado',
  },
};
