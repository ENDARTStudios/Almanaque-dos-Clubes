/**
 * T441 — Campeões vigentes por hierarquia (fonte: KnowledgeGraph `WON`).
 *
 * Honestidade 1.3: hierarquia sem aresta WON auditável → `champion: null`
 * com `reason` ("sem dados auditáveis"). Nunca inventar campeão.
 * Cache 1h (campeões mudam anualmente).
 */
import { prisma } from '../../config/prisma.js';
import { cache } from '../../services/cache.js';
import {
  RANKING_HIERARCHIES,
  isWomensCompetition,
  resolveHierarchy,
  type RankHierarchy,
} from '../rankings/ranking-algorithm.service.js';

export interface ChampionView {
  hierarchy: RankHierarchy;
  champion: {
    club: { id: string; name: string; country: string | null };
    competition: { id: string; name: string | null };
    season: number | null;
    /** URL de imagem do troféu (metadata.imageUrl) — hoje o acervo não tem; placeholder no frontend. */
    trophy: string | null;
    gender: 'men' | 'women' | null;
    ranking: { name: string; position: number; points: number | null } | null;
  } | null;
  reason?: string;
}

export interface ChampionsResponse {
  data: ChampionView[];
  generatedAt: string;
}

function isWomenEdge(
  comp: {
    qid: string | null;
    name: string | null;
    type: string | null;
    country: string | null;
  } | null,
  genderMeta: unknown,
): boolean {
  if (genderMeta === 'women') return true;
  return comp ? isWomensCompetition(comp) : false;
}

export async function loadChampions(gender?: 'men' | 'women'): Promise<ChampionsResponse> {
  const edges = await prisma.knowledgeGraph.findMany({
    where: { relation: 'WON' },
    select: { sourceId: true, sourceType: true, targetId: true, targetType: true, metadata: true },
  });

  const compIds = new Set<string>();
  for (const e of edges) {
    if (e.targetType === 'Competition') compIds.add(e.targetId);
  }
  const comps = compIds.size
    ? await prisma.competition.findMany({
        where: { id: { in: [...compIds] } },
        select: { id: true, qid: true, name: true, type: true, country: true },
      })
    : [];
  const compById = new Map(comps.map((c) => [c.id, c]));

  // Melhor (mais recente) campeão por hierarquia.
  const best = new Map<
    RankHierarchy,
    { clubId: string; compId: string | null; year: number; gender: 'men' | 'women' | null }
  >();
  for (const e of edges) {
    if (e.sourceType !== 'Club' || e.targetType !== 'Competition') continue;
    const comp = compById.get(e.targetId) ?? null;
    const hierarchy = resolveHierarchy(comp);
    const meta = (e.metadata as Record<string, unknown> | null) ?? {};
    const year = typeof meta.year === 'number' ? meta.year : null;
    const gender: 'men' | 'women' | null = isWomenEdge(comp, meta.gender) ? 'women' : 'men';
    const current = best.get(hierarchy);
    if (!current || (year !== null && year > current.year)) {
      best.set(hierarchy, { clubId: e.sourceId, compId: e.targetId, year: year ?? 0, gender });
    }
  }

  // Clubes + ranking vigente (último ranking publicado) em lote.
  const clubIds = [...best.values()].map((b) => b.clubId);
  const clubs = clubIds.length
    ? await prisma.club.findMany({
        where: { id: { in: clubIds } },
        select: { id: true, name: true, country: true },
      })
    : [];
  const clubById = new Map(clubs.map((c) => [c.id, c]));

  const latestRanking = await prisma.ranking.findFirst({
    where: { publishedAt: { not: null } },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    select: { id: true, name: true },
  });
  const rankingEntries =
    latestRanking && clubIds.length
      ? await prisma.rankingEntry.findMany({
          where: { rankingId: latestRanking.id, clubId: { in: clubIds }, position: { not: null } },
          select: { clubId: true, position: true, points: true },
        })
      : [];
  const entryByClub = new Map(rankingEntries.map((e) => [e.clubId, e]));

  const data: ChampionView[] = RANKING_HIERARCHIES.map((hierarchy) => {
    if (gender) {
      const b = best.get(hierarchy);
      if (!b || b.gender !== gender) {
        return { hierarchy, champion: null, reason: 'sem dados auditáveis' };
      }
    }
    const b = best.get(hierarchy);
    if (!b) return { hierarchy, champion: null, reason: 'sem dados auditáveis' };
    const club = clubById.get(b.clubId);
    if (!club) return { hierarchy, champion: null, reason: 'sem dados auditáveis' };
    const comp = b.compId ? compById.get(b.compId) : null;
    const entry = entryByClub.get(b.clubId);
    return {
      hierarchy,
      champion: {
        club: { id: club.id, name: club.name, country: club.country },
        competition: { id: b.compId ?? '', name: comp?.name ?? null },
        season: b.year || null,
        trophy: null, // acervo ainda sem imagens de troféu (HAS_TROPHY/imageUrl) — placeholder no frontend
        gender: b.gender,
        ranking:
          entry && latestRanking
            ? { name: latestRanking.name, position: entry.position ?? 0, points: entry.points }
            : null,
      },
    };
  });

  return { data, generatedAt: new Date().toISOString() };
}

export async function getChampions(gender?: 'men' | 'women'): Promise<ChampionsResponse> {
  // Campeões mudam anualmente — cache longo é seguro (invalidação via re-run).
  return cache.remember(`champions:${gender ?? 'all'}`, 3600, async () => loadChampions(gender));
}
