import type { Locale } from '@/i18n/config';
import type { CompetitionSeasonRow, SeasonCompetition, SeasonMatch, StandingRow } from './types';

/**
 * DERIVAÇÕES DA TEMPORADA — funções puras, sem React e sem fetch.
 *
 * O quadro pede métricas (partidas, gols, média, 0 a 0, maior goleada), tabela e séries. A API
 * NÃO serve um agregado de temporada: ela serve temporada, partidas e o resumo catalogado de
 * cada competição. Tudo o que a tela mostra é DERIVADO dessas fontes — nenhum número é escrito
 * à mão. As regras estão replicadas das funções do servidor (apps/api/.../match-stats.ts) para
 * que a tela e a API não discordem do mesmo dado:
 *
 *   · partida sem placar NÃO vira 0×0 e não entra em nenhum agregado;
 *   · maior goleada = maior margem; empate na margem fica com a partida de mais gols;
 *   · vitória = 3 pontos (a régua do acervo, que só tem partidas de 2015 em diante);
 *   · ordenação da tabela: pontos, saldo, gols pró, id do clube (critério estável).
 */

const INTL_TAG: Record<Locale, string> = {
  'pt-br': 'pt-BR',
  'en-us': 'en-US',
  'es-es': 'es-ES',
};

/** Traço de lacuna declarada. Não é texto traduzível: é o sinal universal de ausência. */
export const GAP = '—';

/**
 * Data do acervo em UTC. As partidas vêm como meia-noite UTC; formatar no fuso do navegador
 * recuaria um dia no Brasil (12/05 virava 11/05) — o mesmo cuidado que /matches já toma.
 */
export function formatMatchDate(value: string, locale: Locale): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(INTL_TAG[locale] ?? 'pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/** Mês abreviado para a linha do tempo ("AGO", "AUG"). */
export function formatMonthShort(value: string, locale: Locale): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const month = new Intl.DateTimeFormat(INTL_TAG[locale] ?? 'pt-BR', {
    month: 'short',
    timeZone: 'UTC',
  }).format(date);
  return month.replace(/\.$/, '').toUpperCase();
}

/** Média com duas casas e separador do idioma (2,69 / 2.69). */
export function formatAverage(value: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_TAG[locale] ?? 'pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Saldo de gols com sinal explícito, como na tabela do conceito (+45 / -4 / 0). */
export function formatGoalDifference(value: number | null): string {
  if (value == null) return GAP;
  return value > 0 ? '+' + value : String(value);
}

export function hasScore(
  match: SeasonMatch,
): match is SeasonMatch & { homeScore: number; awayScore: number } {
  return (
    match.homeScore != null &&
    Number.isFinite(match.homeScore) &&
    match.awayScore != null &&
    Number.isFinite(match.awayScore)
  );
}

export interface MatchReference {
  id: string;
  date: string;
  round: string | null;
  homeName: string | null;
  awayName: string | null;
  homeScore: number | null;
  awayScore: number | null;
  margin: number | null;
  goals: number | null;
}

function toReference(match: SeasonMatch): MatchReference {
  const scored = hasScore(match);
  return {
    id: match.id,
    date: match.date,
    round: match.round,
    homeName: match.homeClub?.name ?? null,
    awayName: match.awayClub?.name ?? null,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    margin: scored ? Math.abs(match.homeScore - match.awayScore) : null,
    goals: scored ? match.homeScore + match.awayScore : null,
  };
}

export interface SeasonMetrics {
  /** Partidas catalogadas (com ou sem placar). */
  total: number;
  /** Partidas com os dois placares — base de gols/média/0 a 0. */
  scored: number;
  goals: number;
  average: number | null;
  goalless: number;
  biggestWin: MatchReference | null;
  highestScoring: MatchReference | null;
  firstMatch: MatchReference | null;
  lastMatch: MatchReference | null;
  results: { homeWins: number; draws: number; awayWins: number } | null;
  /**
   * Rodadas da competição com mais rodadas na temporada. É o número que o conceito usa como
   * âncora ("38 rodadas"): a soma de rodadas de DUAS competições (38 + 9) não é uma rodada de
   * nada, e o rótulo do cabeçalho fala de uma só.
   */
  rounds: number;
}

function timeOf(value: string): number {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

/**
 * Métricas da temporada. Agregado vazio é `null` (lacuna), nunca zero: zero é uma afirmação.
 */
export function computeSeasonMetrics(matches: SeasonMatch[]): SeasonMetrics {
  const scoredMatches = matches.filter(hasScore);
  let goals = 0;
  let goalless = 0;
  let biggestWin: MatchReference | null = null;
  let highestScoring: MatchReference | null = null;
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;

  for (const match of scoredMatches) {
    const reference = toReference(match);
    goals += reference.goals ?? 0;
    if (reference.goals === 0) goalless++;
    if (
      !biggestWin ||
      (reference.margin ?? 0) > (biggestWin.margin ?? 0) ||
      ((reference.margin ?? 0) === (biggestWin.margin ?? 0) &&
        (reference.goals ?? 0) > (biggestWin.goals ?? 0))
    ) {
      biggestWin = reference;
    }
    if (!highestScoring || (reference.goals ?? 0) > (highestScoring.goals ?? 0)) {
      highestScoring = reference;
    }
    const homeScore = match.homeScore;
    const awayScore = match.awayScore;
    if (homeScore > awayScore) homeWins++;
    else if (homeScore < awayScore) awayWins++;
    else draws++;
  }

  let firstMatch: MatchReference | null = null;
  let lastMatch: MatchReference | null = null;
  for (const match of matches) {
    const reference = toReference(match);
    if (!firstMatch || timeOf(reference.date) < timeOf(firstMatch.date)) firstMatch = reference;
    if (!lastMatch || timeOf(reference.date) > timeOf(lastMatch.date)) lastMatch = reference;
  }

  const roundsByCompetition = new Map<string, Set<string>>();
  for (const match of matches) {
    const label = match.round?.trim();
    if (!label) continue;
    const key = match.competition?.id ?? '';
    const labels = roundsByCompetition.get(key) ?? new Set<string>();
    labels.add(label);
    roundsByCompetition.set(key, labels);
  }
  const rounds = [...roundsByCompetition.values()].reduce(
    (most, labels) => (labels.size > most ? labels.size : most),
    0,
  );

  return {
    total: matches.length,
    scored: scoredMatches.length,
    goals,
    average: scoredMatches.length > 0 ? goals / scoredMatches.length : null,
    goalless,
    biggestWin,
    highestScoring,
    firstMatch,
    lastMatch,
    results: scoredMatches.length > 0 ? { homeWins, draws, awayWins } : null,
    rounds,
  };
}

export interface CompetitionGroup {
  id: string;
  name: string;
  matches: number;
}

/** Competições que TÊM partida na temporada, ordenadas por volume. Fonte: os próprios jogos. */
export function groupCompetitions(matches: SeasonMatch[]): CompetitionGroup[] {
  const byId = new Map<string, CompetitionGroup>();
  for (const match of matches) {
    const competition = match.competition;
    if (!competition) continue;
    const current = byId.get(competition.id);
    if (current) current.matches++;
    else byId.set(competition.id, { id: competition.id, name: competition.name, matches: 1 });
  }
  return [...byId.values()].sort((a, b) => b.matches - a.matches || a.name.localeCompare(b.name));
}

function countClubMatches(matches: SeasonMatch[], clubId: string): number {
  return matches.filter((match) => match.homeClub?.id === clubId || match.awayClub?.id === clubId)
    .length;
}

export interface StandingsEntry {
  position: number;
  clubId: string | null;
  clubName: string | null;
  played: number | null;
  won: number | null;
  drawn: number | null;
  lost: number | null;
  goalDifference: number | null;
  points: number | null;
}

interface Accumulated {
  clubId: string;
  clubName: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
}

/**
 * Tabela de pontos corridos de UMA competição na temporada. Mesmo critério do servidor:
 * pontos (3 por vitória) → saldo → gols pró → id do clube. Só partidas com placar entram.
 */
export function buildSeasonTable(matches: SeasonMatch[], competitionId: string): StandingsEntry[] {
  const byClub = new Map<string, Accumulated>();

  const acquire = (clubId: string, clubName: string | null): Accumulated => {
    const current = byClub.get(clubId);
    if (current) {
      if (!current.clubName && clubName) current.clubName = clubName;
      return current;
    }
    const created: Accumulated = {
      clubId,
      clubName,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    };
    byClub.set(clubId, created);
    return created;
  };

  for (const match of matches) {
    if (match.competition?.id !== competitionId) continue;
    if (!hasScore(match)) continue;
    const homeId = match.homeClub?.id;
    const awayId = match.awayClub?.id;
    if (!homeId || !awayId) continue;

    const home = acquire(homeId, match.homeClub?.name ?? null);
    const away = acquire(awayId, match.awayClub?.name ?? null);

    home.played++;
    away.played++;
    home.goalsFor += match.homeScore;
    home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore;
    away.goalsAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.won++;
      away.lost++;
    } else if (match.homeScore < match.awayScore) {
      away.won++;
      home.lost++;
    } else {
      home.drawn++;
      away.drawn++;
    }
  }

  return [...byClub.values()]
    .map((club) => ({
      club,
      points: club.won * 3 + club.drawn,
      goalDifference: club.goalsFor - club.goalsAgainst,
    }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.club.goalsFor !== a.club.goalsFor) return b.club.goalsFor - a.club.goalsFor;
      return a.club.clubId < b.club.clubId ? -1 : a.club.clubId > b.club.clubId ? 1 : 0;
    })
    .map((entry, index) => ({
      position: index + 1,
      clubId: entry.club.clubId,
      clubName: entry.club.clubName,
      played: entry.club.played,
      won: entry.club.won,
      drawn: entry.club.drawn,
      lost: entry.club.lost,
      goalDifference: entry.goalDifference,
      points: entry.points,
    }));
}

/** Classificação publicada pela fonte → linha uniforme da tabela. Lacuna continua lacuna. */
export function normalizeStandings(rows: StandingRow[]): StandingsEntry[] {
  return rows
    .filter((row) => row.position != null && Number.isFinite(row.position))
    .map((row) => ({
      position: row.position as number,
      clubId: row.clubId,
      clubName: row.clubName,
      played: row.played,
      won: row.won,
      drawn: row.drawn,
      lost: row.lost,
      goalDifference:
        row.goalsFor != null && row.goalsAgainst != null ? row.goalsFor - row.goalsAgainst : null,
      points: row.points,
    }))
    .sort((a, b) => a.position - b.position);
}

export type StandingsSource = 'official' | 'derived';

export interface StandingsResult {
  entries: StandingsEntry[];
  source: StandingsSource;
}

/**
 * Tabela final de UMA competição da temporada.
 *
 * Preferência: a tabela catalogada pela fonte (é a final publicada). Sem ela, a tabela é
 * derivada das partidas do acervo — e a tela DECLARA a diferença. Competição que não é liga
 * (copa/torneio) não recebe "classificação final": tabela de pontos de fase de grupos não é
 * a classificação final de nada.
 */
export function standingsFor(
  competition: SeasonCompetition,
  matches: SeasonMatch[],
): StandingsResult | null {
  if (competition.type !== 'LEAGUE') return null;
  const official = competition.season?.standings ?? [];
  if (official.length > 0) {
    const entries = normalizeStandings(official);
    if (entries.length > 0) return { entries, source: 'official' };
  }
  const derived = buildSeasonTable(matches, competition.id);
  return derived.length > 0 ? { entries: derived, source: 'derived' } : null;
}

/** Competição da tabela: liga com tabela catalogada primeiro; senão a liga de maior volume. */
export function pickStandingsCompetition(
  competitions: SeasonCompetition[],
  matches: SeasonMatch[],
): SeasonCompetition | null {
  const leagues = competitions.filter((competition) => competition.type === 'LEAGUE');
  if (leagues.length === 0) return null;
  const count = (competition: SeasonCompetition) =>
    matches.filter((match) => match.competition?.id === competition.id).length;
  const official = leagues.filter(
    (competition) => (competition.season?.standings?.length ?? 0) > 0,
  );
  const pool = official.length > 0 ? official : leagues;
  return [...pool].sort((a, b) => count(b) - count(a) || a.name.localeCompare(b.name))[0] ?? null;
}

/** Artilheiro só entra se for um número de gols plausível para UMA temporada. */
function plausibleTopScorer(
  topScorer: CompetitionSeasonRow['topScorer'],
): { name: string; goals: number } | null {
  if (!topScorer) return null;
  const name = topScorer.name?.trim();
  const goals = topScorer.goals;
  // O acervo tem linha corrompida (artilheiro com 33.778 gols). Número impossível não é dado:
  // é lacuna declarada, como qualquer outro campo que a fonte não sustenta.
  if (!name || !Number.isFinite(goals) || goals < 1 || goals > 100) return null;
  return { name, goals };
}

export interface CompetitionRow {
  id: string;
  name: string;
  champion: string | null;
  points: number | null;
  played: number | null;
  topScorer: { name: string; goals: number } | null;
  /** Campeão derivado da pontuação das partidas, não do resumo catalogado. */
  derivedChampion: boolean;
}

export interface CompetitionRowsResult {
  rows: CompetitionRow[];
  /** Ao menos um campeão foi derivado — a tela precisa declarar o método. */
  derivedChampion: boolean;
}

/**
 * Linhas de "Competições nesta temporada".
 *
 * Campeão: o catalogado pela fonte quando existe. Sem resumo catalogado, liga recebe o líder
 * por pontos das partidas do acervo (DERIVADO, declarado na nota) — e copa NÃO recebe, porque
 * mata-mata não se decide por pontos. Pts/J: só de dado real (tabela catalogada / partidas).
 * J = partidas do clube naquela competição dentro da temporada.
 */
export function buildCompetitionRows(
  competitions: SeasonCompetition[],
  matches: SeasonMatch[],
): CompetitionRowsResult {
  let anyDerived = false;

  const rows: CompetitionRow[] = competitions.map((competition) => {
    const scoped = matches.filter((match) => match.competition?.id === competition.id);
    const official = competition.season?.champion ?? null;
    let champion: string | null = official?.name ?? null;
    let points: number | null = null;
    let played: number | null = null;
    let derivedChampion = false;

    if (official) {
      if (competition.type === 'LEAGUE') {
        const row =
          competition.season?.standings?.find((standing) => standing.clubId === official.id) ??
          null;
        points = row?.points ?? null;
      }
      const games = official.id ? countClubMatches(scoped, official.id) : scoped.length;
      played = games > 0 ? games : null;
    } else if (competition.type === 'LEAGUE') {
      const leader = buildSeasonTable(scoped, competition.id)[0] ?? null;
      if (leader) {
        champion = leader.clubName;
        points = leader.points;
        played = leader.played;
        derivedChampion = true;
        anyDerived = true;
      }
    }

    return {
      id: competition.id,
      name: competition.name,
      champion,
      points,
      played,
      topScorer: plausibleTopScorer(competition.season?.topScorer ?? null),
      derivedChampion,
    };
  });

  const countById = new Map<string, number>();
  for (const match of matches) {
    const id = match.competition?.id;
    if (!id) continue;
    countById.set(id, (countById.get(id) ?? 0) + 1);
  }
  rows.sort(
    (a, b) =>
      (countById.get(b.id) ?? 0) - (countById.get(a.id) ?? 0) || a.name.localeCompare(b.name),
  );

  return { rows, derivedChampion: anyDerived };
}

export interface RoundSeries {
  points: { label: string; value: number }[];
  rounds: number;
  totalGoals: number;
  matches: number;
  best: { label: string; value: number } | null;
  average: number | null;
}

function roundNumber(label: string): number | null {
  const parsed = Number.parseInt(label, 10);
  return Number.isInteger(parsed) && String(parsed) === label.trim() ? parsed : null;
}

/**
 * Gols por rodada de UMA competição de LIGA, com rodada NUMERADA.
 *
 * ── POR QUE SÓ RODADA NUMÉRICA ────────────────────────────────────────────────────────────
 * Em copa, o rótulo de "rodada" é fase: "Group G", "Round of 16", "Final". Agrupar gols por
 * esses rótulos e desenhar uma linha produziria uma série que não é "gols por rodada" — seria
 * "gols por grupo", uma leitura enganosa com cara de gráfico. Sem rodada numerada, a série não
 * existe e o gráfico é omitido; o donut de resultados continua (esse é por partida, não por
 * fase).
 *
 * Rodada numérica ordena como número ("10" depois de "9"). */

export function goalsByRound(matches: SeasonMatch[], competitionId: string): RoundSeries | null {
  const scoped = matches.filter(
    (match) => match.competition?.id === competitionId && hasScore(match),
  );
  const byRound = new Map<string, number>();
  let totalGoals = 0;

  for (const match of scoped) {
    const label = match.round?.trim();
    if (!label) continue;
    const goals = (match.homeScore ?? 0) + (match.awayScore ?? 0);
    totalGoals += goals;
    byRound.set(label, (byRound.get(label) ?? 0) + goals);
  }

  if (byRound.size === 0) return null;
  // Fase de copa (grupo/mata-mata) não é rodada: sem numeração, sem série.
  if ([...byRound.keys()].some((label) => roundNumber(label) == null)) return null;

  const labels = [...byRound.keys()].sort((a, b) => {
    const numberA = roundNumber(a);
    const numberB = roundNumber(b);
    if (numberA != null && numberB != null) return numberA - numberB;
    if (numberA != null) return -1;
    if (numberB != null) return 1;
    return a.localeCompare(b);
  });

  const points = labels.map((label) => ({ label, value: byRound.get(label) ?? 0 }));
  const best = points.reduce<{ label: string; value: number } | null>(
    (current, point) => (!current || point.value > current.value ? point : current),
    null,
  );

  return {
    points,
    rounds: points.length,
    totalGoals,
    matches: scoped.length,
    best,
    average: scoped.length > 0 ? totalGoals / scoped.length : null,
  };
}

export interface ResultsDistribution {
  homeWins: number;
  draws: number;
  awayWins: number;
  total: number;
}

/** Distribuição de resultados das partidas com placar (donut do quadro). */
export function resultsDistribution(matches: SeasonMatch[]): ResultsDistribution | null {
  const scored = matches.filter(hasScore);
  if (scored.length === 0) return null;
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;
  for (const match of scored) {
    if (match.homeScore > match.awayScore) homeWins++;
    else if (match.homeScore < match.awayScore) awayWins++;
    else draws++;
  }
  return { homeWins, draws, awayWins, total: scored.length };
}

export type MilestoneKind = 'opening' | 'biggestWin' | 'highestScoring' | 'closing';

export interface Milestone {
  kind: MilestoneKind;
  match: MatchReference;
}

/**
 * Linha do tempo da temporada: só marcos que o dado sustenta — primeira partida, maior
 * goleada, jogo com mais gols e última partida. Um mesmo jogo não entra duas vezes, e o
 * resultado sai em ordem cronológica.
 */
export function seasonMilestones(metrics: SeasonMetrics): Milestone[] {
  const seen = new Set<string>();
  const milestones: Milestone[] = [];

  const push = (kind: MilestoneKind, match: MatchReference | null) => {
    if (!match || seen.has(match.id)) return;
    seen.add(match.id);
    milestones.push({ kind, match });
  };

  push('opening', metrics.firstMatch);
  push('closing', metrics.lastMatch);
  push('biggestWin', metrics.biggestWin);
  push('highestScoring', metrics.highestScoring);

  return milestones.sort((a, b) => timeOf(a.match.date) - timeOf(b.match.date));
}

/**
 * Escolhe a linha do resumo catalogado que corresponde à temporada da página.
 *
 * O rótulo do resumo ("2024-25") e o nome da temporada no acervo ("2024-25") coincidem na
 * origem, mas fontes diferentes usam separadores diferentes ("2024/25"). A comparação é
 * exata primeiro e, só como alternativa, normalizada — nunca por aproximação de ano.
 */
export function pickSeasonRow(
  rows: CompetitionSeasonRow[],
  seasonName: string,
): CompetitionSeasonRow | null {
  const exact = rows.find((row) => row.season === seasonName);
  if (exact) return exact;
  const normalize = (value: string) => value.trim().replace(/\//g, '-');
  const wanted = normalize(seasonName);
  const normalized = rows.filter((row) => normalize(row.season) === wanted);
  return normalized.length === 1 ? normalized[0] : null;
}
