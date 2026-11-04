/**
 * Contrato de dados de `GET /api/v1/legends` e das contagens reais que a faixa de
 * métricas usa. Espelha os tipos de `apps/api/src/modules/legends/service.ts` — se a
 * API mudar, o typecheck aponta o descompasso aqui.
 */

export interface TopChampionItem {
  clubId: string;
  clubName: string;
  country: string | null;
  titles: number;
  /** Ano da edição mais recente com `metadata.year`; `null` = a fonte não traz o ano. */
  lastTitleYear: number | null;
}

export interface CompetitionLeaderItem {
  competitionId: string;
  competitionName: string | null;
  competitionType: string | null;
  leaderClubId: string;
  leaderClubName: string;
  titles: number;
  lastTitleYear: number | null;
}

export interface MatchRecord {
  matchId: string;
  homeClubId: string;
  homeClubName: string;
  awayClubId: string;
  awayClubName: string;
  homeScore: number;
  awayScore: number;
  margin: number;
  totalGoals: number;
  date: string;
  competitionId: string | null;
  competitionName: string | null;
  seasonId: string | null;
  seasonName: string | null;
  sourceUrl: string | null;
}

export interface ClubSeasonGoalsRecord {
  clubId: string;
  clubName: string;
  seasonId: string | null;
  seasonName: string | null;
  goals: number;
  matches: number;
}

export interface UnbeatenRunRecord {
  clubId: string;
  clubName: string;
  seasonId: string | null;
  seasonName: string | null;
  length: number;
  fromDate: string;
  toDate: string;
}

export interface LegendsSummary {
  topChampions: {
    items: TopChampionItem[];
    provenance: { source: 'knowledge-graph:WON'; titlesCounted: number };
  };
  competitionLeaders: {
    items: CompetitionLeaderItem[];
    provenance: { source: 'knowledge-graph:WON'; competitionsConsidered: number };
  };
  records: {
    biggestWin: MatchRecord | null;
    mostGoalsMatch: MatchRecord | null;
    mostGoalsClubSeason: ClubSeasonGoalsRecord | null;
    longestUnbeatenSeason: UnbeatenRunRecord | null;
    provenance: { source: 'matches'; matchesConsidered: number };
  };
}

/**
 * Contagens reais do acervo (mesma leitura de `apps/web/src/app/page.tsx`: `total` da
 * paginação de `/players` e `/clubs`, e `totals.countries` de `/clubs/countries`).
 * `null` = a origem não respondeu — a faixa mostra "—", nunca 0.
 */
export interface LegendsCounts {
  players: number | null;
  clubs: number | null;
  countries: number | null;
}
