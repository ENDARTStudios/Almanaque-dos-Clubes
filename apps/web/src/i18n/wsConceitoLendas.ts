import type { Locale } from './config';

/**
 * /legends no conceito FICHA — strings do panteão escuro.
 *
 * Módulo ADITIVO (regra 4 do design system): não toca `Dictionary`, `i18n/types.ts`
 * nem `wsLegends.ts`, que outras sessões editam em paralelo. A navbar continua lendo
 * o rótulo curto de `wsLegends`; este arquivo é só da composição visual da página.
 *
 * Honestidade do acervo: o conceito desenha "maiores jogadores" (Pelé, Maradona…), mas
 * `GET /legends` não entrega jogadores — entrega clubes campeões, líderes por competição
 * e recordes de partidas. Nenhuma string aqui promete dados que a API não publica.
 */
export interface ConceitoLendasStrings {
  /** Rótulo curto acima do título — o "kicker" do quadro, em caixa baixa e espaçado. */
  kicker: string;
  title: string;
  subtitle: string;
  metrics: {
    /** Nome acessível da faixa de números. */
    label: string;
    players: string;
    clubs: string;
    titles: string;
    competitions: string;
    countries: string;
  };
  champions: {
    heading: string;
    /** Nome acessível da lista de cartões. */
    listLabel: string;
    titlesUnit: string;
    lastTitleLabel: string;
  };
  leaders: {
    heading: string;
    listLabel: string;
    leaderLabel: string;
    titlesUnit: string;
    lastTitleLabel: string;
  };
  chart: {
    /** "Títulos por clube no acervo" — gráfico de barras horizontais do top real. */
    title: string;
    /** "{club}" e "{titles}" são substituídos pelo líder e pela contagem. */
    summary: string;
  };
  records: {
    heading: string;
    listLabel: string;
    biggestWin: string;
    mostGoalsMatch: string;
    mostGoalsClubSeason: string;
    longestUnbeatenSeason: string;
    goalsUnit: string;
    matchesUnit: string;
    marginUnit: string;
    seasonLabel: string;
    /** Rótulo visível do link para a fonte da partida. */
    sourceLabel: string;
  };
  provenance: {
    lead: string;
    /** `{date}` é substituído pela data de geração do resumo. */
    generated: string;
    /** `{count}` = `titlesCounted` (arestas WON contabilizadas). */
    titles: string;
    /** `{count}` = competições com títulos auditáveis. */
    leaders: string;
    /** `{count}` = partidas encerradas com placar. */
    records: string;
    /** Origem das contagens de jogadores/clubes/países da faixa de métricas. */
    counts: string;
    /** Explica o "—" das métricas sem origem. */
    gap: string;
  };
  states: {
    loadErrorTitle: string;
    loadErrorBody: string;
    retry: string;
    emptyTitle: string;
    emptyBody: string;
  };
}

/** Substitui `{chave}` no texto — mantém a concordância e o separador de milhar por idioma. */
export function fillLendas(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

export const conceitoLendasStrings: Record<Locale, ConceitoLendasStrings> = {
  'pt-br': {
    kicker: 'Panteão · clubes e competições',
    title: 'Lendas e Imortais',
    subtitle:
      'Os maiores clubes do acervo e os líderes de cada competição, com os recordes medidos partida a partida — cada feito com a fonte ao lado.',
    metrics: {
      label: 'Números do acervo',
      players: 'Jogadores',
      clubs: 'Clubes',
      titles: 'Títulos',
      competitions: 'Competições',
      countries: 'Países',
    },
    chart: {
      title: 'Títulos por clube no acervo',
      summary: '{club} lidera, com {titles} títulos.',
    },
    champions: {
      heading: 'Maiores campeões',
      listLabel: 'Clubes com mais títulos auditáveis no acervo',
      titlesUnit: 'títulos',
      lastTitleLabel: 'último título',
    },
    leaders: {
      heading: 'Líderes por competição',
      listLabel: 'Quem mais venceu em cada competição com títulos auditáveis',
      leaderLabel: 'Líder',
      titlesUnit: 'títulos',
      lastTitleLabel: 'último título',
    },
    records: {
      heading: 'Recordes',
      listLabel: 'Recordes apurados a partir das partidas encerradas com placar',
      biggestWin: 'Maior goleada',
      mostGoalsMatch: 'Partida com mais gols',
      mostGoalsClubSeason: 'Mais gols em uma temporada',
      longestUnbeatenSeason: 'Maior invencibilidade',
      goalsUnit: 'gols',
      matchesUnit: 'jogos',
      marginUnit: 'gols de saldo',
      seasonLabel: 'Temporada',
      sourceLabel: 'Fonte da partida',
    },
    provenance: {
      lead: 'Cada número traz a fonte que o comprova — feito sem procedência não entra no panteão.',
      generated: 'Resumo gerado em {date}.',
      titles: 'Títulos: {count} arestas WON clube→competição no grafo de conhecimento.',
      leaders: 'Líderes eleitos entre {count} competições com títulos auditáveis.',
      records: 'Recordes apurados em {count} partidas encerradas com placar.',
      counts: 'Jogadores, clubes e países: contagens diretas do acervo.',
      gap: 'Quando a origem não responde, o número aparece como —: lacuna declarada, nunca zero.',
    },
    states: {
      loadErrorTitle: 'Resumo do panteão indisponível',
      loadErrorBody:
        'Não foi possível carregar o resumo do acervo agora. Tente novamente mais tarde — nada é exibido sem dado.',
      retry: 'Tentar de novo',
      emptyTitle: 'Panteão sem dados suficientes',
      emptyBody:
        'O acervo ainda não tem títulos auditáveis nem partidas com placar suficientes para este panteão. A base cresce a cada ingestão com procedência.',
    },
  },
  'en-us': {
    kicker: 'Pantheon · clubs and competitions',
    title: 'Legends and Immortals',
    subtitle:
      "The archive's most decorated clubs and the leader of each competition, with records measured match by match — every feat with its source alongside.",
    metrics: {
      label: 'Archive numbers',
      players: 'Players',
      clubs: 'Clubs',
      titles: 'Titles',
      competitions: 'Competitions',
      countries: 'Countries',
    },
    chart: {
      title: 'Titles per club in the archive',
      summary: '{club} leads with {titles} titles.',
    },
    champions: {
      heading: 'Most decorated clubs',
      listLabel: 'Clubs with the most auditable titles in the archive',
      titlesUnit: 'titles',
      lastTitleLabel: 'latest title',
    },
    leaders: {
      heading: 'Leaders by competition',
      listLabel: 'Who won the most in each competition with auditable titles',
      leaderLabel: 'Leader',
      titlesUnit: 'titles',
      lastTitleLabel: 'latest title',
    },
    records: {
      heading: 'Records',
      listLabel: 'Records settled from finished matches with a score',
      biggestWin: 'Biggest win',
      mostGoalsMatch: 'Highest-scoring match',
      mostGoalsClubSeason: 'Most goals in a season',
      longestUnbeatenSeason: 'Longest unbeaten run',
      goalsUnit: 'goals',
      matchesUnit: 'matches',
      marginUnit: 'goal margin',
      seasonLabel: 'Season',
      sourceLabel: 'Match source',
    },
    provenance: {
      lead: 'Every number carries the source that proves it — a feat without provenance does not enter the pantheon.',
      generated: 'Summary generated on {date}.',
      titles: 'Titles: {count} WON club→competition edges in the knowledge graph.',
      leaders: 'Leaders elected among {count} competitions with auditable titles.',
      records: 'Records settled from {count} finished matches with a score.',
      counts: 'Players, clubs and countries: direct counts from the archive.',
      gap: 'When the source does not answer, the number appears as —: a declared gap, never zero.',
    },
    states: {
      loadErrorTitle: 'Pantheon summary unavailable',
      loadErrorBody:
        'Could not load the archive summary right now. Please try again later — nothing is shown without data.',
      retry: 'Try again',
      emptyTitle: 'Not enough data for the pantheon',
      emptyBody:
        'The archive does not yet have enough auditable titles or scored matches for this pantheon. The base grows with every sourced ingestion.',
    },
  },
  'es-es': {
    kicker: 'Panteón · clubes y competiciones',
    title: 'Leyendas e Inmortales',
    subtitle:
      'Los clubes más laureados del acervo y el líder de cada competición, con los récords medidos partido a partido — cada hazaña con su fuente al lado.',
    metrics: {
      label: 'Números del acervo',
      players: 'Jugadores',
      clubs: 'Clubes',
      titles: 'Títulos',
      competitions: 'Competiciones',
      countries: 'Países',
    },
    chart: {
      title: 'Títulos por club en el acervo',
      summary: '{club} lidera, con {titles} títulos.',
    },
    champions: {
      heading: 'Máximos campeones',
      listLabel: 'Clubes con más títulos auditables en el acervo',
      titlesUnit: 'títulos',
      lastTitleLabel: 'último título',
    },
    leaders: {
      heading: 'Líderes por competición',
      listLabel: 'Quién más ganó en cada competición con títulos auditables',
      leaderLabel: 'Líder',
      titlesUnit: 'títulos',
      lastTitleLabel: 'último título',
    },
    records: {
      heading: 'Récords',
      listLabel: 'Récords calculados a partir de partidos finalizados con marcador',
      biggestWin: 'Mayor goleada',
      mostGoalsMatch: 'Partido con más goles',
      mostGoalsClubSeason: 'Más goles en una temporada',
      longestUnbeatenSeason: 'Mayor invicto',
      goalsUnit: 'goles',
      matchesUnit: 'partidos',
      marginUnit: 'goles de diferencia',
      seasonLabel: 'Temporada',
      sourceLabel: 'Fuente del partido',
    },
    provenance: {
      lead: 'Cada número lleva la fuente que lo prueba — una hazaña sin procedencia no entra en el panteón.',
      generated: 'Resumen generado el {date}.',
      titles: 'Títulos: {count} aristas WON club→competición en el grafo de conocimiento.',
      leaders: 'Líderes elegidos entre {count} competiciones con títulos auditables.',
      records: 'Récords calculados en {count} partidos finalizados con marcador.',
      counts: 'Jugadores, clubes y países: recuentos directos del acervo.',
      gap: 'Cuando la fuente no responde, el número aparece como —: laguna declarada, nunca cero.',
    },
    states: {
      loadErrorTitle: 'Resumen del panteón no disponible',
      loadErrorBody:
        'No se pudo cargar el resumen del acervo ahora. Inténtalo más tarde — nada se muestra sin datos.',
      retry: 'Intentar de nuevo',
      emptyTitle: 'Panteón sin datos suficientes',
      emptyBody:
        'El acervo aún no tiene títulos auditables ni partidos con marcador suficientes para este panteón. La base crece con cada ingestión con procedencia.',
    },
  },
};
