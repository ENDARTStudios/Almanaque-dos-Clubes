import type { ClubStatistics, Crest, KitEntry, SquadPlayer } from './types';

/**
 * DERIVAÇÕES da ficha de clube — funções puras, sem fetch e sem estado.
 *
 * Tudo o que sai daqui é soma/ordenação de dado real que a API entregou. O que não
 * existe vira `null` e a tela declara "—"; nunca 0, nunca estimativa.
 */

/** Idade em anos completos a partir de `birthDate` (UTC) — mesma régua da API. */
export function ageFromBirthDate(
  value: string | Date | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!value) return null;
  const birth = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(birth.getTime())) return null;
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  // Guarda de plausibilidade: data futura ou 130+ é data errada na fonte, não longevidade.
  if (age < 0 || age >= 130) return null;
  return age;
}

/** Anos completos desde a fundação. `null` quando o ano é implausível. */
export function yearsSince(
  foundedYear: number | null | undefined,
  now: Date = new Date(),
): number | null {
  if (foundedYear == null) return null;
  const age = now.getUTCFullYear() - foundedYear;
  return age >= 0 && age < 400 ? age : null;
}

export interface CompetitionStatRow {
  key: string;
  name: string | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  /** Pontos ÷ (jogos × 3) em %, arredondado. `null` sem jogos. */
  percentage: number | null;
}

/**
 * Agrega `byCompetition` (que a API entrega por competição+TEMPORADA) por
 * competição. A tabela do quadro é por competição; a nota do bloco declara que a soma
 * cobre todas as temporadas catalogadas.
 */
export function groupCompetitionStats(rows: ClubStatistics['byCompetition']): CompetitionStatRow[] {
  const byKey = new Map<string, CompetitionStatRow>();
  for (const row of rows) {
    const key = row.competitionId ?? row.competitionName ?? '-';
    let entry = byKey.get(key);
    if (!entry) {
      entry = {
        key,
        name: row.competitionName,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
        percentage: null,
      };
      byKey.set(key, entry);
    }
    if (!entry.name && row.competitionName) entry.name = row.competitionName;
    entry.played += row.played;
    entry.wins += row.wins;
    entry.draws += row.draws;
    entry.losses += row.losses;
    entry.goalsFor += row.goalsFor;
    entry.goalsAgainst += row.goalsAgainst;
    entry.points += row.points;
  }
  return [...byKey.values()]
    .map((entry) => ({
      ...entry,
      percentage: entry.played > 0 ? Math.round((entry.points / (entry.played * 3)) * 100) : null,
    }))
    .sort((a, b) => b.played - a.played || (a.name ?? '').localeCompare(b.name ?? ''));
}

export interface HonourRow {
  key: string;
  competitionId: string | null;
  competitionName: string | null;
  gender: 'men' | 'women';
  titles: number;
  years: number[];
  seasons: string[];
  sourceUrl: string | null;
}

/** Agrupa os títulos (uma aresta WON por ano) por competição e gênero. */
export function groupHonours(items: ClubProfileTitles): HonourRow[] {
  const byKey = new Map<string, HonourRow>();
  for (const item of items) {
    const key = `${item.competition?.id ?? item.competition?.name ?? '-'}|${item.gender}`;
    let row = byKey.get(key);
    if (!row) {
      row = {
        key,
        competitionId: item.competition?.id ?? null,
        competitionName: item.competition?.name ?? null,
        gender: item.gender,
        titles: 0,
        years: [],
        seasons: [],
        sourceUrl: null,
      };
      byKey.set(key, row);
    }
    row.titles += 1;
    if (item.year != null && !row.years.includes(item.year)) row.years.push(item.year);
    if (item.season && !row.seasons.includes(item.season)) row.seasons.push(item.season);
    if (!row.sourceUrl && item.sourceUrl) row.sourceUrl = item.sourceUrl;
  }
  return [...byKey.values()]
    .map((row) => ({ ...row, years: [...row.years].sort((a, b) => a - b) }))
    .sort(
      (a, b) =>
        b.titles - a.titles ||
        (a.competitionName ?? '').localeCompare(b.competitionName ?? '') ||
        a.gender.localeCompare(b.gender),
    );
}

type ClubProfileTitles = Array<{
  year: number | null;
  season: string | null;
  competition: { id: string; name: string | null } | null;
  gender: 'men' | 'women';
  sourceUrl: string | null;
}>;

/** "1981 · 2019 · 2022" — anos reais; vazio quando nenhum ano foi catalogado. */
export function formatYears(row: HonourRow): string {
  if (row.years.length > 0) return row.years.join(' · ');
  return row.seasons.join(' · ');
}

/** Cores declaradas de um uniforme (corpo primeiro), em hex MAIÚSCULO, sem repetição. */
export function kitColors(kit: KitEntry): string[] {
  const parts = kit.parts ?? {};
  const order = ['body', 'leftarm', 'rightarm', 'shorts', 'socks'];
  const colors: string[] = [];
  for (const partName of order) {
    const color = parts[partName]?.color;
    if (typeof color !== 'string' || color.trim().length === 0) continue;
    const hex = color.trim().toUpperCase();
    if (!colors.includes(hex)) colors.push(hex);
  }
  return colors;
}

/** Cor da camisa (corpo > manga > calção) para o swatch do cartão. */
export function kitShirtColor(kit: KitEntry): string | null {
  return kitColors(kit)[0] ?? null;
}

/** Escudo vigente: o marcado `isCurrent`; sem ele, o último datado da lista. */
export function currentCrest(crests: Crest[]): Crest | null {
  if (crests.length === 0) return null;
  return (
    crests.find((crest) => crest.isCurrent) ??
    [...crests].sort((a, b) => (b.yearFrom ?? -1) - (a.yearFrom ?? -1))[0] ??
    null
  );
}

/** Idade do jogador para a tabela do elenco. */
export function squadAge(player: SquadPlayer, now: Date = new Date()): number | null {
  return ageFromBirthDate(player.birthDate, now);
}
