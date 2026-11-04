import type { Locale } from './config';

/**
 * Copy adicional de /matches no conceito FICHA (o texto-base continua em wsT541.ts: título,
 * filtros e estados já existiam e são reutilizados). Este módulo só acrescenta o que o quadro
 * pede e o dicionário antigo não tinha: rótulo do número-âncora, kicker, chips de filtro ativo,
 * a caixa de estatística da página e as notas de lacuna.
 */
export interface ConceitoPartidasStrings {
  anchorLabel: string;
  /** Linha de contexto fundida ao subtítulo. */
  kicker: string;
  subtitle: string;
  activeLabel: string;
  clearAll: string;
  /** Cabeçalho do bloco de resultados. */
  resultsTitle: string;
  /** Nome acessível do link que abre a ficha da partida. */
  open: string;
  statsTitle: string;
  stats: {
    matches: string;
    goals: string;
    average: string;
    biggest: string;
  };
  /** Declara o recorte dos agregados (só a página carregada). */
  statsNote: string;
  /** Declara por que não há colunas de posse/finalizações/escanteios. */
  noShotStats: string;
  provenance: string;
}

export const wsConceitoPartidas: Record<Locale, ConceitoPartidasStrings> = {
  'pt-br': {
    anchorLabel: 'partidas catalogadas',
    kicker: 'Acervo · filtro por competição, temporada e período',
    subtitle: 'Resultados do acervo, com placar e a fonte de cada partida.',
    activeLabel: 'Filtros ativos',
    clearAll: 'limpar tudo',
    resultsTitle: 'Resultados',
    open: 'ver partida',
    statsTitle: 'Estatística desta página',
    stats: {
      matches: 'Partidas com placar',
      goals: 'Gols',
      average: 'Média por jogo',
      biggest: 'Maior goleada',
    },
    statsNote: 'Calculado apenas com as partidas com placar desta página — não do recorte inteiro.',
    noShotStats:
      'A API pública não publica posse, finalizações ou escanteios por partida; por isso essas colunas não existem aqui.',
    provenance:
      'Partida sem placar entra na lista mas não nos agregados: ausência não é 0×0. Cada ficha declara a fonte.',
  },
  'en-us': {
    anchorLabel: 'matches catalogued',
    kicker: 'Archive · filter by competition, season and period',
    subtitle: 'Archive results with the score and the source of every match.',
    activeLabel: 'Active filters',
    clearAll: 'clear all',
    resultsTitle: 'Results',
    open: 'view match',
    statsTitle: 'Statistics of this page',
    stats: {
      matches: 'Matches with a score',
      goals: 'Goals',
      average: 'Goals per match',
      biggest: 'Biggest win',
    },
    statsNote: 'Computed only from the scored matches on this page — not from the whole selection.',
    noShotStats:
      'The public API does not publish possession, shots or corners per match; those columns do not exist here.',
    provenance:
      'A match without a score appears in the list but not in the aggregates: absence is not 0×0. Every record declares its source.',
  },
  'es-es': {
    anchorLabel: 'partidos catalogados',
    kicker: 'Acervo · filtro por competición, temporada y período',
    subtitle: 'Resultados del acervo, con marcador y la fuente de cada partido.',
    activeLabel: 'Filtros activos',
    clearAll: 'limpiar todo',
    resultsTitle: 'Resultados',
    open: 'ver partido',
    statsTitle: 'Estadística de esta página',
    stats: {
      matches: 'Partidos con marcador',
      goals: 'Goles',
      average: 'Media por partido',
      biggest: 'Mayor goleada',
    },
    statsNote:
      'Calculado solo con los partidos con marcador de esta página — no del recorte completo.',
    noShotStats:
      'La API pública no publica posesión, remates ni córners por partido; por eso esas columnas no existen aquí.',
    provenance:
      'Un partido sin marcador aparece en la lista pero no en los agregados: ausencia no es 0×0. Cada ficha declara su fuente.',
  },
};
