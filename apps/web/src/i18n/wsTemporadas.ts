import type { Locale } from './config';

/**
 * TEMPORADAS — strings das rotas `/temporadas` e `/temporadas/[id]`.
 *
 * Módulo ADITIVO. Os rótulos de situação (planejada / em andamento / encerrada) moram aqui porque
 * o enum do banco (`PLANNED | ONGOING | FINISHED`) é código, não texto: imprimir o enum cru na
 * tela é o mesmo defeito que cravar a palavra em português.
 */
export interface TemporadasStrings {
  title: string;
  subtitle: string;
  colSeason: string;
  colStatus: string;
  colStart: string;
  colEnd: string;
  statusPlanned: string;
  statusOngoing: string;
  statusFinished: string;
  backToList: string;
  startDate: string;
  endDate: string;
  provenance: string;
  notFound: string;
}

export const temporadasStrings: Record<Locale, TemporadasStrings> = {
  'pt-br': {
    title: 'Temporadas',
    subtitle:
      'As temporadas do acervo. Uma temporada é o recorte que dá sentido ao resto: um título só existe dentro de uma, e comparar dois anos exige saber quando cada um começa e termina.',
    colSeason: 'Temporada',
    colStatus: 'Situação',
    colStart: 'Início',
    colEnd: 'Fim',
    statusPlanned: 'Planejada',
    statusOngoing: 'Em andamento',
    statusFinished: 'Encerrada',
    backToList: 'Todas as temporadas',
    startDate: 'Início',
    endDate: 'Fim',
    provenance:
      'Fonte: cadastro de temporadas do acervo. O nome segue o formato do calendário de cada competição — "2024" para ano civil, "2024-2025" para temporada que atravessa o ano.',
    notFound: 'Temporada não encontrada',
  },
  'en-us': {
    title: 'Seasons',
    subtitle:
      'The archive’s seasons. A season is the frame that gives the rest its meaning: a title only exists inside one, and comparing two years requires knowing when each begins and ends.',
    colSeason: 'Season',
    colStatus: 'Status',
    colStart: 'Start',
    colEnd: 'End',
    statusPlanned: 'Planned',
    statusOngoing: 'Ongoing',
    statusFinished: 'Finished',
    backToList: 'All seasons',
    startDate: 'Start',
    endDate: 'End',
    provenance:
      'Source: the archive’s season register. The name follows each competition’s calendar — "2024" for a calendar year, "2024-2025" for a season that crosses the year.',
    notFound: 'Season not found',
  },
  'es-es': {
    title: 'Temporadas',
    subtitle:
      'Las temporadas del archivo. Una temporada es el recorte que da sentido al resto: un título solo existe dentro de una, y comparar dos años exige saber cuándo empieza y termina cada uno.',
    colSeason: 'Temporada',
    colStatus: 'Situación',
    colStart: 'Inicio',
    colEnd: 'Fin',
    statusPlanned: 'Planificada',
    statusOngoing: 'En curso',
    statusFinished: 'Finalizada',
    backToList: 'Todas las temporadas',
    startDate: 'Inicio',
    endDate: 'Fin',
    provenance:
      'Fuente: registro de temporadas del archivo. El nombre sigue el calendario de cada competición — "2024" para año civil, "2024-2025" para la temporada que cruza el año.',
    notFound: 'Temporada no encontrada',
  },
};

/** `PLANNED | ONGOING | FINISHED` → rótulo no idioma. Desconhecido devolve o próprio código. */
export function rotuloDaSituacao(situacao: string, locale: Locale): string {
  const s = temporadasStrings[locale];
  switch (situacao) {
    case 'PLANNED':
      return s.statusPlanned;
    case 'ONGOING':
      return s.statusOngoing;
    case 'FINISHED':
      return s.statusFinished;
    default:
      return situacao;
  }
}
