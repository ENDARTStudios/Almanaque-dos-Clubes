/** Contrato mínimo da linha de partida usado pela lista do conceito. */
export interface MatchClub {
  id: string;
  name: string;
  logoUrl?: string | null;
}

export interface MatchRowData {
  id: string;
  date: string;
  round: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homeClub: MatchClub | null;
  awayClub: MatchClub | null;
  competition: { id: string; name: string } | null;
  season: { id: string; name: string } | null;
}
