/**
 * T-24/25 — blocos computados ADITIVOS do overview de competição, derivados das
 * linhas de `CompetitionSeason` (edições catalogadas pelo T510) e do enriquecimento
 * Wikidata do bot `enrich-competitions` (description/inceptionYear/dissolvedAt).
 * PURO (testável, sem Prisma) — o service resolve nomes de clube e injeta aqui.
 *
 * Honestidade (critério D-2026-10-10):
 *   - status 'extinta' SÓ com dissolvedAt gravado; sem edição recente ≠ extinta;
 *   - `third` (3º colocado) SÓ de tabela de LIGA (positions 1..N contíguos, sem
 *     coluna de grupo): standings de COPA é fase de grupos — posição 3 de grupo não
 *     é pódio. Copa/SUPER_CUP/TOURNAMENT → third null (gap declarado);
 *   - totais sem dado somável = null (nunca 0 — 0 é um número, null é uma lacuna).
 */

export interface SeasonRowInput {
  /** Rótulo da edição ("2023", "2023-24", "2011 Aper") — ano = 1º \d{4} do rótulo. */
  season: string;
  championId: string | null;
  championName?: string | null;
  runnerUpId: string | null;
  runnerUpName?: string | null;
  totalMatches: number | null;
  totalGoals: number | null;
  /** JSON `standings` gravado pelo seed T510: StandingRow & {clubId, matchedName}. */
  standings?: unknown;
}

export interface HistorySeason {
  year: number;
  championId: string | null;
  championName: string | null;
}

export interface BiggestChampion {
  clubId: string;
  clubName: string;
  titles: number;
}

export interface LongestStreak {
  clubName: string;
  from: number;
  to: number;
}

export interface CompetitionHistory {
  firstEditionYear: number | null;
  lastEditionYear: number | null;
  editionsCount: number;
  editionsWithChampion: number;
  status: 'extinta' | 'vigente' | 'sem_edicao_recente';
  biggestChampion: BiggestChampion | null;
  longestStreak: LongestStreak | null;
}

export interface PodiumClub {
  clubId: string | null;
  clubName: string;
}

export interface CompetitionPodium {
  champion: PodiumClub | null;
  runnerUp: PodiumClub | null;
  third: PodiumClub | null;
}

export interface CompetitionTotals {
  matches: number | null;
  goals: number | null;
}

/** "2023" → 2023 · "2023-24" → 2023 · "2011 Aper" → 2011 · sem \d{4} → null. */
export function yearFromSeasonLabel(label: string): number | null {
  const m = /(\d{4})/.exec(label ?? '');
  if (!m) return null;
  const year = Number(m[1]);
  return Number.isInteger(year) && year >= 1850 && year <= new Date().getUTCFullYear() + 1
    ? year
    : null;
}

/** Edições com ano válido, ordenadas (ano mais antigo → mais recente). */
function orderedEditions(seasons: SeasonRowInput[]): HistorySeason[] {
  return seasons
    .map((s) => ({ year: yearFromSeasonLabel(s.season), row: s }))
    .filter((e): e is { year: number; row: SeasonRowInput } => e.year != null)
    .sort((a, b) => a.year - b.year)
    .map(({ year, row }) => ({
      year,
      championId: row.championId ?? null,
      championName: row.championName ?? null,
    }));
}

export function buildHistory(
  seasons: SeasonRowInput[],
  dissolvedAt: Date | null,
  now: Date = new Date(),
): CompetitionHistory {
  const editions = orderedEditions(seasons);
  const firstEditionYear = editions[0]?.year ?? null;
  const lastEditionYear = editions.at(-1)?.year ?? null;

  // status: dissolvedAt → 'extinta'; edição no ano corrente ou no anterior →
  // 'vigente'; senão 'sem_edicao_recente' (sem edições cai aqui — honesto).
  let status: CompetitionHistory['status'] = 'sem_edicao_recente';
  if (dissolvedAt != null) status = 'extinta';
  else if (lastEditionYear != null && lastEditionYear >= now.getUTCFullYear() - 1)
    status = 'vigente';

  // Maior campeão por CompetitionSeason.championId (clubId conhecido só aqui —
  // o KG WON não é a fonte deste bloco).
  const titles = new Map<string, { name: string; count: number }>();
  for (const e of editions) {
    if (!e.championId) continue;
    const cur = titles.get(e.championId);
    if (cur) cur.count += 1;
    else
      titles.set(e.championId, {
        name: e.championName ?? e.championId,
        count: 1,
      });
  }
  const biggestChampion: BiggestChampion | null =
    [...titles.entries()]
      .map(([clubId, v]) => ({ clubId, clubName: v.name, titles: v.count }))
      .sort((a, b) => b.titles - a.titles || a.clubName.localeCompare(b.clubName))[0] ?? null;

  // Maior sequência de títulos CONSECUTIVOS (ano = ano anterior + 1, mesmo campeão).
  let longestStreak: LongestStreak | null = null;
  let cur: { clubId: string; clubName: string; from: number; to: number } | null = null;
  for (const e of editions) {
    if (
      cur &&
      e.championId === cur.clubId &&
      e.year === cur.to + 1 &&
      e.year - cur.from + 1 <= 200 // proteção contra anos duplicados na fonte
    ) {
      cur.to = e.year;
    } else if (e.championId) {
      cur = {
        clubId: e.championId,
        clubName: e.championName ?? e.championId,
        from: e.year,
        to: e.year,
      };
    } else {
      cur = null;
    }
    if (
      cur &&
      (longestStreak == null || cur.to - cur.from > longestStreak.to - longestStreak.from)
    ) {
      longestStreak = { clubName: cur.clubName, from: cur.from, to: cur.to };
    }
  }

  return {
    firstEditionYear,
    lastEditionYear,
    editionsCount: editions.length,
    editionsWithChampion: editions.filter((e) => e.championId).length,
    status,
    biggestChampion,
    longestStreak,
  };
}

/**
 * 3º colocado DE TABELA DE LIGA — só quando o JSON é uma classificação completa:
 * array não-vazio, sem coluna de grupo (`group`), posições 1..N únicas e contíguas.
 * Qualquer outra forma (fase de grupos, tabela parcial) = null — posição 3 de
 * grupo não é pódio. Linha do T510 traz `clubId` (match do seed) e `matchedName`.
 */
export function thirdFromStandings(standings: unknown): PodiumClub | null {
  if (!Array.isArray(standings) || standings.length < 3) return null;
  const rows = standings as Array<Record<string, unknown>>;
  const seen = new Set<number>();
  for (const row of rows) {
    if (row.group != null) return null; // fase de grupos combinada — honesto
    const pos = row.position;
    if (typeof pos !== 'number' || !Number.isInteger(pos) || pos < 1) return null;
    if (seen.has(pos)) return null; // posições repetidas = não é tabela única de liga
    seen.add(pos);
  }
  for (let i = 1; i <= rows.length; i++) {
    if (!seen.has(i)) return null; // 1..N contíguos
  }
  const third = rows.find((r) => r.position === 3);
  if (!third) return null;
  const clubName = third.matchedName ?? third.clubName;
  return typeof clubName === 'string' && clubName.trim()
    ? { clubId: typeof third.clubId === 'string' ? third.clubId : null, clubName }
    : null;
}

/**
 * Pódio da ÚLTIMA edição COM campeão (championId/runnerUpId do T510; third só de
 * liga — `isLeague`, decision do service a partir de Competition.type).
 */
export function buildPodium(seasons: SeasonRowInput[], isLeague: boolean): CompetitionPodium {
  const withChampion = seasons
    .filter((s) => s.championId)
    .sort((a, b) => (yearFromSeasonLabel(b.season) ?? 0) - (yearFromSeasonLabel(a.season) ?? 0));
  const last = withChampion[0];
  if (!last) return { champion: null, runnerUp: null, third: null };
  return {
    champion: { clubId: last.championId, clubName: last.championName ?? last.championId! },
    runnerUp: last.runnerUpId
      ? { clubId: last.runnerUpId, clubName: last.runnerUpName ?? last.runnerUpId }
      : null,
    third: isLeague ? thirdFromStandings(last.standings) : null,
  };
}

/** Soma de jogos/gols das edições (nulls ignorados); nada somável = null (lacuna). */
export function buildTotals(seasons: SeasonRowInput[]): CompetitionTotals {
  let matches: number | null = null;
  let goals: number | null = null;
  for (const s of seasons) {
    if (typeof s.totalMatches === 'number') matches = (matches ?? 0) + s.totalMatches;
    if (typeof s.totalGoals === 'number') goals = (goals ?? 0) + s.totalGoals;
  }
  return { matches, goals };
}
