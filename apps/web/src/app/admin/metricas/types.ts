/**
 * Shape do payload de GET /api/v1/admin/metrics (ver `metrics.routes.ts` na API).
 * Blocos sem fonte real NÃO existem aqui — a lacuna é declarada, não preenchida.
 */
export interface AdminMetricsPayload {
  measuredAt: string;
  cacheTtlSeconds: number;
  acervo: {
    clubsByKind: Record<string, number>;
    clubsTotal: number;
    players: number;
    matches: number;
    competitions: number;
    seasons: number;
    competitionSeasons: number;
    seasonsWithChampion: number;
    rankings: number;
  };
  cobertura: {
    clubs: {
      total: number;
      logoUrl: number;
      stadiumName: number;
      teamColors: number;
      editorialText: number;
      kitHistory: number;
      anthem: number;
      pennants: number;
      withoutLatitude: number;
    };
    players: {
      total: number;
      photoUrl: number;
      country: number;
      position: number;
      clubId: number;
    };
  };
  filaPorChave: Record<string, number>;
  produto: {
    users: { total: number; active: number; withBirthDate: number; giftReceived: number };
    subscriptionsByPlan: Record<string, number>;
  };
  series: {
    usersByMonth: Array<{ month: string; count: number }>;
    catalogByType: Array<{ key: string; count: number }>;
    topFavorites: Array<{
      targetType: string;
      targetId: string;
      name: string | null;
      count: number;
    }>;
  };
}
