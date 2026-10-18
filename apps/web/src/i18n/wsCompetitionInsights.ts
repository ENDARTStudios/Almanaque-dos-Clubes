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
