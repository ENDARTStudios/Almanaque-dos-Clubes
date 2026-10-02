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

export interface ClubComparison {
  clubA: CompareClub;
  clubB: CompareClub;
  titles: { clubA: HierarchyCount; clubB: HierarchyCount };
  rankings: { clubA: CompareRankingItem[] | null; clubB: CompareRankingItem[] | null };
  recentTitles: { clubA: RecentTitleItem[]; clubB: RecentTitleItem[] };
  headToHead: { exists: boolean; relations: string[]; matches: unknown[] };
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
  currentYear: number;
}): ClubComparison {
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
      // nunca inferida por geografia ou história (despacho WS-C-7).
      exists: input.h2hRelations.length > 0,
      relations: [...new Set(input.h2hRelations)].sort(),
      matches: [], // partidas detalhadas não existem no acervo (tabela vazia) — honesto
    },
  };
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

    const [titlesA, titlesB, rankingsA, rankingsB, h2hEdges] = await Promise.all([
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
    ]);

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
      currentYear: new Date().getUTCFullYear(),
    });
  });
}
