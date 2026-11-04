import type { Locale } from './config';

/** Copy de /matches/[id] no conceito FICHA. Módulo aditivo; nenhum texto literal no JSX. */
export interface ConceitoPartidaStrings {
  backToMatches: string;
  round: string;
  goalsTitle: string;
  goalsGap: string;
  lineupsTitle: string;
  lineupsGap: string;
  sheetTitle: string;
  sheetCompetition: string;
  sheetRound: string;
  sheetVenue: string;
  sheetStatus: string;
  sheetSource: string;
  provenance: string;
  noShotStats: string;
  homeFallback: string;
  awayFallback: string;
}

export const wsConceitoPartida: Record<Locale, ConceitoPartidaStrings> = {
  'pt-br': {
    backToMatches: 'Todas as partidas',
    round: 'Rodada',
    goalsTitle: 'Gols',
    goalsGap:
      'A fonte desta partida não publica os autores dos gols — a lacuna é declarada, não preenchida.',
    lineupsTitle: 'Escalações',
    lineupsGap: 'A API pública não publica escalações; por isso a coluna não existe.',
    sheetTitle: 'Ficha',
    sheetCompetition: 'Competição',
    sheetRound: 'Rodada',
    sheetVenue: 'Estádio / local',
    sheetStatus: 'Status',
    sheetSource: 'Fonte',
    provenance:
      'Resultado e ficha vêm da fonte declarada por partida. Quando a fonte não publica um campo, a ficha mostra “—”.',
    noShotStats:
      'Posse, finalizações e escanteios não são publicados por partida; essas colunas não existem.',
    homeFallback: 'Mandante',
    awayFallback: 'Visitante',
  },
  'en-us': {
    backToMatches: 'All matches',
    round: 'Round',
    goalsTitle: 'Goals',
    goalsGap:
      'The source of this match does not publish the scorers — the gap is declared, not filled.',
    lineupsTitle: 'Line-ups',
    lineupsGap: 'The public API does not publish line-ups; the column does not exist.',
    sheetTitle: 'Sheet',
    sheetCompetition: 'Competition',
    sheetRound: 'Round',
    sheetVenue: 'Stadium / venue',
    sheetStatus: 'Status',
    sheetSource: 'Source',
    provenance:
      'Result and sheet come from the source declared for each match. When the source does not publish a field, the sheet shows “—”.',
    noShotStats:
      'Possession, shots and corners are not published per match; those columns do not exist.',
    homeFallback: 'Home',
    awayFallback: 'Away',
  },
  'es-es': {
    backToMatches: 'Todos los partidos',
    round: 'Jornada',
    goalsTitle: 'Goles',
    goalsGap:
      'La fuente de este partido no publica los autores de los goles — la laguna se declara, no se rellena.',
    lineupsTitle: 'Alineaciones',
    lineupsGap: 'La API pública no publica alineaciones; por eso la columna no existe.',
    sheetTitle: 'Ficha',
    sheetCompetition: 'Competición',
    sheetRound: 'Jornada',
    sheetVenue: 'Estadio / sede',
    sheetStatus: 'Estado',
    sheetSource: 'Fuente',
    provenance:
      'El resultado y la ficha proceden de la fuente declarada por partido. Cuando la fuente no publica un campo, la ficha muestra “—”.',
    noShotStats:
      'Posesión, remates y córners no se publican por partido; esas columnas no existen.',
    homeFallback: 'Local',
    awayFallback: 'Visitante',
  },
};
