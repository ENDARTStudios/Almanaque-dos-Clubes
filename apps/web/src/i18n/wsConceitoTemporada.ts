import type { Locale } from './config';

/**
 * /temporadas/[id] no conceito FICHA — strings da composição (módulo ADITIVO).
 *
 * A página existente já tinha dicionário próprio (`wsTemporadas.ts`): situação, rótulos de
 * data, nome da rota e a proveniência do cadastro. Este módulo NÃO o substitui — ele cobre só o
 * que a composição nova acrescenta (faixa de métricas, tabelas de competições e classificação,
 * gráficos, linha do tempo e procedência). Os rótulos de situação continuam vindo de
 * `rotuloDaSituacao`, para não existirem duas traduções do mesmo enum.
 *
 * ── HONESTIDADE NAS STRINGS ────────────────────────────────────────────────────────────────
 * Nenhuma string promete dado que a API não publica. Público (sem dado por partida) não tem
 * rótulo de métrica; "últimos 5" não tem coluna; "—" é lacuna declarada, nunca zero. As notas
 * dizem de onde vem cada número e o que é derivado das partidas.
 */
export interface ConceitoTemporadaStrings {
  /** h1 — `{season}` = nome da temporada no acervo ("2024-25"). */
  title: string;
  subtitle: {
    /** `{n}` = competições com partidas na temporada. */
    competitionsOne: string;
    competitionsMany: string;
  };
  anchor: {
    roundOne: string;
    roundsMany: string;
  };
  actions: {
    /** CTA preservado: lista de partidas filtrada por temporada. */
    viewMatches: string;
  };
  metrics: {
    heading: string;
    matches: string;
    goals: string;
    average: string;
    averageNote: string;
    goalless: string;
    biggestWin: string;
    /** `{homeScore}` `{awayScore}` = placar da maior goleada. */
    score: string;
    /** Sem nenhum placar na temporada, os agregados não são calculados. */
    noScoresNote: string;
  };
  competitions: {
    heading: string;
    /** `{season}` = nome da temporada. */
    caption: string;
    columns: {
      competition: string;
      champion: string;
      points: string;
      played: string;
      topScorer: string;
    };
    /** `{name}` `{goals}` = artilheiro catalogado. */
    topScorer: string;
    /** Campeão veio da pontuação das partidas, não do resumo catalogado. */
    derivedChampionNote: string;
  };
  standings: {
    /** `{competition}` = nome da competição. */
    heading: string;
    /** `{competition}` `{season}`. */
    caption: string;
    columns: {
      position: string;
      club: string;
      played: string;
      won: string;
      drawn: string;
      lost: string;
      goalDifference: string;
      points: string;
    };
    /** `{shown}` `{total}` = clubes exibidos e total da tabela. */
    rowsAside: string;
    viewFullTable: string;
    viewMatches: string;
    officialNote: string;
    derivedNote: string;
  };
  charts: {
    heading: string;
    /** `{competition}` = competição da série. */
    goalsByRound: string;
    /** `{competition}` `{goals}` `{rounds}` `{bestRound}` `{best}`. */
    goalsByRoundSummary: string;
    /** `{average}` = média de gols por partida. */
    averagePerMatch: string;
    results: string;
    /** `{home}` `{draws}` `{away}` `{total}`. */
    resultsSummary: string;
    homeWin: string;
    draw: string;
    awayWin: string;
  };
  timeline: {
    heading: string;
    opening: string;
    biggestWin: string;
    highestScoring: string;
    closing: string;
    /** `{home}` `{homeScore}` `{away}` `{awayScore}`. */
    scoreFact: string;
    /** `{home}` `{away}` — partida sem placar na fonte. */
    matchFact: string;
  };
  provenance: {
    heading: string;
    season: string;
    /** `{scored}` `{total}` = partidas com placar e partidas catalogadas. */
    counts: string;
    noAttendance: string;
    /** `{fetched}` `{total}` = paginação incompleta. */
    partial: string;
    gap: string;
  };
  states: {
    noMatchesTitle: string;
    noMatchesBody: string;
    errorTitle: string;
    errorBody: string;
    retry: string;
  };
}

/** Substitui `{chave}` no texto — mantém o mesmo contrato dos outros módulos aditivos. */
export function fillTemporada(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

export const conceitoTemporadaStrings: Record<Locale, ConceitoTemporadaStrings> = {
  'pt-br': {
    title: 'Temporada {season}',
    subtitle: {
      competitionsOne: '{n} competição',
      competitionsMany: '{n} competições',
    },
    anchor: {
      roundOne: 'rodada',
      roundsMany: 'rodadas',
    },
    actions: {
      viewMatches: 'Ver as partidas da temporada',
    },
    metrics: {
      heading: 'Números da temporada',
      matches: 'Partidas',
      goals: 'Gols',
      average: 'Média',
      averageNote: 'por partida',
      goalless: '0 a 0',
      biggestWin: 'Maior goleada',
      score: '{homeScore} × {awayScore}',
      noScoresNote:
        'O acervo não tem placar das partidas desta temporada — gols, média, 0 a 0 e maior goleada ficam como lacuna declarada.',
    },
    competitions: {
      heading: 'Competições nesta temporada',
      caption:
        'Competições com partidas na temporada {season}, com campeão e artilheiro catalogados',
      columns: {
        competition: 'Competição',
        champion: 'Campeão',
        points: 'Pts',
        played: 'J',
        topScorer: 'Artilheiro',
      },
      topScorer: '{name} · {goals}',
      derivedChampionNote:
        'Campeão por pontos das partidas do acervo quando o resumo da competição não está catalogado. Vitória = 3 pontos.',
    },
    standings: {
      heading: '{competition} · classificação final',
      caption: 'Classificação de {competition} na temporada {season}',
      columns: {
        position: '#',
        club: 'Clube',
        played: 'J',
        won: 'V',
        drawn: 'E',
        lost: 'D',
        goalDifference: 'SG',
        points: 'Pts',
      },
      rowsAside: '{shown} de {total} clubes',
      viewFullTable: 'ver tabela completa →',
      viewMatches: 'ver as partidas →',
      officialNote: 'A classificação final usa a tabela publicada pela fonte da competição.',
      derivedNote:
        'Classificação calculada a partir das partidas do acervo (vitória = 3 pontos) — pode diferir da tabela oficial quando falta partida na fonte.',
    },
    charts: {
      heading: 'A temporada em gráficos',
      goalsByRound: 'Gols por rodada · {competition}',
      goalsByRoundSummary:
        '{competition}: {goals} gols em {rounds} rodadas; a rodada {bestRound} teve o máximo, com {best}.',
      averagePerMatch: 'média de {average} por jogo',
      results: 'Resultados',
      resultsSummary:
        '{home} vitórias em casa, {draws} empates e {away} vitórias fora em {total} partidas com placar.',
      homeWin: 'Vitória em casa',
      draw: 'Empate',
      awayWin: 'Vitória fora',
    },
    timeline: {
      heading: 'A temporada em ordem',
      opening: 'Abertura',
      biggestWin: 'Maior goleada',
      highestScoring: 'Jogo com mais gols',
      closing: 'Encerramento',
      scoreFact: '{home} {homeScore} × {awayScore} {away}',
      matchFact: '{home} × {away}',
    },
    provenance: {
      heading: 'Procedência',
      season: 'Temporada montada pela data da partida. Competição sem edição no ano não aparece.',
      counts:
        'Números calculados a partir de {scored} partidas com placar das {total} catalogadas.',
      noAttendance:
        'O acervo não publica público por partida; por isso o bloco de público não é desenhado.',
      partial:
        'A consulta devolveu {fetched} das {total} partidas da temporada; os números somam as partidas recebidas.',
      gap: 'Quando a origem não responde, o dado aparece como —: lacuna declarada, nunca zero.',
    },
    states: {
      noMatchesTitle: 'Sem partidas catalogadas',
      noMatchesBody:
        'Esta temporada existe no acervo, mas ainda não tem partidas com competição e placar vinculadas a ela.',
      errorTitle: 'Não foi possível consultar as partidas',
      errorBody:
        'A temporada foi encontrada, mas a consulta das partidas falhou. Os números não são exibidos para não parecerem zero.',
      retry: 'Tentar de novo',
    },
  },
  'en-us': {
    title: 'Season {season}',
    subtitle: {
      competitionsOne: '{n} competition',
      competitionsMany: '{n} competitions',
    },
    anchor: {
      roundOne: 'round',
      roundsMany: 'rounds',
    },
    actions: {
      viewMatches: 'View the season’s matches',
    },
    metrics: {
      heading: 'Season numbers',
      matches: 'Matches',
      goals: 'Goals',
      average: 'Average',
      averageNote: 'per match',
      goalless: '0-0',
      biggestWin: 'Biggest win',
      score: '{homeScore} × {awayScore}',
      noScoresNote:
        'The archive has no scores for this season’s matches — goals, average, 0-0 and biggest win are declared gaps.',
    },
    competitions: {
      heading: 'Competitions in this season',
      caption:
        'Competitions with matches in the {season} season, with cataloged champion and top scorer',
      columns: {
        competition: 'Competition',
        champion: 'Champion',
        points: 'Pts',
        played: 'P',
        topScorer: 'Top scorer',
      },
      topScorer: '{name} · {goals}',
      derivedChampionNote:
        'Champion by points from the archive’s matches when the competition summary is not cataloged. Win = 3 points.',
    },
    standings: {
      heading: '{competition} · final standings',
      caption: 'Standings of {competition} in the {season} season',
      columns: {
        position: '#',
        club: 'Club',
        played: 'P',
        won: 'W',
        drawn: 'D',
        lost: 'L',
        goalDifference: 'GD',
        points: 'Pts',
      },
      rowsAside: '{shown} of {total} clubs',
      viewFullTable: 'see the full table →',
      viewMatches: 'see the matches →',
      officialNote: 'The final standings use the table published by the competition’s source.',
      derivedNote:
        'Standings calculated from the archive’s matches (win = 3 points) — may differ from the official table when a match is missing from the source.',
    },
    charts: {
      heading: 'The season in charts',
      goalsByRound: 'Goals by round · {competition}',
      goalsByRoundSummary:
        '{competition}: {goals} goals in {rounds} rounds; round {bestRound} had the most, with {best}.',
      averagePerMatch: 'average of {average} per match',
      results: 'Results',
      resultsSummary:
        '{home} home wins, {draws} draws and {away} away wins in {total} matches with a score.',
      homeWin: 'Home win',
      draw: 'Draw',
      awayWin: 'Away win',
    },
    timeline: {
      heading: 'The season in order',
      opening: 'Opening',
      biggestWin: 'Biggest win',
      highestScoring: 'Highest-scoring match',
      closing: 'Closing',
      scoreFact: '{home} {homeScore} × {awayScore} {away}',
      matchFact: '{home} × {away}',
    },
    provenance: {
      heading: 'Provenance',
      season:
        'Season assembled from match dates. A competition with no edition in the year does not appear.',
      counts: 'Numbers calculated from {scored} matches with a score out of {total} cataloged.',
      noAttendance:
        'The archive does not publish attendance per match, so the attendance block is not drawn.',
      partial:
        'The query returned {fetched} of the {total} matches in the season; the numbers sum the matches received.',
      gap: 'When the source does not answer, the value appears as —: a declared gap, never zero.',
    },
    states: {
      noMatchesTitle: 'No matches cataloged',
      noMatchesBody:
        'This season exists in the archive but has no matches with competition and score linked to it yet.',
      errorTitle: 'Could not query the matches',
      errorBody:
        'The season was found, but the match query failed. Numbers are not shown so they cannot be mistaken for zero.',
      retry: 'Try again',
    },
  },
  'es-es': {
    title: 'Temporada {season}',
    subtitle: {
      competitionsOne: '{n} competición',
      competitionsMany: '{n} competiciones',
    },
    anchor: {
      roundOne: 'jornada',
      roundsMany: 'jornadas',
    },
    actions: {
      viewMatches: 'Ver los partidos de la temporada',
    },
    metrics: {
      heading: 'Números de la temporada',
      matches: 'Partidos',
      goals: 'Goles',
      average: 'Media',
      averageNote: 'por partido',
      goalless: '0-0',
      biggestWin: 'Mayor goleada',
      score: '{homeScore} × {awayScore}',
      noScoresNote:
        'El archivo no tiene resultado de los partidos de esta temporada — goles, media, 0-0 y mayor goleada quedan como laguna declarada.',
    },
    competitions: {
      heading: 'Competiciones en esta temporada',
      caption:
        'Competiciones con partidos en la temporada {season}, con campeón y goleador catalogados',
      columns: {
        competition: 'Competición',
        champion: 'Campeón',
        points: 'Pts',
        played: 'PJ',
        topScorer: 'Goleador',
      },
      topScorer: '{name} · {goals}',
      derivedChampionNote:
        'Campeón por puntos de los partidos del archivo cuando el resumen de la competición no está catalogado. Victoria = 3 puntos.',
    },
    standings: {
      heading: '{competition} · clasificación final',
      caption: 'Clasificación de {competition} en la temporada {season}',
      columns: {
        position: '#',
        club: 'Club',
        played: 'PJ',
        won: 'G',
        drawn: 'E',
        lost: 'P',
        goalDifference: 'DG',
        points: 'Pts',
      },
      rowsAside: '{shown} de {total} clubes',
      viewFullTable: 'ver la tabla completa →',
      viewMatches: 'ver los partidos →',
      officialNote:
        'La clasificación final usa la tabla publicada por la fuente de la competición.',
      derivedNote:
        'Clasificación calculada a partir de los partidos del archivo (victoria = 3 puntos) — puede diferir de la tabla oficial cuando falta un partido en la fuente.',
    },
    charts: {
      heading: 'La temporada en gráficos',
      goalsByRound: 'Goles por jornada · {competition}',
      goalsByRoundSummary:
        '{competition}: {goals} goles en {rounds} jornadas; la jornada {bestRound} tuvo el máximo, con {best}.',
      averagePerMatch: 'media de {average} por partido',
      results: 'Resultados',
      resultsSummary:
        '{home} victorias en casa, {draws} empates y {away} victorias fuera en {total} partidos con resultado.',
      homeWin: 'Victoria en casa',
      draw: 'Empate',
      awayWin: 'Victoria fuera',
    },
    timeline: {
      heading: 'La temporada en orden',
      opening: 'Apertura',
      biggestWin: 'Mayor goleada',
      highestScoring: 'Partido con más goles',
      closing: 'Cierre',
      scoreFact: '{home} {homeScore} × {awayScore} {away}',
      matchFact: '{home} × {away}',
    },
    provenance: {
      heading: 'Procedencia',
      season:
        'Temporada montada con la fecha del partido. La competición sin edición en el año no aparece.',
      counts:
        'Números calculados a partir de {scored} partidos con resultado de los {total} catalogados.',
      noAttendance:
        'El archivo no publica público por partido; por eso el bloque de público no se dibuja.',
      partial:
        'La consulta devolvió {fetched} de los {total} partidos de la temporada; los números suman los partidos recibidos.',
      gap: 'Cuando la fuente no responde, el dato aparece como —: laguna declarada, nunca cero.',
    },
    states: {
      noMatchesTitle: 'Sin partidos catalogados',
      noMatchesBody:
        'Esta temporada existe en el archivo, pero aún no tiene partidos con competición y resultado vinculados.',
      errorTitle: 'No se pudieron consultar los partidos',
      errorBody:
        'La temporada se encontró, pero la consulta de partidos falló. Los números no se muestran para no parecer cero.',
      retry: 'Intentar de nuevo',
    },
  },
};
