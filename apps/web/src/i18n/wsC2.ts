import type { Locale } from './config';

/**
 * WS-C-2 — strings da camada pública (perfil, busca global, carrossel).
 * Módulo ADITIVO (não altera o Dictionary global); consumido por Server Components
 * (via cookie de locale) e Client Components (via useI18n().locale).
 */
export interface WsC2Strings {
  profile: {
    backToClubs: string;
    provenance: string;
    source: string;
    importedFrom: string;
    retrievedAt: string;
    wikidata: string;
    geography: string;
    coordinates: string;
    coordApprox: string;
    noGeo: string;
    titles: string;
    rankings: string;
    competitions: string;
    related: string;
    gaps: string;
    gapsIntro: string;
    notAvailable: string;
    unavailablePhase: string;
    season: string;
    position: string;
    points: string;
    genderWomen: string;
    status: string;
    country: string;
    state: string;
    city: string;
    founded: string;
    gapLabels: Record<string, string>;
  };
  search: {
    title: string;
    subtitle: string;
    placeholder: string;
    loading: string;
    empty: string;
    error: string;
    typeAll: string;
    typeClub: string;
    typeCompetition: string;
    total: string;
    limitations: string;
    attributionNote: string;
  };
  carousel: {
    title: string;
    empty: string;
    season: string;
    source: string;
    viewMore: string;
    gapsNote: string;
    municipalGap: string;
  };
}

export const wsC2Strings: Record<Locale, WsC2Strings> = {
  'pt-br': {
    profile: {
      backToClubs: 'Voltar para Clubes',
      provenance: 'Proveniência',
      source: 'Fonte',
      importedFrom: 'Importado de',
      retrievedAt: 'Obtido em',
      wikidata: 'Ver no Wikidata',
      geography: 'Geografia',
      coordinates: 'Coordenadas',
      coordApprox: 'aproximada (nível município)',
      noGeo: 'Sem coordenada registrada no acervo (vazio-honesto).',
      titles: 'Galeria de honra',
      rankings: 'Rankings',
      competitions: 'Competições relacionadas',
      related: 'Conexões (grafo de conhecimento)',
      gaps: 'Lacunas declaradas',
      gapsIntro: 'O acervo ainda não possui estes dados — exibidos como lacuna, nunca inventados:',
      notAvailable: 'Não disponível nesta fase.',
      unavailablePhase: 'Não disponível nesta fase.',
      season: 'Temporada',
      position: 'Posição',
      points: 'Pontos',
      genderWomen: 'Feminino',
      status: 'Status',
      country: 'País',
      state: 'Estado',
      city: 'Cidade',
      founded: 'Fundação',
      gapLabels: {
        history_not_available: 'História do clube',
        squad_not_available: 'Elenco',
        stadium_not_available: 'Estádio',
        kits_not_available: 'Uniformes',
        anthem_not_available: 'Hino',
        matches_not_available: 'Partidas',
        no_provenanced_titles: 'Títulos com fonte',
        no_published_ranking: 'Ranking publicado',
        no_related_competition: 'Competições relacionadas',
        no_related_edges: 'Conexões no grafo',
      },
    },
    search: {
      title: 'Busca global',
      subtitle: 'Encontre clubes e competições em todo o acervo.',
      placeholder: 'Buscar clube ou competição…',
      loading: 'Buscando…',
      empty: 'Nenhum resultado para esta busca.',
      error: 'Não foi possível buscar agora. Tente novamente.',
      typeAll: 'Tudo',
      typeClub: 'Clubes',
      typeCompetition: 'Competições',
      total: '{n} resultado(s)',
      limitations:
        'Limitações: jogadores ainda não indexados; busca usa os índices atuais do Postgres.',
      attributionNote: 'Coordenadas de: ',
    },
    carousel: {
      title: 'Campeões',
      empty: 'Nenhum campeão auditável no acervo ainda.',
      season: 'Temporada',
      source: 'fonte',
      viewMore: 'Ver mais campeões',
      gapsNote: 'Hierarquias sem dado auditável são omitidas (nunca inventadas).',
      municipalGap: 'municipal (sem dado auditável)',
    },
  },
  'en-us': {
    profile: {
      backToClubs: 'Back to Clubs',
      provenance: 'Provenance',
      source: 'Source',
      importedFrom: 'Imported from',
      retrievedAt: 'Retrieved at',
      wikidata: 'View on Wikidata',
      geography: 'Geography',
      coordinates: 'Coordinates',
      coordApprox: 'approximate (municipality level)',
      noGeo: 'No coordinate recorded in the archive (honest empty).',
      titles: 'Honour gallery',
      rankings: 'Rankings',
      competitions: 'Related competitions',
      related: 'Connections (knowledge graph)',
      gaps: 'Declared gaps',
      gapsIntro: 'The archive does not hold these data yet — shown as gaps, never invented:',
      notAvailable: 'Not available at this stage.',
      unavailablePhase: 'Not available at this stage.',
      season: 'Season',
      position: 'Position',
      points: 'Points',
      genderWomen: "Women's",
      status: 'Status',
      country: 'Country',
      state: 'State',
      city: 'City',
      founded: 'Founded',
      gapLabels: {
        history_not_available: 'Club history',
        squad_not_available: 'Squad',
        stadium_not_available: 'Stadium',
        kits_not_available: 'Kits',
        anthem_not_available: 'Anthem',
        matches_not_available: 'Matches',
        no_provenanced_titles: 'Sourced titles',
        no_published_ranking: 'Published ranking',
        no_related_competition: 'Related competitions',
        no_related_edges: 'Graph connections',
      },
    },
    search: {
      title: 'Global search',
      subtitle: 'Find clubs and competitions across the archive.',
      placeholder: 'Search club or competition…',
      loading: 'Searching…',
      empty: 'No results for this search.',
      error: 'Could not search right now. Please try again.',
      typeAll: 'All',
      typeClub: 'Clubs',
      typeCompetition: 'Competitions',
      total: '{n} result(s)',
      limitations:
        'Limitations: players not indexed yet; search uses the current Postgres indexes.',
      attributionNote: 'Coordinates from: ',
    },
    carousel: {
      title: 'Champions',
      empty: 'No auditable champion in the archive yet.',
      season: 'Season',
      source: 'source',
      viewMore: 'See more champions',
      gapsNote: 'Hierarchies without auditable data are omitted (never invented).',
      municipalGap: 'municipal (no auditable data)',
    },
  },
  'es-es': {
    profile: {
      backToClubs: 'Volver a Clubes',
      provenance: 'Procedencia',
      source: 'Fuente',
      importedFrom: 'Importado de',
      retrievedAt: 'Obtenido el',
      wikidata: 'Ver en Wikidata',
      geography: 'Geografía',
      coordinates: 'Coordenadas',
      coordApprox: 'aproximada (nivel municipio)',
      noGeo: 'Sin coordenada registrada en el acervo (vacío honesto).',
      titles: 'Galería de honor',
      rankings: 'Rankings',
      competitions: 'Competiciones relacionadas',
      related: 'Conexiones (grafo de conocimiento)',
      gaps: 'Lagunas declaradas',
      gapsIntro: 'El acervo aún no tiene estos datos — mostrados como laguna, nunca inventados:',
      notAvailable: 'No disponible en esta fase.',
      unavailablePhase: 'No disponible en esta fase.',
      season: 'Temporada',
      position: 'Posición',
      points: 'Puntos',
      genderWomen: 'Femenino',
      status: 'Estado',
      country: 'País',
      state: 'Estado',
      city: 'Ciudad',
      founded: 'Fundación',
      gapLabels: {
        history_not_available: 'Historia del club',
        squad_not_available: 'Plantilla',
        stadium_not_available: 'Estadio',
        kits_not_available: 'Uniformes',
        anthem_not_available: 'Himno',
        matches_not_available: 'Partidos',
        no_provenanced_titles: 'Títulos con fuente',
        no_published_ranking: 'Ranking publicado',
        no_related_competition: 'Competiciones relacionadas',
        no_related_edges: 'Conexiones del grafo',
      },
    },
    search: {
      title: 'Búsqueda global',
      subtitle: 'Encuentra clubes y competiciones en todo el acervo.',
      placeholder: 'Buscar club o competición…',
      loading: 'Buscando…',
      empty: 'Sin resultados para esta búsqueda.',
      error: 'No se pudo buscar ahora. Inténtalo de nuevo.',
      typeAll: 'Todo',
      typeClub: 'Clubes',
      typeCompetition: 'Competiciones',
      total: '{n} resultado(s)',
      limitations:
        'Limitaciones: jugadores aún no indexados; la búsqueda usa los índices actuales de Postgres.',
      attributionNote: 'Coordenadas de: ',
    },
    carousel: {
      title: 'Campeones',
      empty: 'Aún no hay campeón auditable en el acervo.',
      season: 'Temporada',
      source: 'fuente',
      viewMore: 'Ver más campeones',
      gapsNote: 'Las jerarquías sin dato auditable se omiten (nunca inventadas).',
      municipalGap: 'municipal (sin dato auditable)',
    },
  },
};
