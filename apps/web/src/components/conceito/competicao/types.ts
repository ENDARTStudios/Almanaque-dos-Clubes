/**
 * Contratos de entrada da ficha da competição no conceito FICHA.
 *
 * Os tipos descrevem SOMENTE o que `GET /competitions/:id` devolve (data + overview + seasons).
 * A página (Server Component) mapeia o payload para cá; nenhum campo é inventado e nada é
 * declarado "opcional" para esconder lacuna — ausência é `null`.
 */

/** Uma linha de `CompetitionSeason.standings` como o seed grava (T510). */
export interface SeasonStandingRow {
  position: number;
  clubName: string;
  clubId: string | null;
  matchedName: string | null;
  played: number | null;
  won: number | null;
  drawn: number | null;
  lost: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  points: number | null;
}

/** Temporada catalogada: a tabela pode não existir (copa sem classificação, seed parcial). */
export interface SeasonWithStandings {
  season: string;
  standings: SeasonStandingRow[] | null;
}

/** Linha da tabela histórica derivada das partidas (`GET /competitions/:id/history`). */
export interface HistoryStandingRow {
  clubId: string;
  clubName: string | null;
  position: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}
