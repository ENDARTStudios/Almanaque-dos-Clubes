import type { HistoryStandingRow, SeasonStandingRow, SeasonWithStandings } from './types';

/**
 * Funções puras da ficha da competição.
 *
 * ── POR QUE ELAS EXISTEM ───────────────────────────────────────────────────────────────────
 * A TABELA DENSA só desenha o que o acervo sustenta. As duas decisões que precisam ser
 * auditáveis fora do JSX — "qual é a última temporada com tabela" e "quantas rodadas essa
 * tabela tem" — ficam aqui, testáveis sem render.
 *
 * ── O QUE NÃO EXISTE ──────────────────────────────────────────────────────────────────────
 * Forma (últimos 5) e zonas de classificação não têm campo em `CompetitionSeason.standings`.
 * Por isso não há função que as "derive": derivar de posição seria inventar (posição 1 não é
 * vaga de Champions em toda competição, e posição 20 não é rebaixamento em toda competição).
 */

/** Traço de lacuna declarada — o mesmo sinal universal dos outros módulos. */
export const GAP = '—';

/** Linha normalizada que a tabela densa recebe. */
export interface ClassificationRow {
  key: string;
  position: number;
  clubId: string | null;
  clubName: string | null;
  played: number | null;
  won: number | null;
  drawn: number | null;
  lost: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  goalDifference: number | null;
  points: number | null;
  /**
   * Forma nos últimos jogos — SÓ existe se a fonte publicar. Hoje `standings` não tem o campo;
   * a coluna é condicional para que o dia em que existir não exija redesenhar a tabela.
   */
  form?: string[] | null;
}

/** Saldo de gols é ARITMÉTICA das colunas publicadas — nunca um número novo. */
export function goalDifferenceOf(
  goalsFor: number | null,
  goalsAgainst: number | null,
): number | null {
  if (goalsFor == null || goalsAgainst == null) return null;
  if (!Number.isFinite(goalsFor) || !Number.isFinite(goalsAgainst)) return null;
  return goalsFor - goalsAgainst;
}

/** Saldo com sinal explícito (+45 / 0 / -47), como a tabela do conceito. */
export function formatGoalDifference(value: number | null): string {
  if (value == null) return GAP;
  return value > 0 ? '+' + value : String(value);
}

/** Primeira temporada (a lista já vem em ordem decrescente) que TEM tabela catalogada. */
export function latestSeasonWithStandings<T extends SeasonWithStandings>(
  seasons: readonly T[],
): (T & { standings: SeasonStandingRow[] }) | null {
  for (const season of seasons) {
    if (season.standings && season.standings.length > 0) {
      return season as T & { standings: SeasonStandingRow[] };
    }
  }
  return null;
}

/**
 * Número de rodadas de uma tabela: o maior número de jogos disputados por um clube.
 * Não é "a última rodada" (que exigiria calendário): é o que a própria tabela permite afirmar.
 * Retorna 0 quando a coluna não foi publicada — e 0 vira "sem âncora", nunca "0 rodadas".
 */
export function roundsFromStandings(standings: readonly SeasonStandingRow[]): number {
  let max = 0;
  for (const row of standings) {
    if (row.played != null && Number.isFinite(row.played) && row.played > max) max = row.played;
  }
  return max;
}

/** Tabela catalogada → linhas da tabela densa. `matchedName` vence o nome cru do seed. */
export function normalizeStandings(standings: readonly SeasonStandingRow[]): ClassificationRow[] {
  return standings.map((row, index) => ({
    key: (row.clubId ?? 'sem-clube') + '-' + row.position + '-' + index,
    position: row.position,
    clubId: row.clubId,
    clubName: row.matchedName ?? row.clubName,
    played: row.played,
    won: row.won,
    drawn: row.drawn,
    lost: row.lost,
    goalsFor: row.goalsFor,
    goalsAgainst: row.goalsAgainst,
    goalDifference: goalDifferenceOf(row.goalsFor, row.goalsAgainst),
    points: row.points,
  }));
}

/** Tabela derivada das partidas → linhas da tabela densa (saldo já vem calculado da API). */
export function normalizeHistoryTable(rows: readonly HistoryStandingRow[]): ClassificationRow[] {
  return rows.map((row) => ({
    key: row.clubId,
    position: row.position,
    clubId: row.clubId,
    clubName: row.clubName,
    played: row.played,
    won: row.wins,
    drawn: row.draws,
    lost: row.losses,
    goalsFor: row.goalsFor,
    goalsAgainst: row.goalsAgainst,
    goalDifference: row.goalDifference,
    points: row.points,
  }));
}
