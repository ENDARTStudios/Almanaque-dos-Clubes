import type { Locale } from './config';

/**
 * Copy da página /rankings no conceito FICHA (índice de rankings).
 *
 * Módulo ADITIVO (o padrão do repo: wsC12, wsFicha, wsConceitoCompeticoes…): a página importa
 * daqui em vez de acrescentar chaves ao dicionário global, compartilhado por 50 telas. Nenhum
 * texto visível fica literal no JSX — os três idiomas vivem no mesmo objeto.
 *
 * ── O QUE ESTE MÓDULO NÃO COPIA DO DESENHO ────────────────────────────────────────────────────
 * O quadro do conceito traz colunas "Var." e "Últ. 5" (variação e forma). A API pública
 * `/rankings/entries` NÃO devolve nenhum dos dois: devolve posição, pontos, clube/jogador,
 * país, base de partidas e base de títulos. Em vez de inventar a variação, a tabela mostra a
 * BASE AUDITÁVEL que o endpoint entrega — o número de partidas que sustenta a nota. As colunas
 * "Títulos" e "Base auditável" são, portanto, dado real; "Var." e "Últ. 5" ficam de fora.
 *
 * A frase do critério também é a NOSSA régua, não a do desenho (o desenho ilustra pesos
 * "mundial 3 · continental 2 · nacional 1"; a régua publicada pela API é 5 · 4 · 3 · 2 · 1, com
 * títulos ×50 — ver docs/RANKING-ALGORITHM.md). Número ilustrativo de desenho nunca entra aqui.
 */
export interface ConceitoRankingsStrings {
  title: string;
  /** Kicker fundido ao subtítulo: "Ranking · temporada {season}". */
  kicker: string;
  /** Variante do kicker quando a API não informa temporada publicada. */
  kickerPlain: string;
  /** Frase do critério que fecha o subtítulo. */
  subtitle: string;
  /** Rótulo do número-âncora à direita. */
  anchorLabel: string;
  filtersTitle: string;
  filterYear: string;
  filterType: string;
  filterCompetition: string;
  filterGender: string;
  filterCountry: string;
  searchClub: string;
  search: string;
  clear: string;
  all: string;
  typeClubs: string;
  typePlayers: string;
  men: string;
  women: string;
  viewDivision: string;
  viewPyramid: string;
  pyramidDisclaimer: string;
  colPosition: string;
  colClub: string;
  colCountry: string;
  colPoints: string;
  colTitles: string;
  colBase: string;
  colDivision: string;
  colLevel: string;
  colMultiplier: string;
  tableCaption: string;
  tableCaptionPyramid: string;
  loadMore: string;
  loading: string;
  emptyTitle: string;
  emptyBody: string;
  /** Nome do ranking publicado que a tabela está mostrando: "Recorte: {name}". */
  currentRanking: string;
  /** Lacuna declarada nas células sem dado. */
  gap: string;
  criteriaTitle: string;
  criteriaBody: string;
  criteriaLink: string;
  provenanceLead: string;
  provenanceBody: string;
  provenanceLink: string;
}

export const wsConceitoRankings: Record<Locale, ConceitoRankingsStrings> = {
  'pt-br': {
    title: 'Rankings',
    kicker: 'Ranking · temporada {season}',
    kickerPlain: 'Ranking · pontuação 0–100',
    subtitle:
      'A nota de 0 a 100 pondera vitórias, empates e títulos pelo alcance da competição. Cada linha declara a base de partidas e títulos que sustenta o número.',
    anchorLabel: 'edições publicadas',
    filtersTitle: 'Filtros',
    filterYear: 'Ano',
    filterType: 'Ranking de',
    filterCompetition: 'Competição',
    filterGender: 'Gênero',
    filterCountry: 'País',
    searchClub: 'Buscar clube',
    search: 'Buscar',
    clear: 'Limpar filtros',
    all: 'Todos',
    typeClubs: 'Clubes',
    typePlayers: 'Jogadores',
    men: 'Masculino',
    women: 'Feminino',
    viewDivision: 'Por divisão',
    viewPyramid: 'Pirâmide nacional',
    pyramidDisclaimer:
      'Estimativa metodológica, não confronto oficial. Rankings por divisão permanecem ativos e auditáveis.',
    colPosition: '#',
    colClub: 'Clube',
    colCountry: 'País',
    colPoints: 'Pts',
    colTitles: 'Títulos',
    colBase: 'Base auditável',
    colDivision: 'Divisão',
    colLevel: 'Nível',
    colMultiplier: 'Mult.',
    tableCaption:
      'Rankings 0–100 por clube: posição, clube, país, pontos, títulos e partidas da base auditável.',
    tableCaptionPyramid:
      'Pirâmide nacional: posição, clube, país, pontos, divisão, nível e multiplicador.',
    loadMore: 'Carregar mais',
    loading: 'Carregando…',
    emptyTitle: 'Nenhum ranking publicado para este recorte.',
    emptyBody:
      'Os filtros atuais não encontram uma edição publicada. Ajuste o ano, o tipo ou o país para ver outro recorte do acervo.',
    currentRanking: 'Recorte: {name}',
    gap: '—',
    criteriaTitle: 'Como a pontuação é calculada',
    criteriaBody:
      'A nota de 0 a 100 normaliza o desempenho do clube no recorte: vitórias (×3) e empates (×1) ponderados pelo alcance da competição — mundial 5 · continental 4 · nacional 3 · estadual 2 · municipal 1 — mais títulos (×50). Só entra na tabela o clube-ano com ao menos 1 título ou 5 partidas na base; abaixo disso a posição não é publicada.',
    criteriaLink: 'Ver metodologia',
    provenanceLead: 'Piloto Inglaterra · Fonte RSSSF',
    provenanceBody:
      'Baseado nas tabelas finais das ligas inglesas (RSSSF); a base de partidas e títulos de cada linha é a que o acervo tem registrada. Neste piloto a fonte não registra títulos — a coluna Títulos reflete a base, não a história do clube. A pontuação é recalculada a cada rodada e o histórico é auditável por temporada.',
    provenanceLink: 'Ver metodologia',
  },
  'en-us': {
    title: 'Rankings',
    kicker: 'Ranking · {season} season',
    kickerPlain: 'Ranking · 0–100 score',
    subtitle:
      'The 0–100 score weighs wins, draws and titles by the reach of the competition. Every row declares the match and title base behind the number.',
    anchorLabel: 'published editions',
    filtersTitle: 'Filters',
    filterYear: 'Year',
    filterType: 'Ranking of',
    filterCompetition: 'Competition',
    filterGender: 'Gender',
    filterCountry: 'Country',
    searchClub: 'Search club',
    search: 'Search',
    clear: 'Clear filters',
    all: 'All',
    typeClubs: 'Clubs',
    typePlayers: 'Players',
    men: 'Men',
    women: 'Women',
    viewDivision: 'By division',
    viewPyramid: 'National pyramid',
    pyramidDisclaimer:
      'Methodological estimate, not an official head-to-head. Division rankings remain active and auditable.',
    colPosition: '#',
    colClub: 'Club',
    colCountry: 'Country',
    colPoints: 'Pts',
    colTitles: 'Titles',
    colBase: 'Auditable base',
    colDivision: 'Division',
    colLevel: 'Level',
    colMultiplier: 'Mult.',
    tableCaption:
      '0–100 club rankings: position, club, country, points, titles and matches in the auditable base.',
    tableCaptionPyramid:
      'National pyramid: position, club, country, points, division, level and multiplier.',
    loadMore: 'Load more',
    loading: 'Loading…',
    emptyTitle: 'No published ranking for this selection.',
    emptyBody:
      'The current filters find no published edition. Change the year, type or country to see another slice of the archive.',
    currentRanking: 'Selection: {name}',
    gap: '—',
    criteriaTitle: 'How the score is calculated',
    criteriaBody:
      'The 0–100 score normalises the club’s performance in the selection: wins (×3) and draws (×1) weighted by the reach of the competition — world 5 · continental 4 · national 3 · state 2 · municipal 1 — plus titles (×50). A club-season enters the table only with at least 1 title or 5 matches in the base; below that, no position is published.',
    criteriaLink: 'See methodology',
    provenanceLead: 'England pilot · RSSSF source',
    provenanceBody:
      'Based on the final tables of the English leagues (RSSSF); the match and title base of each row is what the archive records. In this pilot the source does not record titles — the Titles column reflects the base, not the club’s history. The score is recalculated every round and the history is auditable by season.',
    provenanceLink: 'See methodology',
  },
  'es-es': {
    title: 'Rankings',
    kicker: 'Ranking · temporada {season}',
    kickerPlain: 'Ranking · puntuación 0–100',
    subtitle:
      'La nota de 0 a 100 pondera victorias, empates y títulos por el alcance de la competición. Cada fila declara la base de partidos y títulos que sostiene el número.',
    anchorLabel: 'ediciones publicadas',
    filtersTitle: 'Filtros',
    filterYear: 'Año',
    filterType: 'Ranking de',
    filterCompetition: 'Competición',
    filterGender: 'Género',
    filterCountry: 'País',
    searchClub: 'Buscar club',
    search: 'Buscar',
    clear: 'Limpiar filtros',
    all: 'Todos',
    typeClubs: 'Clubes',
    typePlayers: 'Jugadores',
    men: 'Masculino',
    women: 'Femenino',
    viewDivision: 'Por división',
    viewPyramid: 'Pirámide nacional',
    pyramidDisclaimer:
      'Estimación metodológica, no un enfrentamiento oficial. Los rankings por división siguen activos y auditables.',
    colPosition: '#',
    colClub: 'Club',
    colCountry: 'País',
    colPoints: 'Pts',
    colTitles: 'Títulos',
    colBase: 'Base auditable',
    colDivision: 'División',
    colLevel: 'Nivel',
    colMultiplier: 'Mult.',
    tableCaption:
      'Rankings 0–100 por club: posición, club, país, puntos, títulos y partidos de la base auditable.',
    tableCaptionPyramid:
      'Pirámide nacional: posición, club, país, puntos, división, nivel y multiplicador.',
    loadMore: 'Cargar más',
    loading: 'Cargando…',
    emptyTitle: 'Ningún ranking publicado para este recorte.',
    emptyBody:
      'Los filtros actuales no encuentran una edición publicada. Ajusta el año, el tipo o el país para ver otro recorte del acervo.',
    currentRanking: 'Recorte: {name}',
    gap: '—',
    criteriaTitle: 'Cómo se calcula la puntuación',
    criteriaBody:
      'La nota de 0 a 100 normaliza el rendimiento del club en el recorte: victorias (×3) y empates (×1) ponderados por el alcance de la competición — mundial 5 · continental 4 · nacional 3 · estatal 2 · municipal 1 — más títulos (×50). Solo entra en la tabla el club-temporada con al menos 1 título o 5 partidos en la base; por debajo, la posición no se publica.',
    criteriaLink: 'Ver metodología',
    provenanceLead: 'Piloto Inglaterra · Fuente RSSSF',
    provenanceBody:
      'Basado en las tablas finales de las ligas inglesas (RSSSF); la base de partidos y títulos de cada fila es la que el acervo tiene registrada. En este piloto la fuente no registra títulos — la columna Títulos refleja la base, no la historia del club. La puntuación se recalcula en cada jornada y el historial es auditable por temporada.',
    provenanceLink: 'Ver metodología',
  },
};
