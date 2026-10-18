import type { Locale } from './config';

/**
 * T-26 — blocos de INSIGHTS do perfil de competição (pódio, história, métricas),
 * consumindo o overview estendido pela API (history/podium/totals, funções puras em
 * `apps/api/src/modules/competitions/insights.ts`).
 *
 * Módulo ADITIVO (regra 4 do design system): NÃO altera o `Dictionary` global nem
 * `i18n/types.ts` — `competitionProfile` já é arquivo quente de outras sessões. Rótulos
 * que JÁ existem no dicionário (`t.matches`, `t.goals`, `t.topScorer`, `t.runnerUp`,
 * `t.titles`, `t.season`) continuam vindo de lá — aqui só entra string NOVA.
 *
 * Honestidade (critério do insights.ts, espelhado na tela):
 *  - `third` (3º colocado) só existe para tabela de LIGA — copa = não renderiza o slot;
 *  - status 'extinta' só com dissolvedAt gravado; 'sem_edicao_recente' é neutro honesto;
 *  - totais somam SÓ as edições catalogadas — a nota diz isso, nunca arredonda.
 */
export interface WsCompetitionInsightsStrings {
  /** Título da seção do pódio (última edição com campeão catalogado). */
  podiumTitle: string;
  /** `aria-label`/sr-only do card de destaque do campeão. */
  podiumChampion: string;
  /** Rótulo do 3º colocado (slot só existe em liga — copa não renderiza). */
  thirdPlace: string;
  /** Ano da última edição, quando o acervo tem: `{year}`. */
  lastEdition: string;
  /** Rótulo da ILUSTRAÇÃO autoral de medalha de prata (nunca foto oficial). */
  medalSilver: string;
  /** Rótulo da ILUSTRAÇÃO autoral de medalha de bronze (nunca foto oficial). */
  medalBronze: string;
  /** Pódio vazio: nenhuma edição com campeão catalogado. */
  podiumEmpty: string;

  /* ---- T30/T31/T33 — aba de pontos corridos e recordes (derivada de PARTIDAS) ---- */
  /** Rótulo da aba na navegação. */
  tabLabel: string;
  /** Título do bloco de métricas gerais. */
  metricsTitleMatches: string;
  matchesUsed: string;
  totalGoals: string;
  goalsPerMatch: string;
  goallessDraws: string;
  recordsTitle: string;
  biggestWin: string;
  /** `{club}` — quem sofreu a maior goleada. */
  biggestDefeatNote: string;
  highestScoring: string;
  /** `{n}` — total de gols na partida. */
  goalsInMatch: string;
  roundLabel: string;
  tableTitle: string;
  tableScopeNote: string;
  colPlayed: string;
  colWins: string;
  colDraws: string;
  colLosses: string;
  colGoalsFor: string;
  colGoalsAgainst: string;
  colGoalDiff: string;
  colPoints: string;
  championsTitle: string;
  truncatedNote: string;
  emptyState: string;

  /** Título da seção de história. */
  historyTitle: string;
  /** Primeira edição catalogada (ano). */
  firstEdition: string;
  /** Nº de edições com ano válido no acervo. */
  editionsCount: string;
  /** Maior campeão por títulos catalogados (clube + `{n}` títulos). */
  biggestChampion: string;
  /** Maior sequência de títulos consecutivos: `{from}–{to}`. */
  longestStreak: string;
  /** Badge de status: competição vigente (verde). */
  statusVigente: string;
  /** Badge de status: extinta em `{year}` (neutro, ano da dissolução). */
  statusExtinta: string;
  /** Badge de status: sem edição recente (neutro honesto — NÃO diz extinta). */
  statusSemEdicao: string;
  /** Título "Sobre" da descrição enriquecida (CC0, Wikidata). */
  aboutTitle: string;
  /** História vazia: sem edições com ano/catálogo. */
  historyEmpty: string;

  /** Título da seção de métricas (totais das edições catalogadas). */
  metricsTitle: string;
  /** Nota de escopo dos totais — a soma cobre só o que está catalogado. */
  metricsNote: string;
}

export const wsCompetitionInsightsStrings: Record<Locale, WsCompetitionInsightsStrings> = {
  'pt-br': {
    tabLabel: 'Pontos corridos',
    metricsTitleMatches: 'Números das partidas',
    matchesUsed: 'Partidas com placar',
    totalGoals: 'Gols',
    goalsPerMatch: 'Gols por jogo',
    goallessDraws: 'Empates em 0 a 0',
    recordsTitle: 'Recordes',
    biggestWin: 'Maior goleada',
    biggestDefeatNote: 'Maior derrota: {club}',
    highestScoring: 'Jogo com mais gols',
    goalsInMatch: '{n} gols na partida',
    roundLabel: 'Rodada',
    tableTitle: 'Tabela histórica de pontos corridos',
    tableScopeNote: 'Soma de todas as partidas com placar no acervo.',
    colPlayed: 'J',
    colWins: 'V',
    colDraws: 'E',
    colLosses: 'D',
    colGoalsFor: 'GP',
    colGoalsAgainst: 'GC',
    colGoalDiff: 'SG',
    colPoints: 'Pts',
    championsTitle: 'Campeões por temporada',
    truncatedNote: 'A consulta foi limitada a 20 mil partidas — a tabela pode estar incompleta.',
    emptyState: 'Nenhuma partida com placar catalogada para esta competição ainda.',
    podiumTitle: 'Pódio da última edição',
    podiumChampion: 'Campeão vigente',
    thirdPlace: '3º lugar',
    lastEdition: 'Última edição catalogada: {year}',
    medalSilver: 'Ilustração de medalha de prata — não é a medalha oficial.',
    medalBronze: 'Ilustração de medalha de bronze — não é a medalha oficial.',
    podiumEmpty: 'Nenhuma edição com campeão catalogado ainda.',
    historyTitle: 'História',
    firstEdition: 'Primeira edição',
    editionsCount: 'Edições catalogadas',
    biggestChampion: 'Maior campeão',
    longestStreak: 'Maior sequência',
    statusVigente: 'Vigente',
    statusExtinta: 'Extinta em {year}',
    statusSemEdicao: 'Sem edição recente',
    aboutTitle: 'Sobre a competição',
    historyEmpty: 'História em catalogação — nenhuma edição com ano válido no acervo.',
    metricsTitle: 'Números do acervo',
    metricsNote: 'Soma das edições com dado catalogado — o resto do acervo ainda vem.',
  },
  'en-us': {
    tabLabel: 'All-time table',
    metricsTitleMatches: 'Match numbers',
    matchesUsed: 'Matches with score',
    totalGoals: 'Goals',
    goalsPerMatch: 'Goals per match',
    goallessDraws: '0-0 draws',
    recordsTitle: 'Records',
    biggestWin: 'Biggest win',
    biggestDefeatNote: 'Biggest defeat: {club}',
    highestScoring: 'Highest-scoring match',
    goalsInMatch: '{n} goals in the match',
    roundLabel: 'Round',
    tableTitle: 'All-time league table',
    tableScopeNote: 'Sum of every match with a score in the archive.',
    colPlayed: 'P',
    colWins: 'W',
    colDraws: 'D',
    colLosses: 'L',
    colGoalsFor: 'GF',
    colGoalsAgainst: 'GA',
    colGoalDiff: 'GD',
    colPoints: 'Pts',
    championsTitle: 'Champions by season',
    truncatedNote: 'The query was capped at 20,000 matches — the table may be incomplete.',
    emptyState: 'No match with a score cataloged for this competition yet.',
    podiumTitle: 'Latest edition podium',
    podiumChampion: 'Reigning champion',
    thirdPlace: '3rd place',
    lastEdition: 'Latest cataloged edition: {year}',
    medalSilver: 'Silver medal illustration — not the official medal.',
    medalBronze: 'Bronze medal illustration — not the official medal.',
    podiumEmpty: 'No edition with a cataloged champion yet.',
    historyTitle: 'History',
    firstEdition: 'First edition',
    editionsCount: 'Cataloged editions',
    biggestChampion: 'Most successful club',
    longestStreak: 'Longest streak',
    statusVigente: 'Active',
    statusExtinta: 'Defunct since {year}',
    statusSemEdicao: 'No recent edition',
    aboutTitle: 'About the competition',
    historyEmpty: 'History in cataloging — no edition with a valid year in the archive.',
    metricsTitle: 'Archive numbers',
    metricsNote: 'Sum of editions with cataloged data — the rest of the archive is still coming.',
  },
  'es-es': {
    tabLabel: 'Puntos corridos',
    metricsTitleMatches: 'Números de los partidos',
    matchesUsed: 'Partidos con marcador',
    totalGoals: 'Goles',
    goalsPerMatch: 'Goles por partido',
    goallessDraws: 'Empates 0 a 0',
    recordsTitle: 'Récords',
    biggestWin: 'Mayor goleada',
    biggestDefeatNote: 'Mayor derrota: {club}',
    highestScoring: 'Partido con más goles',
    goalsInMatch: '{n} goles en el partido',
    roundLabel: 'Jornada',
    tableTitle: 'Tabla histórica de puntos corridos',
    tableScopeNote: 'Suma de todos los partidos con marcador del acervo.',
    colPlayed: 'PJ',
    colWins: 'G',
    colDraws: 'E',
    colLosses: 'P',
    colGoalsFor: 'GF',
    colGoalsAgainst: 'GC',
    colGoalDiff: 'DG',
    colPoints: 'Pts',
    championsTitle: 'Campeones por temporada',
    truncatedNote: 'La consulta se limitó a 20 mil partidos — la tabla puede estar incompleta.',
    emptyState: 'Todavía no hay partido con marcador catalogado para esta competición.',
    podiumTitle: 'Podio de la última edición',
    podiumChampion: 'Campeón vigente',
    thirdPlace: '3.er puesto',
    lastEdition: 'Última edición catalogada: {year}',
    medalSilver: 'Ilustración de medalla de plata — no es la medalla oficial.',
    medalBronze: 'Ilustración de medalla de bronce — no es la medalla oficial.',
    podiumEmpty: 'Todavía no hay ninguna edición con campeón catalogado.',
    historyTitle: 'Historia',
    firstEdition: 'Primera edición',
    editionsCount: 'Ediciones catalogadas',
    biggestChampion: 'Máximo ganador',
    longestStreak: 'Mayor racha',
    statusVigente: 'Vigente',
    statusExtinta: 'Desaparecida en {year}',
    statusSemEdicao: 'Sin edición reciente',
    aboutTitle: 'Sobre la competición',
    historyEmpty: 'Historia en catalogación — ninguna edición con año válido en el acervo.',
    metricsTitle: 'Números del acervo',
    metricsNote: 'Suma de las ediciones con dato catalogado — el resto del acervo todavía viene.',
  },
};

/** Interpolação `{key}` sobre strings do módulo (mesmo padrão de `mapText`). */
export function insText(text: string, params: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}
