import type { Locale } from './config';

/**
 * Copy adicional de /compare no conceito FICHA (os rótulos de métrica continuam no dicionário,
 * em dict.pages.compare). Este módulo acrescenta o cabeçalho, a nota de escopo do comparador e
 * os títulos dos blocos que o desenho pede.
 */
export interface ConceitoCompararStrings {
  kicker: string;
  subtitle: string;
  anchorLabel: string;
  removeA: string;
  removeB: string;
  entityClub: string;
  entityPlayer: string;
  country: string;
  birthYear: string;
  titlesOfficial: string;
  founded: string;
  rankingPoints: string;
  stadiumCapacity: string;
  titlesByReach: string;
  distributionTitle: string;
  chartsTitle: string;
  noMatchData: string;
  provenance: string;
  radarToggle: string;
  playerNote: string;
}

export const wsConceitoComparar: Record<Locale, ConceitoCompararStrings> = {
  'pt-br': {
    kicker: 'Comparação · clube ou jogador',
    subtitle:
      'Duas entidades na mesma linha de base — comparar é ler na horizontal, com gráfico ao lado.',
    anchorLabel: 'tipos de entidade',
    removeA: 'Remover entidade A',
    removeB: 'Remover entidade B',
    entityClub: 'clube',
    entityPlayer: 'jogador',
    country: 'País',
    birthYear: 'Ano de nascimento',
    titlesOfficial: 'Títulos oficiais',
    founded: 'Fundação',
    rankingPoints: 'Pontuação no ranking',
    stadiumCapacity: 'Capacidade do estádio',
    titlesByReach: 'Títulos por alcance',
    distributionTitle: 'Distribuição dos títulos',
    chartsTitle: 'Comparação em gráfico',
    noMatchData:
      'O comparador da API não publica partidas, gols ou sócios; essas linhas não existem em vez de virarem zero.',
    provenance:
      'As duas colunas vêm da mesma fonte: comparar números de origens diferentes é comparar réguas diferentes. “—” é lacuna declarada, nunca zero.',
    radarToggle: 'Ver radar de visão geral (leitura secundária)',
    playerNote:
      'Métricas de carreira (gols, assistências, títulos) dependem do ETL de estatísticas — não inventadas.',
  },
  'en-us': {
    kicker: 'Comparison · club or player',
    subtitle:
      'Two entities on the same baseline — comparing is reading horizontally, with a chart alongside.',
    anchorLabel: 'entity types',
    removeA: 'Remove entity A',
    removeB: 'Remove entity B',
    entityClub: 'club',
    entityPlayer: 'player',
    country: 'Country',
    birthYear: 'Birth year',
    titlesOfficial: 'Official titles',
    founded: 'Founded',
    rankingPoints: 'Ranking points',
    stadiumCapacity: 'Stadium capacity',
    titlesByReach: 'Titles by reach',
    distributionTitle: 'Title distribution',
    chartsTitle: 'Comparison in charts',
    noMatchData:
      'The API comparator does not publish matches, goals or members; those rows do not exist instead of becoming zero.',
    provenance:
      'Both columns come from the same source: comparing numbers from different sources is comparing different rules. “—” is a declared gap, never zero.',
    radarToggle: 'Show overview radar (secondary reading)',
    playerNote:
      'Career metrics (goals, assists, titles) depend on the statistics ETL — not invented.',
  },
  'es-es': {
    kicker: 'Comparación · club o jugador',
    subtitle:
      'Dos entidades en la misma línea base — comparar es leer en horizontal, con gráfico al lado.',
    anchorLabel: 'tipos de entidad',
    removeA: 'Quitar entidad A',
    removeB: 'Quitar entidad B',
    entityClub: 'club',
    entityPlayer: 'jugador',
    country: 'País',
    birthYear: 'Año de nacimiento',
    titlesOfficial: 'Títulos oficiales',
    founded: 'Fundación',
    rankingPoints: 'Puntuación en el ranking',
    stadiumCapacity: 'Capacidad del estadio',
    titlesByReach: 'Títulos por alcance',
    distributionTitle: 'Distribución de los títulos',
    chartsTitle: 'Comparación en gráficos',
    noMatchData:
      'El comparador de la API no publica partidos, goles ni socios; esas filas no existen en vez de convertirse en cero.',
    provenance:
      'Las dos columnas vienen de la misma fuente: comparar números de orígenes distintos es comparar reglas distintas. “—” es una laguna declarada, nunca cero.',
    radarToggle: 'Ver radar de visión general (lectura secundaria)',
    playerNote:
      'Las métricas de carrera (goles, asistencias, títulos) dependen del ETL de estadísticas — no inventadas.',
  },
};
