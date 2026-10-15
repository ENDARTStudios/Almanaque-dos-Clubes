import type { Locale } from '@/i18n/config';

/**
 * Strings LOCAIS do painel de métricas (/admin/metricas).
 *
 * Módulo aditivo, no padrão do `wsO1` (observabilidade): strings por locale num
 * arquivo próprio, SEM tocar nos dicionários globais. Fica dentro da própria
 * pasta da rota porque o escopo desta entrega é `app/admin/metricas/**`.
 */
export interface AdminMetricsStrings {
  title: string;
  subtitle: string;
  restricted: string;
  loading: string;
  error: string;
  refresh: string;
  measuredAt: string;
  cacheNote: string;
  kpi: {
    clubs: string;
    players: string;
    matches: string;
    competitions: string;
    users: string;
    champions: string;
  };
  acervoTitle: string;
  acervo: {
    nationalTeams: string;
    federations: string;
    players: string;
    matches: string;
    competitions: string;
    seasons: string;
    seasonsWithChampion: string;
    rankings: string;
  };
  coberturaTitle: string;
  coberturaNote: string;
  coberturaClubsTitle: string;
  cobertura: {
    total: string;
    logo: string;
    stadium: string;
    colors: string;
    editorial: string;
    kits: string;
    anthem: string;
    pennants: string;
    withoutLatitude: string;
  };
  coberturaPlayersTitle: string;
  coberturaPlayers: {
    photo: string;
    country: string;
    position: string;
    withClub: string;
  };
  filaTitle: string;
  filaNote: string;
  filaKeys: { logo: string; stadium: string; colors: string; editorial: string; kits: string };
  produtoTitle: string;
  produto: {
    total: string;
    active: string;
    withBirthDate: string;
    giftReceived: string;
    planFree: string;
    planPro: string;
    planElite: string;
    planOther: string;
  };
  charts: {
    usersByMonthTitle: string;
    usersByMonthIntro: string;
    catalogTitle: string;
    catalogIntro: string;
    favoritesTitle: string;
    favoritesIntro: string;
  };
  catalogKeys: {
    clubs: string;
    nationalTeams: string;
    players: string;
    matches: string;
    competitions: string;
    other: string;
  };
  favoritesTarget: { club: string; player: string; competition: string; unknown: string };
  tableMonth: string;
  tableCount: string;
  tableType: string;
  tableTarget: string;
  tableFavorites: string;
  seeData: string;
  noData: string;
  unknownTarget: string;
}

export const adminMetricsStrings: Record<Locale, AdminMetricsStrings> = {
  'pt-br': {
    title: 'Métricas',
    subtitle: 'Estado do acervo, cobertura de mídia e produto — medido no banco de produção.',
    restricted: 'Acesso restrito ao operador.',
    loading: 'Carregando métricas…',
    error: 'Não foi possível carregar as métricas. Tente novamente.',
    refresh: 'Atualizar',
    measuredAt: 'Medido em',
    cacheNote: 'Cache de 60s: o horário acima é o momento do cálculo, não do carregamento.',
    kpi: {
      clubs: 'Clubes',
      players: 'Jogadores',
      matches: 'Partidas',
      competitions: 'Competições',
      users: 'Usuários',
      champions: 'Temporadas com campeão',
    },
    acervoTitle: 'Acervo',
    acervo: {
      nationalTeams: 'Seleções',
      federations: 'Federações',
      players: 'Jogadores',
      matches: 'Partidas',
      competitions: 'Competições',
      seasons: 'Temporadas',
      seasonsWithChampion: 'Temporadas com campeão',
      rankings: 'Rankings',
    },
    coberturaTitle: 'Cobertura',
    coberturaNote: 'Clubes com o campo preenchido (não nulo).',
    coberturaClubsTitle: 'Clubes',
    cobertura: {
      total: 'Total de clubes',
      logo: 'Com escudo',
      stadium: 'Com estádio',
      colors: 'Com cores',
      editorial: 'Com texto editorial',
      kits: 'Com histórico de uniformes',
      anthem: 'Com hino',
      pennants: 'Com flâmulas',
      withoutLatitude: 'Sem coordenada',
    },
    coberturaPlayersTitle: 'Jogadores',
    coberturaPlayers: {
      photo: 'Com foto',
      country: 'Com país',
      position: 'Com posição',
      withClub: 'Vinculados a clube',
    },
    filaTitle: 'Fila de enriquecimento (cursor por chave)',
    filaNote: 'Clubes que AINDA não têm registro da chave em mediaEnrichment.',
    filaKeys: {
      logo: 'Escudo',
      stadium: 'Estádio',
      colors: 'Cores',
      editorial: 'Editorial',
      kits: 'Uniformes',
    },
    produtoTitle: 'Produto',
    produto: {
      total: 'Usuários',
      active: 'Ativos',
      withBirthDate: 'Com data de nascimento',
      giftReceived: 'Já receberam presente',
      planFree: 'Plano Free',
      planPro: 'Plano Pro',
      planElite: 'Plano Elite',
      planOther: 'Outros planos',
    },
    charts: {
      usersByMonthTitle: 'Usuários criados por mês (últimos 12 meses)',
      usersByMonthIntro: 'Novas contas por mês, de users.createdAt.',
      catalogTitle: 'Catálogo por tipo',
      catalogIntro: 'Contagem de entidades do acervo.',
      favoritesTitle: 'Top 10 mídias com mais interesse',
      favoritesIntro: 'Alvos mais favoritados pelos usuários.',
    },
    catalogKeys: {
      clubs: 'Clubes',
      nationalTeams: 'Seleções',
      players: 'Jogadores',
      matches: 'Partidas',
      competitions: 'Competições',
      other: 'Outros',
    },
    favoritesTarget: {
      club: 'Clube',
      player: 'Jogador',
      competition: 'Competição',
      unknown: 'Alvo',
    },
    tableMonth: 'Mês',
    tableCount: 'Contas',
    tableType: 'Tipo',
    tableTarget: 'Alvo',
    tableFavorites: 'Favoritos',
    seeData: 'Ver dados em texto',
    noData: 'Sem dados medidos.',
    unknownTarget: 'Sem nome na fonte',
  },
  'en-us': {
    title: 'Metrics',
    subtitle: 'Collection state, media coverage and product — measured on production DB.',
    restricted: 'Restricted to the operator.',
    loading: 'Loading metrics…',
    error: 'Could not load metrics. Try again.',
    refresh: 'Refresh',
    measuredAt: 'Measured at',
    cacheNote: '60s cache: the time above is when it was computed, not when it loaded.',
    kpi: {
      clubs: 'Clubs',
      players: 'Players',
      matches: 'Matches',
      competitions: 'Competitions',
      users: 'Users',
      champions: 'Seasons with champion',
    },
    acervoTitle: 'Collection',
    acervo: {
      nationalTeams: 'National teams',
      federations: 'Federations',
      players: 'Players',
      matches: 'Matches',
      competitions: 'Competitions',
      seasons: 'Seasons',
      seasonsWithChampion: 'Seasons with champion',
      rankings: 'Rankings',
    },
    coberturaTitle: 'Coverage',
    coberturaNote: 'Clubs with the field filled (not null).',
    coberturaClubsTitle: 'Clubs',
    cobertura: {
      total: 'Total clubs',
      logo: 'With badge',
      stadium: 'With stadium',
      colors: 'With colours',
      editorial: 'With editorial text',
      kits: 'With kit history',
      anthem: 'With anthem',
      pennants: 'With pennants',
      withoutLatitude: 'Without coordinates',
    },
    coberturaPlayersTitle: 'Players',
    coberturaPlayers: {
      photo: 'With photo',
      country: 'With country',
      position: 'With position',
      withClub: 'Linked to a club',
    },
    filaTitle: 'Enrichment queue (per-key cursor)',
    filaNote: 'Clubs that STILL have no record for the key in mediaEnrichment.',
    filaKeys: {
      logo: 'Badge',
      stadium: 'Stadium',
      colors: 'Colours',
      editorial: 'Editorial',
      kits: 'Kits',
    },
    produtoTitle: 'Product',
    produto: {
      total: 'Users',
      active: 'Active',
      withBirthDate: 'With birth date',
      giftReceived: 'Already gifted',
      planFree: 'Free plan',
      planPro: 'Pro plan',
      planElite: 'Elite plan',
      planOther: 'Other plans',
    },
    charts: {
      usersByMonthTitle: 'Users created per month (last 12 months)',
      usersByMonthIntro: 'New accounts per month, from users.createdAt.',
      catalogTitle: 'Catalog by type',
      catalogIntro: 'Count of collection entities.',
      favoritesTitle: 'Top 10 most-favorited media',
      favoritesIntro: 'Targets most favorited by users.',
    },
    catalogKeys: {
      clubs: 'Clubs',
      nationalTeams: 'National teams',
      players: 'Players',
      matches: 'Matches',
      competitions: 'Competitions',
      other: 'Other',
    },
    favoritesTarget: {
      club: 'Club',
      player: 'Player',
      competition: 'Competition',
      unknown: 'Target',
    },
    tableMonth: 'Month',
    tableCount: 'Accounts',
    tableType: 'Type',
    tableTarget: 'Target',
    tableFavorites: 'Favorites',
    seeData: 'See data as text',
    noData: 'No measured data.',
    unknownTarget: 'No name in source',
  },
  'es-es': {
    title: 'Métricas',
    subtitle:
      'Estado del acervo, cobertura de medios y producto — medido en la base de producción.',
    restricted: 'Acceso restringido al operador.',
    loading: 'Cargando métricas…',
    error: 'No se pudieron cargar las métricas. Inténtalo de nuevo.',
    refresh: 'Actualizar',
    measuredAt: 'Medido el',
    cacheNote: 'Caché de 60s: la hora anterior es la del cálculo, no la de la carga.',
    kpi: {
      clubs: 'Clubes',
      players: 'Jugadores',
      matches: 'Partidos',
      competitions: 'Competiciones',
      users: 'Usuarios',
      champions: 'Temporadas con campeón',
    },
    acervoTitle: 'Acervo',
    acervo: {
      nationalTeams: 'Selecciones',
      federations: 'Federaciones',
      players: 'Jugadores',
      matches: 'Partidos',
      competitions: 'Competiciones',
      seasons: 'Temporadas',
      seasonsWithChampion: 'Temporadas con campeón',
      rankings: 'Rankings',
    },
    coberturaTitle: 'Cobertura',
    coberturaNote: 'Clubes con el campo rellenado (no nulo).',
    coberturaClubsTitle: 'Clubes',
    cobertura: {
      total: 'Total de clubes',
      logo: 'Con escudo',
      stadium: 'Con estadio',
      colors: 'Con colores',
      editorial: 'Con texto editorial',
      kits: 'Con historial de equipaciones',
      anthem: 'Con himno',
      pennants: 'Con banderines',
      withoutLatitude: 'Sin coordenada',
    },
    coberturaPlayersTitle: 'Jugadores',
    coberturaPlayers: {
      photo: 'Con foto',
      country: 'Con país',
      position: 'Con posición',
      withClub: 'Vinculados a un club',
    },
    filaTitle: 'Cola de enriquecimiento (cursor por clave)',
    filaNote: 'Clubes que AÚN no tienen registro de la clave en mediaEnrichment.',
    filaKeys: {
      logo: 'Escudo',
      stadium: 'Estadio',
      colors: 'Colores',
      editorial: 'Editorial',
      kits: 'Equipaciones',
    },
    produtoTitle: 'Producto',
    produto: {
      total: 'Usuarios',
      active: 'Activos',
      withBirthDate: 'Con fecha de nacimiento',
      giftReceived: 'Ya recibieron regalo',
      planFree: 'Plan Free',
      planPro: 'Plan Pro',
      planElite: 'Plan Elite',
      planOther: 'Otros planes',
    },
    charts: {
      usersByMonthTitle: 'Usuarios creados por mes (últimos 12 meses)',
      usersByMonthIntro: 'Cuentas nuevas por mes, de users.createdAt.',
      catalogTitle: 'Catálogo por tipo',
      catalogIntro: 'Recuento de entidades del acervo.',
      favoritesTitle: 'Top 10 medios con más interés',
      favoritesIntro: 'Objetivos más marcados como favoritos.',
    },
    catalogKeys: {
      clubs: 'Clubes',
      nationalTeams: 'Selecciones',
      players: 'Jugadores',
      matches: 'Partidos',
      competitions: 'Competiciones',
      other: 'Otros',
    },
    favoritesTarget: {
      club: 'Club',
      player: 'Jugador',
      competition: 'Competición',
      unknown: 'Objetivo',
    },
    tableMonth: 'Mes',
    tableCount: 'Cuentas',
    tableType: 'Tipo',
    tableTarget: 'Objetivo',
    tableFavorites: 'Favoritos',
    seeData: 'Ver datos en texto',
    noData: 'Sin datos medidos.',
    unknownTarget: 'Sin nombre en la fuente',
  },
};
