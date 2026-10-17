import type { Locale } from './config';

/**
 * Legends (hall da fama) — strings da página /legends (módulo ADITIVO, como
 * manda a regra 4 do design system: não toca `Dictionary` global nem
 * `i18n/types.ts`, que outras sessões editam em paralelo).
 *
 * Honestidade do acervo: todo texto de "sem dado" DECLARA a lacuna — nunca
 * estima nem promete números que a fonte não traz.
 */
export interface LegendsStrings {
  nav: {
    /** Rótulo CURTO da barra superior. */
    short: string;
    /** Nome COMPLETO (painel mobile e title do link). */
    full: string;
  };
  hero: {
    title: string;
    subtitle: string;
    /** Nota de rodapé do bloco de proveniência. */
    provenance: string;
  };
  loadError: string;
  topChampions: {
    title: string;
    subtitle: string;
    barLabel: string;
    chartAria: string;
    titlesUnit: string;
    /** lastTitleYear null — a fonte não traz o ano da edição. */
    noYear: string;
    empty: string;
    source: string;
  };
  records: {
    title: string;
    subtitle: string;
    biggestWin: string;
    mostGoalsMatch: string;
    mostGoalsClubSeason: string;
    longestUnbeatenSeason: string;
    goals: string;
    goalDiff: string;
    matchesUnit: string;
    season: string;
    competition: string;
    date: string;
    source: string;
    empty: string;
  };
  leaders: {
    title: string;
    subtitle: string;
    caption: string;
    colCompetition: string;
    colLeader: string;
    colTitles: string;
    empty: string;
    source: string;
  };
}

export const wsLegendsStrings: Record<Locale, LegendsStrings> = {
  'pt-br': {
    nav: { short: 'Lendas', full: 'Lendas — Hall da Fama' },
    hero: {
      title: 'Lendas',
      subtitle:
        'O hall da fama do acervo: títulos auditáveis aresta a aresta e recordes medidos partida a partida, sempre com fonte.',
      provenance: 'Todo número desta página é agregado do acervo e declara a base considerada.',
    },
    loadError:
      'Não foi possível carregar o resumo do acervo agora. Tente novamente mais tarde — nada é exibido sem dado.',
    topChampions: {
      title: 'Maiores campeões',
      subtitle:
        'Clubes com mais títulos auditáveis no acervo (arestas WON do grafo de conhecimento).',
      barLabel: 'Títulos',
      chartAria: 'Gráfico de barras: clubes com mais títulos no acervo',
      titlesUnit: 'títulos',
      noYear: 'último ano não informado na fonte',
      empty:
        'O acervo ainda não tem títulos auditáveis suficientes para este ranking. A base cresce a cada ingestão com proveniência.',
      source: 'Fonte: grafo de conhecimento (arestas WON clube→competição)',
    },
    records: {
      title: 'Recordes',
      subtitle: 'A partir das partidas encerradas com placar no acervo — nada estimado.',
      biggestWin: 'Maior goleada',
      mostGoalsMatch: 'Partida com mais gols',
      mostGoalsClubSeason: 'Mais gols em uma temporada',
      longestUnbeatenSeason: 'Maior invencibilidade',
      goals: 'gols',
      goalDiff: 'de saldo',
      matchesUnit: 'jogos',
      season: 'Temporada',
      competition: 'Competição',
      date: 'Data',
      source: 'Fonte da partida',
      empty:
        'Ainda não há partidas com placar suficientes para apurar recordes. A base cresce a cada ingestão.',
    },
    leaders: {
      title: 'Líderes por competição',
      subtitle: 'Quem mais venceu em cada competição com títulos auditáveis.',
      caption: 'Competições com mais títulos no acervo e seus líderes',
      colCompetition: 'Competição',
      colLeader: 'Líder',
      colTitles: 'Títulos',
      empty:
        'Nenhuma competição com títulos auditáveis o suficiente para apontar um líder. A base cresce a cada ingestão.',
      source: 'Fonte: grafo de conhecimento (arestas WON clube→competição)',
    },
  },
  'en-us': {
    nav: { short: 'Legends', full: 'Legends — Hall of Fame' },
    hero: {
      title: 'Legends',
      subtitle:
        'The archive hall of fame: auditable titles, edge by edge, and records measured match by match — always sourced.',
      provenance: 'Every number on this page is aggregated from the archive and states its base.',
    },
    loadError:
      'Could not load the archive summary right now. Please try again later — nothing is shown without data.',
    topChampions: {
      title: 'Most decorated clubs',
      subtitle:
        'Clubs with the most auditable titles in the archive (WON edges from the knowledge graph).',
      barLabel: 'Titles',
      chartAria: 'Bar chart: clubs with the most titles in the archive',
      titlesUnit: 'titles',
      noYear: 'latest year not provided by the source',
      empty:
        'The archive does not yet have enough auditable titles for this ranking. The base grows with every sourced ingestion.',
      source: 'Source: knowledge graph (club→competition WON edges)',
    },
    records: {
      title: 'Records',
      subtitle: 'From finished matches with a score in the archive — nothing estimated.',
      biggestWin: 'Biggest win',
      mostGoalsMatch: 'Highest-scoring match',
      mostGoalsClubSeason: 'Most goals in a season',
      longestUnbeatenSeason: 'Longest unbeaten run',
      goals: 'goals',
      goalDiff: 'goal difference',
      matchesUnit: 'games',
      season: 'Season',
      competition: 'Competition',
      date: 'Date',
      source: 'Match source',
      empty:
        'There are not enough scored matches yet to settle records. The base grows with every ingestion.',
    },
    leaders: {
      title: 'Leaders by competition',
      subtitle: 'Who won the most in each competition with auditable titles.',
      caption: 'Competitions with the most titles in the archive and their leaders',
      colCompetition: 'Competition',
      colLeader: 'Leader',
      colTitles: 'Titles',
      empty:
        'No competition has enough auditable titles to name a leader yet. The base grows with every ingestion.',
      source: 'Source: knowledge graph (club→competition WON edges)',
    },
  },
  'es-es': {
    nav: { short: 'Leyendas', full: 'Leyendas — Salón de la Fama' },
    hero: {
      title: 'Leyendas',
      subtitle:
        'El salón de la fama del acervo: títulos auditables arista a arista y récords medidos partido a partido, siempre con fuente.',
      provenance: 'Cada número de esta página se agrega del acervo y declara su base.',
    },
    loadError:
      'No se pudo cargar el resumen del acervo ahora. Inténtalo más tarde — nada se muestra sin datos.',
    topChampions: {
      title: 'Máximos campeones',
      subtitle:
        'Clubes con más títulos auditables en el acervo (aristas WON del grafo de conocimiento).',
      barLabel: 'Títulos',
      chartAria: 'Gráfico de barras: clubes con más títulos en el acervo',
      titlesUnit: 'títulos',
      noYear: 'último año no informado por la fuente',
      empty:
        'El acervo aún no tiene títulos auditables suficientes para este ranking. La base crece con cada ingestión con procedencia.',
      source: 'Fuente: grafo de conocimiento (aristas WON club→competición)',
    },
    records: {
      title: 'Récords',
      subtitle: 'A partir de partidos finalizados con marcador en el acervo — nada estimado.',
      biggestWin: 'Mayor goleada',
      mostGoalsMatch: 'Partido con más goles',
      mostGoalsClubSeason: 'Más goles en una temporada',
      longestUnbeatenSeason: 'Mayor invicto',
      goals: 'goles',
      goalDiff: 'de diferencia',
      matchesUnit: 'partidos',
      season: 'Temporada',
      competition: 'Competición',
      date: 'Fecha',
      source: 'Fuente del partido',
      empty:
        'Todavía no hay partidos con marcador suficientes para calcular récords. La base crece con cada ingestión.',
    },
    leaders: {
      title: 'Líderes por competición',
      subtitle: 'Quién más ganó en cada competición con títulos auditables.',
      caption: 'Competiciones con más títulos en el acervo y sus líderes',
      colCompetition: 'Competición',
      colLeader: 'Líder',
      colTitles: 'Títulos',
      empty:
        'Ninguna competición tiene títulos auditables suficientes para señalar a un líder. La base crece con cada ingestión.',
      source: 'Fuente: grafo de conocimiento (aristas WON club→competición)',
    },
  },
};
