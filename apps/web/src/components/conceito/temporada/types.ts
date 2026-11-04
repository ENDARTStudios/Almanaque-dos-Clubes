/**
 * FICHA DA TEMPORADA no conceito — tipos do payload REAL.
 *
 * Três fontes, e só elas:
 *   · `GET /seasons/:id` — a temporada (nome, situação, datas);
 *   · `GET /matches?seasonId=` — as partidas (placar, rodada, clubes, competição);
 *   · `GET /competitions/:id` — o resumo catalogado da competição na temporada
 *     (campeão, artilheiro, tabela final).
 *
 * Nada aqui é número ilustrativo do quadro: campo ausente vira `null` e a tela declara a
 * lacuna. Por isso todos os agregados são DERIVADOS de partidas reais em `derive.ts`.
 */

export interface SeasonSummary {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
}

export interface MatchClub {
  id: string;
  name: string;
  logoUrl?: string | null;
}

/** Uma partida da temporada, como `GET /matches` devolve. */
export interface SeasonMatch {
  id: string;
  date: string;
  round: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homeClub: MatchClub | null;
  awayClub: MatchClub | null;
  competition: { id: string; name: string } | null;
}

/**
 * Linha de tabela publicada pela fonte (`CompetitionSeason.standings`). Os números podem
 * vir nulos: a fonte publica a classificação sem preencher toda coluna, e lacuna não vira zero.
 */
export interface StandingRow {
  position: number | null;
  clubId: string | null;
  clubName: string | null;
  played: number | null;
  won: number | null;
  drawn: number | null;
  lost: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  points: number | null;
}

/** Resumo catalogado de UMA competição em UMA temporada. `null` = não catalogado. */
export interface CompetitionSeasonRow {
  season: string;
  standings: StandingRow[] | null;
  topScorer: { name: string; goals: number } | null;
  champion: { id: string; name: string | null } | null;
}

/** Competição com partidas na temporada + o resumo catalogado (quando existe). */
export interface SeasonCompetition {
  id: string;
  name: string;
  /** `LEAGUE` | `CUP` | `TOURNAMENT` | `SUPER_CUP` — `null` se a consulta falhou. */
  type: string | null;
  country: string | null;
  season: CompetitionSeasonRow | null;
}
