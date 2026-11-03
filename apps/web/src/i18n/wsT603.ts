/** T603 — strings de /admin/bots (sistema de bots). */
export interface WsT603Strings {
  title: string;
  subtitle: string;
  loading: string;
  error: string;
  colBot: string;
  colDomain: string;
  colCadence: string;
  colLast: string;
  runNow: string;
  running: string;
  never: string;
  delta: string;
  noDelta: string;
}

export const wsT603Strings: Record<'pt-br' | 'en-us' | 'es-es', WsT603Strings> = {
  'pt-br': {
    title: 'Sistema de bots',
    subtitle:
      'Cada bot cobre um domínio do acervo (competição, clubes, jogadores, rankings, mapas, partidas, lendas, catálogo, mídia). O delta mostra quanto a última rodada acrescentou — "rodou" e "rendeu" são coisas diferentes.',
    loading: 'Carregando…',
    error: 'Não foi possível carregar os bots.',
    colBot: 'Bot',
    colDomain: 'Domínio',
    colCadence: 'Cadência',
    colLast: 'Última rodada',
    runNow: 'Rodar agora',
    running: 'Rodando…',
    never: 'nunca rodou',
    delta: 'delta',
    noDelta: 'sem métrica',
  },
  'en-us': {
    title: 'Bot system',
    subtitle:
      'Each bot covers one archive domain (competitions, clubs, players, rankings, maps, matches, legends, catalogue, media). The delta shows what the last run actually added — "ran" and "delivered" are different things.',
    loading: 'Loading…',
    error: 'Could not load the bots.',
    colBot: 'Bot',
    colDomain: 'Domain',
    colCadence: 'Cadence',
    colLast: 'Last run',
    runNow: 'Run now',
    running: 'Running…',
    never: 'never ran',
    delta: 'delta',
    noDelta: 'no metric',
  },
  'es-es': {
    title: 'Sistema de bots',
    subtitle:
      'Cada bot cubre un dominio del acervo (competiciones, clubes, jugadores, rankings, mapas, partidos, leyendas, catálogo, medios). El delta muestra cuánto agregó la última ejecución: "ejecutó" y "aportó" son cosas distintas.',
    loading: 'Cargando…',
    error: 'No se pudieron cargar los bots.',
    colBot: 'Bot',
    colDomain: 'Dominio',
    colCadence: 'Cadencia',
    colLast: 'Última ejecución',
    runNow: 'Ejecutar ahora',
    running: 'Ejecutando…',
    never: 'nunca ejecutó',
    delta: 'delta',
    noDelta: 'sin métrica',
  },
};
