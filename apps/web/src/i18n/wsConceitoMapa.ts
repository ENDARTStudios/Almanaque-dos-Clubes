import type { Locale } from './config';

/**
 * /map no conceito FICHA — copy da TELA DO MAPA (módulo ADITIVO, como wsConceitoRankings).
 *
 * ── O QUE ESTE MÓDULO NÃO COPIA DO DESENHO ────────────────────────────────────────────────────
 * O quadro do conceito finge um "coropleto · densidade do acervo" e traz números ilustrativos
 * ("12.017", "27 no Brasil", "463 clubes"). Nada disso entra: a âncora da ficha é o TOTAL REAL de
 * clubes do acervo (GET /clubs?limit=1 → total), e as listas de estados/cidades vêm de
 * GET /clubs/states e GET /clubs/cities, que contam a coluna do filtro público.
 *
 * O conceito também escreve "bandeira, estado e cidade em cada nível" como se houvesse bandeira de
 * estado. O acervo não usa bandeira de estado no Brasil (a UF identifica) — o texto declara isso
 * em vez de inventar uma imagem.
 *
 * ── O QUE CONTINUA FORA DAQUI ─────────────────────────────────────────────────────────────────
 *  · o título: o conceito batiza a tela "O futebol no mapa", e essa frase é copy nova, então mora
 *    aqui;
 *  · nome de PAÍS: é dado, resolvido pelo ICU pelo ISO2 (lib/country-flag) no idioma do usuário;
 *  · rótulos da lista de clubes, atribuição por camada e "sem localização": já existem traduzidos
 *    em wsMapPage e são reusados — duplicar criaria a segunda régua;
 *  · limitations: a lista é GERADA pela API e viaja como dado auditável; traduzir no cliente
 *    seria dizer algo diferente da fonte.
 */
export interface ConceitoMapaStrings {
  /** Título (h1) do quadro. */
  title: string;
  /** Primeira linha do subtítulo: escala do recorte. */
  kicker: string;
  /** Segunda linha: a régua (densidade do acervo, não população) e o que cada nível filtra. */
  subtitle: string;
  /** Rótulo do número-âncora. */
  anchorLabel: string;
  /** Rótulo acessível do grupo de filtros. */
  filtersLegend: string;
  advancedFilters: string;
  /** Rótulo acessível da coluna de índice (estados/cidades). */
  indexAria: string;
  countryLabel: string;
  stateLabel: string;
  cityLabel: string;
  allStates: string;
  allCities: string;
  /** Opção exibida quando o país ainda não tem índice de estados (lacuna declarada). */
  statesUnavailable: string;
  /** Opção exibida quando o estado não tem índice de cidades. */
  citiesUnavailable: string;
  /** "Estados · {n} · {country}" — n é totals.states do índice. */
  statesHeading: string;
  /** "463 clubes" — total do índice (clubes com estado). */
  statesAside: string;
  statesLoading: string;
  statesEmptyTitle: string;
  statesEmptyBody: string;
  statesError: string;
  /** "{n} clube(s) sem estado no acervo — lacuna declarada." */
  withoutStateGap: string;
  showAllStates: string;
  showFewerStates: string;
  /** "Cidades em {state} · {n}" */
  citiesHeadingState: string;
  /** "Cidades · {n} · {country}" (quando nenhum estado está selecionado). */
  citiesHeadingCountry: string;
  citiesAside: string;
  citiesLoading: string;
  citiesEmptyTitle: string;
  citiesEmptyBody: string;
  citiesError: string;
  /** "{n} clube(s) sem cidade no acervo — lacuna declarada." */
  withoutCityGap: string;
  showAllCities: string;
  showFewerCities: string;
  densityTitle: string;
  densityLess: string;
  densityMore: string;
  densityNote: string;
  /** Teto de clubes com coordenada que o mapa/lista carregam por país: "{n}". */
  pointsCapNote: string;
  /** Contagem quando há recorte: "{n}" no recorte e "{m}" no país com coordenada. */
  recorteCoordinates: string;
  /** Nota que separa as duas unidades de contagem (índice = acervo; mapa = coordenada). */
  archiveIndexNote: string;
  /** Variante da nota quando o recorte de gênero está ligado. */
  archiveIndexNoteWomen: string;
  mapTitle: string;
  /** Descrição do mapa para leitor de tela (a lista de clubes é o caminho principal). */
  mapAria: string;
  legendAria: string;
  /** Nota sob a lista de clubes quando o recorte de estado/cidade está ativo. */
  clubListFilterNote: string;
  /** Vazio da lista de clubes quando o recorte de estado/cidade não tem clube com coordenada. */
  clubFilterEmptyTitle: string;
  /** Por que a lista está vazia sem negar a existência de clubes no recorte. */
  clubFilterEmptyBody: string;
  /** Nota de lacuna do pé: país sem clube não aparece; estado é identificado pela UF. */
  gapNote: string;
  /** Proveniência do dado derivado (vai para o SourceNote, no pé). */
  sourceNote: string;
  /** Opção do seletor de país com contagem real: "{country} ({code}) · {n}". */
  countryOption: string;
  /** Opção do seletor de país ainda sem contagem: "{country} ({code})". */
  countryOptionNoCount: string;
  /** Opção do seletor de estado: "{uf} · {name} ({n})". */
  stateOption: string;
  /** Opção do seletor de cidade: "{name} ({n})". */
  cityOption: string;
  retry: string;
}

export const wsConceitoMapa: Record<Locale, ConceitoMapaStrings> = {
  'pt-br': {
    title: 'O futebol no mapa',
    kicker: 'Mapa-múndi · cobertura por país, estado e cidade',
    subtitle:
      'A intensidade é a densidade do acervo, não a população. Os filtros cruzam país, estado (UF) e cidade; o mapa plota apenas clubes com coordenada.',
    anchorLabel: 'clubes no acervo',
    filtersLegend: 'Filtros geográficos',
    advancedFilters: 'Filtros avançados',
    indexAria: 'Índice geográfico do acervo',
    countryLabel: 'País',
    stateLabel: 'Estado (UF)',
    cityLabel: 'Cidade',
    allStates: 'Todos os estados',
    allCities: 'Todas as cidades',
    statesUnavailable: 'Sem índice de estados',
    citiesUnavailable: 'Sem índice de cidades',
    statesHeading: 'Estados · {n} · {country}',
    statesAside: '{n} clubes',
    statesLoading: 'Carregando o índice de estados…',
    statesEmptyTitle: 'Nenhum estado com clube no acervo',
    statesEmptyBody:
      'O acervo não tem referência de estado para os clubes deste país — a lacuna é declarada, não preenchida com índice inventado.',
    statesError: 'Não foi possível carregar o índice de estados agora.',
    withoutStateGap: '{n} clube(s) sem estado no acervo — lacuna declarada.',
    showAllStates: 'Ver todos os {n} estados',
    showFewerStates: 'Ver menos',
    citiesHeadingState: 'Cidades em {state} · {n}',
    citiesHeadingCountry: 'Cidades · {n} · {country}',
    citiesAside: '{n} clubes',
    citiesLoading: 'Carregando o índice de cidades…',
    citiesEmptyTitle: 'Nenhuma cidade com clube neste recorte',
    citiesEmptyBody:
      'O acervo não tem cidade para os clubes deste recorte — a lacuna é declarada, não preenchida com lista inventada.',
    citiesError: 'Não foi possível carregar o índice de cidades agora.',
    withoutCityGap: '{n} clube(s) sem cidade no acervo — lacuna declarada.',
    showAllCities: 'Ver todas as {n} cidades',
    showFewerCities: 'Ver menos',
    densityTitle: 'Densidade do acervo',
    densityLess: 'menos',
    densityMore: 'mais',
    densityNote: 'As barras comparam a densidade do acervo, não a população.',
    pointsCapNote:
      'O mapa e a lista carregam no máximo {n} clubes com coordenada por país; o índice lateral não tem esse teto.',
    recorteCoordinates: '{n} no recorte · {m} no país com coordenada',
    archiveIndexNote:
      'A lista lateral conta o acervo inteiro (com ou sem coordenada); o mapa e a lista de clubes mostram só clubes com coordenada.',
    archiveIndexNoteWomen:
      'O recorte de gênero vale para o mapa e para a lista de clubes; o índice lateral conta o acervo inteiro.',
    mapTitle: 'Mapa · clubes com coordenada',
    mapAria:
      'Mapa acessório. A lista de clubes abaixo é o caminho principal; o mapa mostra só clubes com coordenada.',
    legendAria: 'Legenda de densidade do acervo',
    clubListFilterNote:
      'Aqui só entram clubes com coordenada; o índice lateral conta o acervo inteiro do recorte.',
    clubFilterEmptyTitle: 'Nenhum clube com coordenada neste recorte',
    clubFilterEmptyBody:
      'O índice lateral conta todos os clubes do recorte; só parte deles tem coordenada auditável — a lacuna é declarada, não preenchida.',
    gapNote:
      'País sem clube no acervo não aparece — lacuna declarada, não inventada. Bandeira de estado não é usada no Brasil: a UF identifica.',
    sourceNote:
      'Contagens derivadas do acervo pelas colunas de país, estado e cidade; coordenadas por Wikidata e OpenStreetMap.',
    countryOption: '{country} ({code}) · {n}',
    countryOptionNoCount: '{country} ({code})',
    stateOption: '{uf} · {name} ({n})',
    cityOption: '{name} ({n})',
    retry: 'Tentar de novo',
  },
  'en-us': {
    title: 'Football on the map',
    kicker: 'World map · coverage by country, state and city',
    subtitle:
      'Intensity is the density of the archive, not of the population. The filters cross country, state (UF) and city; the map plots only clubs with a coordinate.',
    anchorLabel: 'clubs in the archive',
    filtersLegend: 'Geographic filters',
    advancedFilters: 'Advanced filters',
    indexAria: 'Geographic index of the archive',
    countryLabel: 'Country',
    stateLabel: 'State (UF)',
    cityLabel: 'City',
    allStates: 'All states',
    allCities: 'All cities',
    statesUnavailable: 'No state index',
    citiesUnavailable: 'No city index',
    statesHeading: 'States · {n} · {country}',
    statesAside: '{n} clubs',
    statesLoading: 'Loading the state index…',
    statesEmptyTitle: 'No state with a club in the archive',
    statesEmptyBody:
      'The archive has no state reference for the clubs of this country — the gap is declared, not filled with an invented index.',
    statesError: 'The state index could not be loaded right now.',
    withoutStateGap: '{n} club(s) without a state in the archive — declared gap.',
    showAllStates: 'Show all {n} states',
    showFewerStates: 'Show fewer',
    citiesHeadingState: 'Cities in {state} · {n}',
    citiesHeadingCountry: 'Cities · {n} · {country}',
    citiesAside: '{n} clubs',
    citiesLoading: 'Loading the city index…',
    citiesEmptyTitle: 'No city with a club in this cut',
    citiesEmptyBody:
      'The archive has no city for the clubs in this cut — the gap is declared, not filled with an invented list.',
    citiesError: 'The city index could not be loaded right now.',
    withoutCityGap: '{n} club(s) without a city in the archive — declared gap.',
    showAllCities: 'Show all {n} cities',
    showFewerCities: 'Show fewer',
    densityTitle: 'Archive density',
    densityLess: 'less',
    densityMore: 'more',
    densityNote: 'Bars compare the density of the archive, not the population.',
    pointsCapNote:
      'The map and the club list load at most {n} clubs with coordinates per country; the side index has no such cap.',
    recorteCoordinates: '{n} in this cut · {m} with coordinates in the country',
    archiveIndexNote:
      'The side list counts the whole archive (with or without coordinates); the map and the club list show only clubs with coordinates.',
    archiveIndexNoteWomen:
      'The gender cut applies to the map and the club list; the side index counts the whole archive.',
    mapTitle: 'Map · clubs with coordinates',
    mapAria:
      'Accessory map. The club list below is the main path; the map shows only clubs with a coordinate.',
    legendAria: 'Archive density legend',
    clubListFilterNote:
      'Only clubs with coordinates are listed here; the side index counts the whole archive in this cut.',
    clubFilterEmptyTitle: 'No club with coordinates in this cut',
    clubFilterEmptyBody:
      'The side index counts every club in this cut; only part of them has an auditable coordinate — the gap is declared, not filled.',
    gapNote:
      'A country with no club in the archive does not appear — the gap is declared, not invented. State flags are not used in Brazil: the UF identifies the state.',
    sourceNote:
      'Counts derived from the archive by country, state and city columns; coordinates from Wikidata and OpenStreetMap.',
    countryOption: '{country} ({code}) · {n}',
    countryOptionNoCount: '{country} ({code})',
    stateOption: '{uf} · {name} ({n})',
    cityOption: '{name} ({n})',
    retry: 'Try again',
  },
  'es-es': {
    title: 'El fútbol en el mapa',
    kicker: 'Mapa mundial · cobertura por país, estado y ciudad',
    subtitle:
      'La intensidad es la densidad del acervo, no la población. Los filtros cruzan país, estado (UF) y ciudad; el mapa traza solo clubes con coordenada.',
    anchorLabel: 'clubes en el acervo',
    filtersLegend: 'Filtros geográficos',
    advancedFilters: 'Filtros avanzados',
    indexAria: 'Índice geográfico del acervo',
    countryLabel: 'País',
    stateLabel: 'Estado (UF)',
    cityLabel: 'Ciudad',
    allStates: 'Todos los estados',
    allCities: 'Todas las ciudades',
    statesUnavailable: 'Sin índice de estados',
    citiesUnavailable: 'Sin índice de ciudades',
    statesHeading: 'Estados · {n} · {country}',
    statesAside: '{n} clubes',
    statesLoading: 'Cargando el índice de estados…',
    statesEmptyTitle: 'Ningún estado con club en el acervo',
    statesEmptyBody:
      'El acervo no tiene referencia de estado para los clubes de este país — la laguna se declara, no se rellena con un índice inventado.',
    statesError: 'No se pudo cargar el índice de estados ahora.',
    withoutStateGap: '{n} club(es) sin estado en el acervo — laguna declarada.',
    showAllStates: 'Ver todos los {n} estados',
    showFewerStates: 'Ver menos',
    citiesHeadingState: 'Ciudades en {state} · {n}',
    citiesHeadingCountry: 'Ciudades · {n} · {country}',
    citiesAside: '{n} clubes',
    citiesLoading: 'Cargando el índice de ciudades…',
    citiesEmptyTitle: 'Ninguna ciudad con club en este recorte',
    citiesEmptyBody:
      'El acervo no tiene ciudad para los clubes de este recorte — la laguna se declara, no se rellena con una lista inventada.',
    citiesError: 'No se pudo cargar el índice de ciudades ahora.',
    withoutCityGap: '{n} club(es) sin ciudad en el acervo — laguna declarada.',
    showAllCities: 'Ver todas las {n} ciudades',
    showFewerCities: 'Ver menos',
    densityTitle: 'Densidad del acervo',
    densityLess: 'menos',
    densityMore: 'más',
    densityNote: 'Las barras comparan la densidad del acervo, no la población.',
    pointsCapNote:
      'El mapa y la lista cargan como máximo {n} clubes con coordenada por país; el índice lateral no tiene ese tope.',
    recorteCoordinates: '{n} en el recorte · {m} con coordenada en el país',
    archiveIndexNote:
      'La lista lateral cuenta el acervo entero (con o sin coordenada); el mapa y la lista de clubes muestran solo clubes con coordenada.',
    archiveIndexNoteWomen:
      'El recorte de género vale para el mapa y para la lista de clubes; el índice lateral cuenta el acervo entero.',
    mapTitle: 'Mapa · clubes con coordenada',
    mapAria:
      'Mapa accesorio. La lista de clubes de abajo es el camino principal; el mapa muestra solo clubes con coordenada.',
    legendAria: 'Leyenda de densidad del acervo',
    clubListFilterNote:
      'Aquí solo entran clubes con coordenada; el índice lateral cuenta el acervo entero del recorte.',
    clubFilterEmptyTitle: 'Ningún club con coordenada en este recorte',
    clubFilterEmptyBody:
      'El índice lateral cuenta todos los clubes del recorte; solo parte de ellos tiene coordenada auditable — la laguna se declara, no se rellena.',
    gapNote:
      'Un país sin club en el acervo no aparece — la laguna se declara, no se inventa. No se usan banderas de estado en Brasil: la UF identifica.',
    sourceNote:
      'Recuentos derivados del acervo por las columnas de país, estado y ciudad; coordenadas de Wikidata y OpenStreetMap.',
    countryOption: '{country} ({code}) · {n}',
    countryOptionNoCount: '{country} ({code})',
    stateOption: '{uf} · {name} ({n})',
    cityOption: '{name} ({n})',
    retry: 'Reintentar',
  },
};
