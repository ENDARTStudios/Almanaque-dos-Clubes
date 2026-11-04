import type { Locale } from './config';

/**
 * Copy da página /competitions no conceito FICHA.
 *
 * Módulo ADITIVO (o padrão do repo: wsC12, wsFicha, wsT603…): a página importa daqui em vez de
 * acrescentar chaves ao dicionário global, que é compartilhado por 50 telas. Texto visível não
 * fica literal no JSX — os três idiomas vivem no mesmo objeto.
 */
export interface ConceitoCompeticoesStrings {
  /** Linha de contexto que o cabeçalho funde com o subtítulo (o "kicker" do conceito). */
  kicker: string;
  /** Frase de abertura da ficha. */
  subtitle: string;
  /** Rótulo do número-âncora à direita. */
  anchorLabel: string;
  filtersTitle: string;
  /** Rótulo do filtro de país (o dicionário global diz "País (ISO)", que é detalhe de API). */
  country: string;
  all: string;
  allCountries: string;
  /** "{n}" — summary do disclosure com a lista completa de países. */
  seeAllCountries: string;
  otherCountry: string;
  men: string;
  women: string;
  /** Prefixo do chip de busca ativa: "Busca: {q}". */
  searchPrefix: string;
  clear: string;
  highlightsTitle: string;
  tier: { mundial: string; continental: string; nacional: string };
  /** "{editions} edições no acervo". */
  editionsLine: string;
  podiumTitle: string;
  /** "{name} · {year}". */
  podiumEdition: string;
  podiumChampion: string;
  podiumRunnerUp: string;
  podiumThird: string;
  /** Lacuna declarada quando a fonte não registra o 3º lugar. */
  podiumGap: string;
  indexTitle: string;
  colCompetition: string;
  colCountry: string;
  colEditions: string;
  colLast: string;
  colReach: string;
  seeAll: string;
  backToCurated: string;
  curatedNote: string;
  /** "{n} competições neste recorte". */
  indexAside: string;
  provenance: string;
}

export const wsConceitoCompeticoes: Record<Locale, ConceitoCompeticoesStrings> = {
  'pt-br': {
    kicker: 'Acervo · filtro por país, tipo e alcance',
    subtitle: 'Do mundial ao estadual, com o troféu de cada uma e o alcance em que ela decide.',
    anchorLabel: 'competições catalogadas',
    filtersTitle: 'Filtros',
    country: 'País',
    all: 'Todos',
    allCountries: 'Todos os países',
    seeAllCountries: 'Ver todos os países ({n})',
    otherCountry: 'Outro país',
    men: 'Masculino',
    women: 'Feminino',
    searchPrefix: 'Busca',
    clear: 'Limpar filtros',
    highlightsTitle: 'Destaques · por alcance',
    tier: { mundial: 'Mundial', continental: 'Continental', nacional: 'Nacional' },
    editionsLine: '{editions} edições no acervo',
    podiumTitle: 'Pódio da última edição',
    podiumEdition: '{name} · {year}',
    podiumChampion: 'Campeão',
    podiumRunnerUp: 'Vice-campeão',
    podiumThird: '3º lugar',
    podiumGap: 'O 3º lugar desta edição não está registrado na fonte.',
    indexTitle: 'Índice completo',
    colCompetition: 'Competição',
    colCountry: 'País',
    colEditions: 'Edições',
    colLast: 'Última',
    colReach: 'Alcance',
    seeAll: 'Ver todas as competições do acervo',
    backToCurated: 'Voltar ao índice curado',
    curatedNote:
      'Índice curado das competições-âncora; o acervo completo abre no link abaixo e respeita os filtros. As contagens de edições são as do acervo. Competições estaduais ficam fora dos destaques por alcance regional.',
    indexAside: '{n} competições neste recorte',
    provenance:
      'Lista paginada do acervo, servida pela API pública. Cada ficha de competição declara a fonte do dado.',
  },
  'en-us': {
    kicker: 'Archive · filter by country, type and reach',
    subtitle: 'From world to state level, with each one’s trophy and the reach it decides.',
    anchorLabel: 'competitions catalogued',
    filtersTitle: 'Filters',
    country: 'Country',
    all: 'All',
    allCountries: 'All countries',
    seeAllCountries: 'See all countries ({n})',
    otherCountry: 'Other country',
    men: 'Men',
    women: 'Women',
    searchPrefix: 'Search',
    clear: 'Clear filters',
    highlightsTitle: 'Highlights · by reach',
    tier: { mundial: 'World', continental: 'Continental', nacional: 'National' },
    editionsLine: '{editions} editions in the archive',
    podiumTitle: 'Last edition podium',
    podiumEdition: '{name} · {year}',
    podiumChampion: 'Champion',
    podiumRunnerUp: 'Runner-up',
    podiumThird: '3rd place',
    podiumGap: 'The 3rd place of this edition is not recorded in the source.',
    indexTitle: 'Full index',
    colCompetition: 'Competition',
    colCountry: 'Country',
    colEditions: 'Editions',
    colLast: 'Latest',
    colReach: 'Reach',
    seeAll: 'See every competition in the archive',
    backToCurated: 'Back to the curated index',
    curatedNote:
      'Curated index of anchor competitions; the full archive opens below and respects the filters. State competitions stay out of the highlights because of regional reach.',
    indexAside: '{n} competitions in this selection',
    provenance:
      'Paginated archive list served by the public API. Each competition record declares the source of its data.',
  },
  'es-es': {
    kicker: 'Acervo · filtro por país, tipo y alcance',
    subtitle: 'Del mundial al estatal, con el trofeo de cada una y el alcance en que decide.',
    anchorLabel: 'competiciones catalogadas',
    filtersTitle: 'Filtros',
    country: 'País',
    all: 'Todos',
    allCountries: 'Todos los países',
    seeAllCountries: 'Ver todos los países ({n})',
    otherCountry: 'Otro país',
    men: 'Masculino',
    women: 'Femenino',
    searchPrefix: 'Búsqueda',
    clear: 'Limpiar filtros',
    highlightsTitle: 'Destacados · por alcance',
    tier: { mundial: 'Mundial', continental: 'Continental', nacional: 'Nacional' },
    editionsLine: '{editions} ediciones en el acervo',
    podiumTitle: 'Podio de la última edición',
    podiumEdition: '{name} · {year}',
    podiumChampion: 'Campeón',
    podiumRunnerUp: 'Subcampeón',
    podiumThird: '3º puesto',
    podiumGap: 'El 3º puesto de esta edición no está registrado en la fuente.',
    indexTitle: 'Índice completo',
    colCompetition: 'Competición',
    colCountry: 'País',
    colEditions: 'Ediciones',
    colLast: 'Última',
    colReach: 'Alcance',
    seeAll: 'Ver todas las competiciones del acervo',
    backToCurated: 'Volver al índice curado',
    curatedNote:
      'Índice curado de las competiciones ancla; el acervo completo se abre abajo y respeta los filtros. Las competiciones estatales quedan fuera de los destaques por alcance regional.',
    indexAside: '{n} competiciones en este recorte',
    provenance:
      'Lista paginada del acervo servida por la API pública. Cada ficha de competición declara la fuente del dato.',
  },
};
