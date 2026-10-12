/**
 * WS-C-7 — Comparação lado a lado entre clubes (READ-ONLY, API-only).
 *
 * Títulos por hierarquia (arestas WON vivas, mesma contagem da timeline), ranking
 * publicado vigente, conquistas recentes (últimos 5 anos, cap 5 por clube) e
 * head-to-head SOMENTE com arestas Club↔Club explícitas no KG (nunca inferido) —
 * `matches` fica vazio porque o acervo não tem partidas registradas (honesto).
 *
 * Mapeamento puro (`countByHierarchy`/`pickRecentTitles`/`buildComparison`) para
 * testes; IO com cache TTL curto (padrão profile WS-C-1).
 */
import { prisma } from '../../config/prisma.js';
import { cache } from '../../services/cache.js';
import { clubsRepository, type ClubTitleView } from './repository.js';
import { loadRankings } from './profile.service.js';
import { excludeSoftDeleted } from '../graph/soft-delete.js';
import { RANKING_HIERARCHIES, type RankHierarchy } from '../rankings/ranking-algorithm.service.js';

const COMPARE_TTL_SECONDS = 300;
const RECENT_YEARS = 5;
const RECENT_CAP = 5;

export interface CompareClub {
  id: string;
  qid: string | null;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  foundedYear: number | null;
  coords: { latitude: number | null; longitude: number | null };
}

export interface HierarchyCount {
  municipal: number;
  estadual: number;
  nacional: number;
  continental: number;
  mundial: number;
  total: number;
}

export interface CompareRankingItem {
  rankingName: string;
  position: number | null;
  points: number | null;
  season: string | null;
}

export interface RecentTitleItem {
  year: number;
  competitionName: string | null;
  hierarchy: RankHierarchy;
}

export interface H2HMatch {
  date: string;
  homeClubId: string;
  awayClubId: string;
  homeScore: number;
  awayScore: number;
  competitionName: string | null;
  season: string | null;
}

export interface H2HSummary {
  played: number;
  winsA: number;
  draws: number;
  winsB: number;
  goalsA: number;
  goalsB: number;
}

export interface ClubComparison {
  clubA: CompareClub;
  clubB: CompareClub;
  titles: { clubA: HierarchyCount; clubB: HierarchyCount };
  rankings: { clubA: CompareRankingItem[] | null; clubB: CompareRankingItem[] | null };
  recentTitles: { clubA: RecentTitleItem[]; clubB: RecentTitleItem[] };
  headToHead: {
    exists: boolean;
    relations: string[];
    /** T523 — resumo do confronto direto nas partidas reais (null se nenhuma). */
    summary: H2HSummary | null;
    matches: H2HMatch[];
  };
}

/** PURO — agrega títulos por hierarquia (+ total). */
export function countByHierarchy(titles: ClubTitleView[]): HierarchyCount {
  const out = Object.fromEntries(RANKING_HIERARCHIES.map((h) => [h, 0])) as Record<
    RankHierarchy,
    number
  >;
  for (const t of titles) out[t.hierarchy] += 1;
  return { ...out, total: titles.length };
}

/** PURO — conquistas dos últimos `years` anos, ano DESC, cap `cap`. */
export function pickRecentTitles(
  titles: ClubTitleView[],
  currentYear: number,
  years = RECENT_YEARS,
  cap = RECENT_CAP,
): RecentTitleItem[] {
  const floor = currentYear - years;
  return titles
    .filter((t): t is ClubTitleView & { year: number } => t.year != null && t.year >= floor)
    .sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return (a.competition?.name ?? '').localeCompare(b.competition?.name ?? '');
    })
    .slice(0, cap)
    .map((t) => ({
      year: t.year,
      competitionName: t.competition?.name ?? null,
      hierarchy: t.hierarchy,
    }));
}

/** PURO — monta a comparação a partir dos dados carregados (sem IO). */
export function buildComparison(input: {
  clubA: CompareClub;
  clubB: CompareClub;
  titlesA: ClubTitleView[];
  titlesB: ClubTitleView[];
  rankingsA: CompareRankingItem[] | null;
  rankingsB: CompareRankingItem[] | null;
  h2hRelations: string[];
  h2hMatches: H2HMatch[];
  currentYear: number;
}): ClubComparison {
  const summary = buildH2HSummary(input.h2hMatches, input.clubA.id);
  return {
    clubA: input.clubA,
    clubB: input.clubB,
    titles: {
      clubA: countByHierarchy(input.titlesA),
      clubB: countByHierarchy(input.titlesB),
    },
    rankings: { clubA: input.rankingsA, clubB: input.rankingsB },
    recentTitles: {
      clubA: pickRecentTitles(input.titlesA, input.currentYear),
      clubB: pickRecentTitles(input.titlesB, input.currentYear),
    },
    headToHead: {
      // Rivalidade/confronto só com aresta EXPLÍCITA entre os dois clubes —
      // nunca inferida por geografia ou história (despacho WS-C-7). T523: as
      // PARTIDAS reais entre os dois agora existem no acervo e entram aqui.
      exists: input.h2hRelations.length > 0 || input.h2hMatches.length > 0,
      relations: [...new Set(input.h2hRelations)].sort(),
      summary,
      matches: input.h2hMatches,
    },
  };
}

/** PURO — resumo do confronto direto a partir das partidas entre A e B. */
export function buildH2HSummary(matches: H2HMatch[], aId: string): H2HSummary | null {
  if (matches.length === 0) return null;
  const s: H2HSummary = { played: 0, winsA: 0, draws: 0, winsB: 0, goalsA: 0, goalsB: 0 };
  for (const m of matches) {
    s.played += 1;
    const aIsHome = m.homeClubId === aId;
    const aGoals = aIsHome ? m.homeScore : m.awayScore;
    const bGoals = aIsHome ? m.awayScore : m.homeScore;
    s.goalsA += aGoals;
    s.goalsB += bGoals;
    if (aGoals > bGoals) s.winsA += 1;
    else if (aGoals === bGoals) s.draws += 1;
    else s.winsB += 1;
  }
  return s;
}

interface ClubRow {
  id: string;
  qid: string | null;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  foundedYear: number | null;
  latitude: number | null;
  longitude: number | null;
}

function toCompareClub(c: ClubRow): CompareClub {
  return {
    id: c.id,
    qid: c.qid,
    name: c.name,
    city: c.city,
    state: c.state,
    country: c.country,
    foundedYear: c.foundedYear,
    coords: { latitude: c.latitude, longitude: c.longitude },
  };
}

const CLUB_SELECT = {
  id: true,
  qid: true,
  name: true,
  city: true,
  state: true,
  country: true,
  foundedYear: true,
  latitude: true,
  longitude: true,
} as const;

export async function getClubComparison(aId: string, bId: string): Promise<ClubComparison | null> {
  return cache.remember(`clubs:compare:${aId}:${bId}`, COMPARE_TTL_SECONDS, async () => {
    const [rowA, rowB] = await Promise.all([
      prisma.club.findFirst({ where: { id: aId, deletedAt: null }, select: CLUB_SELECT }),
      prisma.club.findFirst({ where: { id: bId, deletedAt: null }, select: CLUB_SELECT }),
    ]);
    if (!rowA || !rowB) return null;

    const [titlesA, titlesB, rankingsA, rankingsB, h2hEdges, h2hRows] = await Promise.all([
      clubsRepository.listTitlesByClub(aId),
      clubsRepository.listTitlesByClub(bId),
      loadRankings(aId),
      loadRankings(bId),
      excludeSoftDeleted(
        await prisma.knowledgeGraph.findMany({
          where: {
            sourceType: 'Club',
            targetType: 'Club',
            OR: [
              { sourceId: aId, targetId: bId },
              { sourceId: bId, targetId: aId },
            ],
          },
          select: { relation: true, metadata: true },
        }),
      ),
      // T523 — partidas REAIS entre os dois (todas; o payload leva as 10 mais recentes).
      prisma.match.findMany({
        where: {
          status: 'FINISHED',
          homeScore: { not: null },
          awayScore: { not: null },
          OR: [
            { homeClubId: aId, awayClubId: bId },
            { homeClubId: bId, awayClubId: aId },
          ],
        },
        select: {
          date: true,
          homeClubId: true,
          awayClubId: true,
          homeScore: true,
          awayScore: true,
          competition: { select: { name: true } },
          season: { select: { name: true } },
        },
        orderBy: { date: 'desc' },
      }),
    ]);

    const h2hMatches: H2HMatch[] = h2hRows.map((m) => ({
      date: m.date.toISOString().slice(0, 10),
      homeClubId: m.homeClubId,
      awayClubId: m.awayClubId,
      homeScore: m.homeScore ?? 0,
      awayScore: m.awayScore ?? 0,
      competitionName: m.competition?.name ?? null,
      season: m.season?.name ?? null,
    }));

    const toCompareItems = (
      items: Awaited<ReturnType<typeof loadRankings>>,
    ): CompareRankingItem[] =>
      items.map((r) => ({
        rankingName: r.rankingName,
        position: r.position,
        points: r.points,
        season: r.season,
      }));

    return buildComparison({
      clubA: toCompareClub(rowA),
      clubB: toCompareClub(rowB),
      titlesA,
      titlesB,
      rankingsA: rankingsA.length > 0 ? toCompareItems(rankingsA) : null,
      rankingsB: rankingsB.length > 0 ? toCompareItems(rankingsB) : null,
      h2hRelations: h2hEdges.map((e) => e.relation),
      h2hMatches: h2hMatches.slice(0, 10),
      currentYear: new Date().getUTCFullYear(),
    });
  });
}
