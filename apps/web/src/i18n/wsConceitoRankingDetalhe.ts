import type { Locale } from './config';

/**
 * Copy adicional de /rankings/[id] no conceito FICHA (o texto-base de colunas/estados continua
 * em wsRankingDetalhe.ts). Aqui vive o que o quadro pede e o módulo antigo não tinha: kicker,
 * rótulo do número-âncora, chips de régua, colunas de base separadas, a caixa do critério e a
 * nota de procedência.
 */
export interface ConceitoRankingDetalheStrings {
  kicker: string;
  subtitle: string;
  anchorLabel: string;
  regimeLabel: string;
  activeClub: string;
  activePlayer: string;
  seeAll: string;
  colPlayer: string;
  colTitles: string;
  colMatches: string;
  criteriaTitle: string;
  criteriaBody: string;
  methodologyLink: string;
  provenance: string;
}

export const wsConceitoRankingDetalhe: Record<Locale, ConceitoRankingDetalheStrings> = {
  'pt-br': {
    kicker: 'Rankings · cada ranking é uma régua declarada',
    subtitle:
      'A mesma régua se aplica a todas as entradas publicadas; a base de cada posição está na tabela.',
    anchorLabel: 'entradas publicadas',
    regimeLabel: 'Régua',
    activeClub: 'Clubes',
    activePlayer: 'Jogadores',
    seeAll: 'Todos os rankings',
    colPlayer: 'Jogador',
    colTitles: 'Títulos',
    colMatches: 'Partidas',
    criteriaTitle: 'Como a pontuação é calculada',
    criteriaBody:
      'A nota de 0 a 100 normaliza o desempenho do clube no recorte: vitórias (×3) e empates (×1) ponderados pelo alcance da competição — mundial 5, continental 4, nacional 3, estadual 2, municipal 1 — mais títulos (×50). Título e posição só aparecem quando a base tem ao menos 1 título ou 5 partidas; abaixo disso a posição não é publicada.',
    methodologyLink: 'Ver metodologia',
    provenance:
      'Ranking publicado pela API pública. A pontuação é recalculada a cada rodada; o histórico fica auditável por temporada. “—” é lacuna declarada, nunca zero.',
  },
  'en-us': {
    kicker: 'Rankings · every ranking is a declared rule',
    subtitle:
      'The same rule applies to every published entry; the base of each position is in the table.',
    anchorLabel: 'published entries',
    regimeLabel: 'Rule',
    activeClub: 'Clubs',
    activePlayer: 'Players',
    seeAll: 'All rankings',
    colPlayer: 'Player',
    colTitles: 'Titles',
    colMatches: 'Matches',
    criteriaTitle: 'How the score is calculated',
    criteriaBody:
      'The 0–100 score normalises the club performance in the selection: wins (×3) and draws (×1) weighted by competition reach — world 5, continental 4, national 3, state 2, municipal 1 — plus titles (×50). A title and position only appear when the base has at least 1 title or 5 matches; below that the position is not published.',
    methodologyLink: 'See methodology',
    provenance:
      'Ranking published by the public API. The score is recalculated every round; the history is auditable per season. “—” is a declared gap, never zero.',
  },
  'es-es': {
    kicker: 'Rankings · cada ranking es una regla declarada',
    subtitle:
      'La misma regla se aplica a todas las entradas publicadas; la base de cada posición está en la tabla.',
    anchorLabel: 'entradas publicadas',
    regimeLabel: 'Regla',
    activeClub: 'Clubes',
    activePlayer: 'Jugadores',
    seeAll: 'Todos los rankings',
    colPlayer: 'Jugador',
    colTitles: 'Títulos',
    colMatches: 'Partidos',
    criteriaTitle: 'Cómo se calcula la puntuación',
    criteriaBody:
      'La nota de 0 a 100 normaliza el rendimiento del club en el recorte: victorias (×3) y empates (×1) ponderados por el alcance de la competición — mundial 5, continental 4, nacional 3, estatal 2, municipal 1 — más títulos (×50). El título y la posición solo aparecen cuando la base tiene al menos 1 título o 5 partidos; por debajo de eso la posición no se publica.',
    methodologyLink: 'Ver metodología',
    provenance:
      'Ranking publicado por la API pública. La puntuación se recalcula en cada jornada; el historial es auditable por temporada. “—” es una laguna declarada, nunca cero.',
  },
};
