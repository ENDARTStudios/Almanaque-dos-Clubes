import type { Locale } from './config';

/**
 * /competitions/[id] no conceito FICHA — strings da composição (módulo ADITIVO).
 *
 * A página já tinha dicionário próprio (`pages.competitionProfile`) e o módulo de insights
 * (`wsCompetitionInsights`). Este arquivo NÃO os substitui: cobre só o que a composição nova
 * acrescenta — kicker do cabeçalho, âncora de rodadas/edições, subtítulo, rótulos da TABELA
 * DENSA, bloco de critérios e procedência. Os rótulos que já existiam continuam vindo de
 * `getDictionary`, para não haver duas traduções do mesmo texto.
 *
 * ── HONESTIDADE NAS STRINGS ────────────────────────────────────────────────────────────────
 * O quadro `design/concept/app/tabela.png` desenha "Últ. 5" e a legenda de zonas
 * (Champions/Europa/Rebaixamento). Nenhum dos dois existe no acervo: a tabela catalogada
 * (`CompetitionSeason.standings`) traz posição, jogos, V/E/D, gols e pontos — e a posição é a
 * publicada pela fonte, sem a regra de desempate. Nenhuma string promete o que a API não
 * entrega: forma, zonas e desempate viram LACUNA DECLARADA no bloco de critérios.
 */
export interface ConceitoCompeticaoStrings {
  head: {
    /** Primeira parte do kicker ("Competição · país"). */
    kicker: string;
    /** Rótulo do número-âncora quando há tabela catalogada. `{season}` = temporada. */
    anchorRounds: string;
    /** Rótulo do número-âncora quando só há edições catalogadas. */
    anchorEditions: string;
    /** Subtítulo quando há classificação catalogada. `{season}` = temporada mais recente. */
    subtitle: string;
    /** Subtítulo quando não há classificação catalogada. */
    subtitleNoTable: string;
    /** Título da ficha técnica (país, tipo, campeão atual, edições, QID). */
    infoTitle: string;
  };
  tables: {
    /** `{competition}` = nome. */
    captionEditions: string;
    /** `{competition}` = nome. */
    captionSeasonsSummary: string;
    /** `{competition}` `{season}`. */
    captionStandings: string;
    /** `{competition}` = nome. */
    captionHistory: string;
    columns: {
      position: string;
      club: string;
      played: string;
      won: string;
      drawn: string;
      lost: string;
      goalsFor: string;
      goalsAgainst: string;
      goalDifference: string;
      points: string;
      form: string;
    };
    /** Forma expandida para `abbr` — o cabeçalho de 9px é abreviado de propósito. */
    abbreviations: {
      position: string;
      club: string;
      played: string;
      won: string;
      drawn: string;
      lost: string;
      goalsFor: string;
      goalsAgainst: string;
      goalDifference: string;
      points: string;
      form: string;
    };
    /** Traço de lacuna declarada. */
    gap: string;
    /** `{competition}` = nome. */
    regionLabelStandings: string;
    regionLabelHistory: string;
    regionLabelEditions: string;
    regionLabelSeasons: string;
    /** SG não vem publicado: é calculado das colunas GP/GC. */
    goalDifferenceNote: string;
    /** A coluna de forma do desenho não existe na fonte. */
    formGap: string;
  };
  criteria: {
    title: string;
    /** Ordem publicada pela fonte (tabela catalogada). */
    sourceOrder: string;
    /** Ordem calculada das partidas (aba Pontuação). */
    derivedOrder: string;
    /** Zonas do desenho sem dado no acervo. */
    zonesGap: string;
  };
  provenance: {
    heading: string;
    standings: string;
    derived: string;
    gaps: string;
    error: string;
    noTable: string;
  };
  states: {
    noStandingsTitle: string;
    noStandingsBody: string;
  };
}

/** Substitui `{chave}` no texto — mesmo contrato dos outros módulos aditivos. */
export function fillCompeticao(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

export const conceitoCompeticaoStrings: Record<Locale, ConceitoCompeticaoStrings> = {
  'pt-br': {
    head: {
      kicker: 'Competição',
      anchorRounds: 'rodadas · {season}',
      anchorEditions: 'edições no acervo',
      subtitle:
        'Classificação catalogada de {season}, edições e maiores campeões. Critérios de desempate e zonas são declarados com a tabela, quando o acervo os tem.',
      subtitleNoTable:
        'Edições, clubes e maiores campeões. A classificação por temporada ainda não está catalogada — a lacuna é declarada, não estimada.',
      infoTitle: 'Ficha da competição',
    },
    tables: {
      captionEditions: 'Edições catalogadas de {competition} e o campeão de cada uma.',
      captionSeasonsSummary:
        'Resumo por temporada de {competition}: partidas, gols, artilheiro e terceiro colocado catalogados.',
      captionStandings:
        'Classificação de {competition} na temporada {season}, publicada pela fonte.',
      captionHistory:
        'Tabela de pontos corridos de {competition}, calculada a partir das partidas do acervo.',
      columns: {
        position: '#',
        club: 'Clube',
        played: 'J',
        won: 'V',
        drawn: 'E',
        lost: 'D',
        goalsFor: 'GP',
        goalsAgainst: 'GC',
        goalDifference: 'SG',
        points: 'Pts',
        form: 'Últ. 5',
      },
      abbreviations: {
        position: 'Posição',
        club: 'Clube',
        played: 'Jogos',
        won: 'Vitórias',
        drawn: 'Empates',
        lost: 'Derrotas',
        goalsFor: 'Gols pró',
        goalsAgainst: 'Gols contra',
        goalDifference: 'Saldo de gols',
        points: 'Pontos',
        form: 'Forma nos últimos 5 jogos',
      },
      gap: '—',
      regionLabelStandings: 'Classificação de {competition} na temporada {season}',
      regionLabelHistory: 'Tabela de pontos corridos de {competition}',
      regionLabelEditions: 'Edições de {competition}',
      regionLabelSeasons: 'Resumo por temporada de {competition}',
      goalDifferenceNote: 'SG = GP − GC, calculado a partir das colunas publicadas.',
      formGap: 'A fonte não publica a coluna de forma (últimos 5); a tabela termina em Pts.',
    },
    criteria: {
      title: 'Critérios de desempate e colunas',
      sourceOrder:
        'A ordem das linhas é a posição publicada pela fonte da competição. O acervo não cataloga os critérios de desempate do regulamento, então eles não são reproduzidos aqui: a posição é o dado, a regra é a lacuna.',
      derivedOrder:
        'Tabela calculada a partir das partidas do acervo: pontos → saldo de gols → gols pró. Vitória = 3 pontos.',
      zonesGap:
        'O acervo não tem as zonas de classificação (Champions, Europa, rebaixamento) por competição; por isso a legenda de zonas não é desenhada.',
    },
    provenance: {
      heading: 'Procedência',
      standings:
        'Classificação por temporada: tabela publicada pela fonte da competição; a fonte de cada temporada fica logo abaixo da tabela.',
      derived:
        'Aba Pontuação: tabela calculada das partidas do acervo, com a régua de pontos declarada acima dela.',
      gaps: 'Forma (últimos 5), zonas de classificação e critérios de desempate viram lacuna quando a fonte não os publica.',
      error: 'Quando a origem não responde, o dado aparece como —: lacuna declarada, nunca zero.',
      noTable:
        'Esta competição não tem classificação por temporada catalogada; a ausência é declarada, não estimada.',
    },
    states: {
      noStandingsTitle: 'Classificação em catalogação',
      noStandingsBody:
        'Esta competição está no acervo, mas a tabela por temporada ainda não foi catalogada. A ausência é declarada — nada é derivado das partidas nesta aba.',
    },
  },
  'en-us': {
    head: {
      kicker: 'Competition',
      anchorRounds: 'rounds · {season}',
      anchorEditions: 'editions in the archive',
      subtitle:
        'Catalogued {season} standings, editions and most successful clubs. Tiebreak criteria and zones are declared with the table when the archive has them.',
      subtitleNoTable:
        'Editions, clubs and most successful clubs. Season standings are not catalogued yet — the gap is declared, not estimated.',
      infoTitle: 'Competition details',
    },
    tables: {
      captionEditions: 'Catalogued editions of {competition} and their champion.',
      captionSeasonsSummary:
        'Season summary of {competition}: catalogued matches, goals, top scorer and third place.',
      captionStandings:
        'Standings of {competition} in the {season} season, published by the source.',
      captionHistory:
        'All-time points table of {competition}, calculated from the archive’s matches.',
      columns: {
        position: '#',
        club: 'Club',
        played: 'P',
        won: 'W',
        drawn: 'D',
        lost: 'L',
        goalsFor: 'GF',
        goalsAgainst: 'GA',
        goalDifference: 'GD',
        points: 'Pts',
        form: 'Last 5',
      },
      abbreviations: {
        position: 'Position',
        club: 'Club',
        played: 'Played',
        won: 'Wins',
        drawn: 'Draws',
        lost: 'Losses',
        goalsFor: 'Goals for',
        goalsAgainst: 'Goals against',
        goalDifference: 'Goal difference',
        points: 'Points',
        form: 'Form in the last 5 matches',
      },
      gap: '—',
      regionLabelStandings: 'Standings of {competition} in the {season} season',
      regionLabelHistory: 'All-time points table of {competition}',
      regionLabelEditions: 'Editions of {competition}',
      regionLabelSeasons: 'Season summary of {competition}',
      goalDifferenceNote: 'GD = GF − GA, calculated from the published columns.',
      formGap: 'The source does not publish a form column (last 5); the table ends at Pts.',
    },
    criteria: {
      title: 'Tiebreak criteria and columns',
      sourceOrder:
        'The row order is the position published by the competition’s source. The archive does not catalogue the regulation’s tiebreak criteria, so they are not reproduced here: the position is data, the rule is a gap.',
      derivedOrder:
        'Table calculated from the archive’s matches: points → goal difference → goals for. Win = 3 points.',
      zonesGap:
        'The archive has no qualification zones (Champions, Europa, relegation) per competition, so the zone legend is not drawn.',
    },
    provenance: {
      heading: 'Provenance',
      standings:
        "Season standings: table published by the competition's source; each season's source sits just below its table.",
      derived:
        'Points tab: table calculated from the archive’s matches, with the points rule declared above it.',
      gaps: 'Form (last 5), qualification zones and tiebreak criteria become declared gaps when the source does not publish them.',
      error: 'When the source does not answer, the value appears as —: a declared gap, never zero.',
      noTable:
        'This competition has no catalogued season standings; the absence is declared, not estimated.',
    },
    states: {
      noStandingsTitle: 'Standings being catalogued',
      noStandingsBody:
        'This competition is in the archive, but its season table has not been catalogued yet. The absence is declared — nothing is derived from matches in this tab.',
    },
  },
  'es-es': {
    head: {
      kicker: 'Competición',
      anchorRounds: 'jornadas · {season}',
      anchorEditions: 'ediciones en el archivo',
      subtitle:
        'Clasificación catalogada de {season}, ediciones y más campeones. Los criterios de desempate y las zonas se declaran con la tabla, cuando el archivo los tiene.',
      subtitleNoTable:
        'Ediciones, clubes y más campeones. La clasificación por temporada aún no está catalogada — la laguna se declara, no se estima.',
      infoTitle: 'Ficha de la competición',
    },
    tables: {
      captionEditions: 'Ediciones catalogadas de {competition} y su campeón.',
      captionSeasonsSummary:
        'Resumen por temporada de {competition}: partidos, goles, goleador y tercer puesto catalogados.',
      captionStandings:
        'Clasificación de {competition} en la temporada {season}, publicada por la fuente.',
      captionHistory:
        'Tabla histórica de puntos de {competition}, calculada a partir de los partidos del archivo.',
      columns: {
        position: '#',
        club: 'Club',
        played: 'PJ',
        won: 'G',
        drawn: 'E',
        lost: 'P',
        goalsFor: 'GF',
        goalsAgainst: 'GC',
        goalDifference: 'DG',
        points: 'Pts',
        form: 'Últ. 5',
      },
      abbreviations: {
        position: 'Posición',
        club: 'Club',
        played: 'Partidos jugados',
        won: 'Victorias',
        drawn: 'Empates',
        lost: 'Derrotas',
        goalsFor: 'Goles a favor',
        goalsAgainst: 'Goles en contra',
        goalDifference: 'Diferencia de goles',
        points: 'Puntos',
        form: 'Forma en los últimos 5 partidos',
      },
      gap: '—',
      regionLabelStandings: 'Clasificación de {competition} en la temporada {season}',
      regionLabelHistory: 'Tabla histórica de puntos de {competition}',
      regionLabelEditions: 'Ediciones de {competition}',
      regionLabelSeasons: 'Resumen por temporada de {competition}',
      goalDifferenceNote: 'DG = GF − GC, calculado a partir de las columnas publicadas.',
      formGap: 'La fuente no publica la columna de forma (últimos 5); la tabla termina en Pts.',
    },
    criteria: {
      title: 'Criterios de desempate y columnas',
      sourceOrder:
        'El orden de las filas es la posición publicada por la fuente de la competición. El archivo no cataloga los criterios de desempate del reglamento, por eso no se reproducen aquí: la posición es el dato, la regla es la laguna.',
      derivedOrder:
        'Tabla calculada a partir de los partidos del archivo: puntos → diferencia de goles → goles a favor. Victoria = 3 puntos.',
      zonesGap:
        'El archivo no tiene las zonas de clasificación (Champions, Europa, descenso) por competición; por eso la leyenda de zonas no se dibuja.',
    },
    provenance: {
      heading: 'Procedencia',
      standings:
        'Clasificación por temporada: tabla publicada por la fuente de la competición; la fuente de cada temporada queda justo bajo la tabla.',
      derived:
        'Pestaña Puntuación: tabla calculada de los partidos del archivo, con la regla de puntos declarada sobre ella.',
      gaps: 'Forma (últimos 5), zonas de clasificación y criterios de desempate se declaran como laguna cuando la fuente no los publica.',
      error: 'Cuando la fuente no responde, el dato aparece como —: laguna declarada, nunca cero.',
      noTable:
        'Esta competición no tiene clasificación por temporada catalogada; la ausencia se declara, no se estima.',
    },
    states: {
      noStandingsTitle: 'Clasificación en catalogación',
      noStandingsBody:
        'Esta competición está en el archivo, pero la tabla por temporada aún no se catalogó. La ausencia se declara — nada se deriva de los partidos en esta pestaña.',
    },
  },
};
