/**
 * WS-C-5 — Timeline de conquistas e clubes relacionados (READ-ONLY, API-only).
 *
 * Timeline: arestas WON do clube no KnowledgeGraph ordenadas por ano (DESC, nulos
 * por último) com proveniência por aresta. Não inventa: sem conquista auditável →
 * timeline vazio-honesto ([]).
 *
 * Related: same_city/same_state (mesmo valor não-nulo + mesmo país — homônimos de
 * cidade em países distintos não são vizinhos), same_competition (campeões da mesma
 * competição via WON + participantes do mesmo ranking publicado) e rival SOMENTE com
 * aresta RIVAL explícita no KG (nunca inferido). Dedupe por clube mantendo a melhor
 * confiança; teto de 12; exclui o próprio clube e soft-deletados.
 *
 * Mapeamento puro (`buildTimeline`/`mergeRelated`) para testes; IO injetado via
 * repositório/prisma. Cache TTL curto (mesmo padrão do profile WS-C-1).
 */
import { prisma } from '../../config/prisma.js';
import { cache } from '../../services/cache.js';
import { clubsRepository, type ClubTitleView } from './repository.js';
import { excludeSoftDeleted } from '../graph/soft-delete.js';
import { RANKING_HIERARCHIES, type RankHierarchy } from '../rankings/ranking-algorithm.service.js';

const RELATED_TTL_SECONDS = 300;
/** Teto da resposta (despacho WS-C-5). */
export const RELATED_LIMIT = 12;
/** Teto por categoria ANTES do merge (determinismo: nome asc). */
export const CATEGORY_QUERY_CAP = 24;

/** Escala de confiança declarada — determinística, sem heurística oculta. */
export const RELATED_CONFIDENCE = {
  rival: 1,
  same_city: 0.9,
  same_competition_won: 0.8,
  same_state: 0.7,
  same_competition_ranking: 0.6,
} as const;

export type RelatedType = 'same_city' | 'same_state' | 'same_competition' | 'rival';

/** Empate de confiança: ordem de prioridade declarada (menor = vence). */
export const RELATED_TYPE_PRIORITY: Record<RelatedType, number> = {
  rival: 0,
  same_city: 1,
  same_competition: 2,
  same_state: 3,
};

export interface TimelineItem {
  year: number | null;
  season: string | null;
  competitionId: string | null;
  competitionQid: string | null;
  competitionName: string | null;
  hierarchy: RankHierarchy;
  source: string | null;
  sourceUrl: string | null;
}

export interface ClubTimeline {
  clubId: string;
  qid: string | null;
  name: string;
  timeline: TimelineItem[];
  totalTitles: number;
  byHierarchy: Record<RankHierarchy, number>;
}

export interface RelatedItem {
  clubId: string;
  qid: string | null;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  relationType: RelatedType;
  confidence: number;
}

export interface ClubRelated {
  clubId: string;
  related: RelatedItem[];
}

const HIERARCHY_KEYS = RANKING_HIERARCHIES;

/** PURO — ordena (ano DESC, nulos por último; nome; temporada) e agrega porHierarchy. */
export function buildTimeline(
  club: { id: string; qid: string | null; name: string },
  titles: ClubTitleView[],
): ClubTimeline {
  const timeline: TimelineItem[] = [...titles]
    .sort((a, b) => {
      const ya = a.year ?? Number.NEGATIVE_INFINITY;
      const yb = b.year ?? Number.NEGATIVE_INFINITY;
      if (yb !== ya) return yb - ya;
      const na = a.competition?.name ?? '';
      const nb = b.competition?.name ?? '';
      if (na !== nb) return na.localeCompare(nb);
      return (a.season ?? '').localeCompare(b.season ?? '');
    })
    .map((t) => ({
      year: t.year,
      season: t.season,
      competitionId: t.competition?.id ?? null,
      competitionQid: t.competitionQid,
      competitionName: t.competition?.name ?? null,
      hierarchy: t.hierarchy,
      source: t.source,
      sourceUrl: t.sourceUrl,
    }));
  const byHierarchy = Object.fromEntries(HIERARCHY_KEYS.map((h) => [h, 0])) as Record<
    RankHierarchy,
    number
  >;
  for (const t of timeline) byHierarchy[t.hierarchy] += 1;
  return {
    clubId: club.id,
    qid: club.qid,
    name: club.name,
    timeline,
    totalTitles: timeline.length,
    byHierarchy,
  };
}

/** PURO — exclui self, dedupe por clube (melhor confiança; empate → prioridade), ordena e corta 12. */
export function mergeRelated(candidates: RelatedItem[], selfId: string): RelatedItem[] {
  const byId = new Map<string, RelatedItem>();
  for (const c of candidates) {
    if (c.clubId === selfId) continue;
    const prev = byId.get(c.clubId);
    if (!prev) {
      byId.set(c.clubId, c);
      continue;
    }
    const better =
      c.confidence > prev.confidence ||
      (c.confidence === prev.confidence &&
        RELATED_TYPE_PRIORITY[c.relationType] < RELATED_TYPE_PRIORITY[prev.relationType]);
    if (better) byId.set(c.clubId, c);
  }
  return [...byId.values()]
    .sort(
      (a, b) =>
        b.confidence - a.confidence ||
        a.name.localeCompare(b.name) ||
        a.clubId.localeCompare(b.clubId),
    )
    .slice(0, RELATED_LIMIT);
}

const CLUB_SELECT = {
  id: true,
  qid: true,
  name: true,
  city: true,
  state: true,
  country: true,
} as const;
type RelatedClubRow = {
  id: string;
  qid: string | null;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
};

function toItem(c: RelatedClubRow, relationType: RelatedType, confidence: number): RelatedItem {
  return {
    clubId: c.id,
    qid: c.qid,
    name: c.name,
    city: c.city,
    state: c.state,
    country: c.country,
    relationType,
    confidence,
  };
}

export async function getClubTimeline(id: string): Promise<ClubTimeline | null> {
  return cache.remember(`clubs:timeline:${id}`, RELATED_TTL_SECONDS, async () => {
    const club = await prisma.club.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, qid: true, name: true },
    });
    if (!club) return null;
    const titles = await clubsRepository.listTitlesByClub(id);
    return buildTimeline(club, titles);
  });
}

export async function getClubRelated(id: string): Promise<ClubRelated | null> {
  return cache.remember(`clubs:related:${id}`, RELATED_TTL_SECONDS, async () => {
    const club = await prisma.club.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, city: true, state: true, country: true },
    });
    if (!club) return null;
    const candidates: RelatedItem[] = [];

    // rival — SOMENTE aresta RIVAL explícita (nunca inferida por geografia/história).
    const rivalEdges = excludeSoftDeleted(
      await prisma.knowledgeGraph.findMany({
        where: {
          relation: 'RIVAL',
          OR: [
            { sourceId: id, sourceType: 'Club' },
            { targetId: id, targetType: 'Club' },
          ],
        },
        select: {
          sourceId: true,
          sourceType: true,
          targetId: true,
          targetType: true,
          metadata: true,
        },
      }),
    );
    const rivalIds = [
      ...new Set(
        rivalEdges
          .map((e) => (e.sourceId === id && e.sourceType === 'Club' ? e.targetId : e.sourceId))
          .filter((v) => v !== id),
      ),
    ];
    const rivals = rivalIds.length
      ? await prisma.club.findMany({
          where: { id: { in: rivalIds }, deletedAt: null },
          select: CLUB_SELECT,
          orderBy: { name: 'asc' },
        })
      : [];
    candidates.push(...rivals.map((c) => toItem(c, 'rival', RELATED_CONFIDENCE.rival)));

    // same_city / same_state — mesmo valor não-nulo + mesmo país.
    if (club.city && club.country) {
      const sameCity = await prisma.club.findMany({
        where: { deletedAt: null, city: club.city, country: club.country, id: { not: id } },
        select: CLUB_SELECT,
        orderBy: { name: 'asc' },
        take: CATEGORY_QUERY_CAP,
      });
      candidates.push(...sameCity.map((c) => toItem(c, 'same_city', RELATED_CONFIDENCE.same_city)));
    }
    if (club.state && club.country) {
      const sameState = await prisma.club.findMany({
        where: { deletedAt: null, state: club.state, country: club.country, id: { not: id } },
        select: CLUB_SELECT,
        orderBy: { name: 'asc' },
        take: CATEGORY_QUERY_CAP,
      });
      candidates.push(
        ...sameState.map((c) => toItem(c, 'same_state', RELATED_CONFIDENCE.same_state)),
      );
    }

    // same_competition — campeões da mesma competição (WON) + participantes do
    // mesmo ranking publicado (fontes reais de participação no acervo).
    const titles = await clubsRepository.listTitlesByClub(id);
    const compIds = [
      ...new Set(titles.map((t) => t.competition?.id).filter((v): v is string => !!v)),
    ];
    if (compIds.length) {
      const wonEdges = excludeSoftDeleted(
        await prisma.knowledgeGraph.findMany({
          where: {
            relation: 'WON',
            OR: [
              { sourceType: 'Competition', targetType: 'Club', sourceId: { in: compIds } },
              { targetType: 'Competition', sourceType: 'Club', targetId: { in: compIds } },
            ],
          },
          select: {
            sourceId: true,
            sourceType: true,
            targetId: true,
            targetType: true,
            metadata: true,
          },
          take: 500,
        }),
      );
      const winnerIds = [
        ...new Set(
          wonEdges
            .map((e) => (e.sourceType === 'Club' ? e.sourceId : e.targetId))
            .filter((v) => v !== id),
        ),
      ];
      const winners = winnerIds.length
        ? await prisma.club.findMany({
            where: { id: { in: winnerIds }, deletedAt: null },
            select: CLUB_SELECT,
            orderBy: { name: 'asc' },
            take: CATEGORY_QUERY_CAP,
          })
        : [];
      candidates.push(
        ...winners.map((c) =>
          toItem(c, 'same_competition', RELATED_CONFIDENCE.same_competition_won),
        ),
      );

      const myEntries = await prisma.rankingEntry.findMany({
        where: {
          clubId: id,
          ranking: { publishedAt: { not: null }, competitionId: { not: null } },
        },
        select: { ranking: { select: { competitionId: true } } },
        take: 50,
      });
      const rankedCompIds = [
        ...new Set(myEntries.map((e) => e.ranking.competitionId).filter((v): v is string => !!v)),
      ];
      const sharedRankings = rankedCompIds.length
        ? await prisma.ranking.findMany({
            where: { competitionId: { in: rankedCompIds }, publishedAt: { not: null } },
            select: { id: true },
            take: 50,
          })
        : [];
      const rankingIds = sharedRankings.map((r) => r.id);
      const otherEntries = rankingIds.length
        ? await prisma.rankingEntry.findMany({
            where: { rankingId: { in: rankingIds }, clubId: { not: id } },
            select: { clubId: true },
            distinct: ['clubId'],
            take: 200,
          })
        : [];
      const peerIds = otherEntries.map((e) => e.clubId);
      const peers = peerIds.length
        ? await prisma.club.findMany({
            where: { id: { in: peerIds }, deletedAt: null },
            select: CLUB_SELECT,
            orderBy: { name: 'asc' },
            take: CATEGORY_QUERY_CAP,
          })
        : [];
      candidates.push(
        ...peers.map((c) =>
          toItem(c, 'same_competition', RELATED_CONFIDENCE.same_competition_ranking),
        ),
      );
    }

    return { clubId: id, related: mergeRelated(candidates, id) };
  });
}
