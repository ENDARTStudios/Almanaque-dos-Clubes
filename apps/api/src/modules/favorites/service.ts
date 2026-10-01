import { NotFoundError } from '@almanaque/domain';
import { withRlsContext } from '../../config/rls-context.js';
import { favoritesRepository, type FavoriteWithClub } from './repository.js';
import { excludeSoftDeleted } from '../graph/soft-delete.js';
import { hierarchyOfEdge } from '../etl/won-edges.service.js';
import type { RankHierarchy } from '../rankings/ranking-algorithm.service.js';

/**
 * T439 — Serviço de favoritos. Isolamento por RLS owner-only: todas as
 * operações rodam em `withRlsContext` com o userId autenticado — um usuário
 * nunca lê/altera favorito de outro (deny no banco, não só no código).
 *
 * WS-C-6 — list() ganha paginação offset-based + totalTitles por clube
 * (arestas WON vivas) e feed() entrega as conquistas recentes dos favoritos.
 */
export interface FavoriteView extends FavoriteWithClub {
  ranking: { name: string; season: string | null; position: number; points: number | null } | null;
}

export interface AddResult {
  favorite: { id: string; clubId: string; createdAt: Date };
  created: boolean;
  reactivated: boolean;
}

/** WS-C-6 — item do feed de conquistas dos favoritos. */
export interface FavoriteFeedItem {
  clubId: string;
  clubName: string;
  year: number | null;
  season: string | null;
  competitionId: string | null;
  competitionName: string | null;
  hierarchy: RankHierarchy;
  sourceUrl: string | null;
}

/** Teto do feed (despacho WS-C-6). */
export const FEED_LIMIT = 20;
/** Base de favoritos considerada no feed (bound razoável de varredura). */
export const FEED_FAVORITES_BASE = 100;

/** PURO — ordena por ano DESC (nulos por último; competição; clube) e corta em 20. */
export function buildFeed(items: FavoriteFeedItem[]): FavoriteFeedItem[] {
  return [...items]
    .sort((a, b) => {
      const ya = a.year ?? Number.NEGATIVE_INFINITY;
      const yb = b.year ?? Number.NEGATIVE_INFINITY;
      if (yb !== ya) return yb - ya;
      const ca = a.competitionName ?? '';
      const cb = b.competitionName ?? '';
      if (ca !== cb) return ca.localeCompare(cb);
      return a.clubName.localeCompare(b.clubName);
    })
    .slice(0, FEED_LIMIT);
}

export const favoritesService = {
  /** Idempotente: ativo → no-op; removido (soft) → reativa; novo → cria. */
  async add(userId: string, clubId: string): Promise<AddResult> {
    return withRlsContext({ userId, role: 'USER' }, async (tx) => {
      if (!(await favoritesRepository.clubExists(tx, clubId))) {
        throw new NotFoundError('Clube', clubId);
      }
      const active = await favoritesRepository.findActive(tx, userId, clubId);
      if (active) {
        return {
          favorite: { id: active.id, clubId: active.clubId, createdAt: active.createdAt },
          created: false,
          reactivated: false,
        };
      }
      const deleted = await favoritesRepository.findLatestDeleted(tx, userId, clubId);
      if (deleted) {
        const f = await favoritesRepository.reactivate(tx, deleted.id);
        return {
          favorite: { id: f.id, clubId: f.clubId, createdAt: f.createdAt },
          created: true,
          reactivated: true,
        };
      }
      const f = await favoritesRepository.create(tx, { userId, clubId });
      return {
        favorite: { id: f.id, clubId: f.clubId, createdAt: f.createdAt },
        created: true,
        reactivated: false,
      };
    });
  },

  /** Soft-delete idempotente (princípio 1.1). false = já estava removido. */
  async remove(userId: string, clubId: string): Promise<{ removed: boolean }> {
    return withRlsContext({ userId, role: 'USER' }, async (tx) => {
      const active = await favoritesRepository.findActive(tx, userId, clubId);
      if (!active) return { removed: false };
      await favoritesRepository.softDelete(tx, active.id);
      return { removed: true };
    });
  },

  /** Painel: favoritos ativos + badge do ranking vigente (se houver).
   *  WS-C-6 — paginação offset-based (limit 50 default) + totalTitles por clube. */
  async list(
    userId: string,
    pagination: { limit: number; offset: number } = { limit: 50, offset: 0 },
  ): Promise<{
    data: (FavoriteView & { qid: string | null; totalTitles: number })[];
    ranking: { name: string; season: string | null } | null;
    total: number;
    limit: number;
    offset: number;
  }> {
    return withRlsContext({ userId, role: 'USER' }, async (tx) => {
      const favorites = await favoritesRepository.listActiveWithClub(tx, userId, {
        take: pagination.limit,
        skip: pagination.offset,
      });
      const total = await favoritesRepository.countActive(tx, userId);
      const clubIds = favorites.map((f) => f.clubId);

      // totalTitles por clube = arestas WON vivas (mesma contagem da timeline).
      const titleCounts = new Map<string, number>();
      if (clubIds.length > 0) {
        const rawEdges = await favoritesRepository.listWonEdgesForClubs(tx, clubIds);
        for (const e of excludeSoftDeleted(rawEdges)) {
          const clubId = e.sourceType === 'Club' ? e.sourceId : e.targetId;
          titleCounts.set(clubId, (titleCounts.get(clubId) ?? 0) + 1);
        }
      }

      const entries = await favoritesRepository.findRankingEntriesForClubs(tx, clubIds);
      const meta = await favoritesRepository.rankingMeta(tx);
      const entryByClub = new Map(entries.map((e) => [e.clubId, e]));
      return {
        data: favorites.map((f) => {
          const e = entryByClub.get(f.clubId);
          return {
            ...f,
            qid: f.club.qid,
            totalTitles: titleCounts.get(f.clubId) ?? 0,
            ranking:
              e && meta
                ? {
                    name: meta.name,
                    season: meta.season,
                    position: e.position ?? 0,
                    points: e.points,
                  }
                : null,
          };
        }),
        ranking: meta,
        total,
        limit: pagination.limit,
        offset: pagination.offset,
      };
    });
  },

  /** WS-C-6 — feed de conquistas recentes dos favoritos (WON, ano DESC, cap 20). */
  async feed(userId: string): Promise<{ data: FavoriteFeedItem[]; total: number }> {
    return withRlsContext({ userId, role: 'USER' }, async (tx) => {
      const favorites = await favoritesRepository.listActiveWithClub(tx, userId, {
        take: FEED_FAVORITES_BASE,
      });
      const clubIds = favorites.map((f) => f.clubId);
      if (clubIds.length === 0) return { data: [], total: 0 };
      const nameByClub = new Map(favorites.map((f) => [f.clubId, f.club.name]));

      const edges = excludeSoftDeleted(await favoritesRepository.listWonEdgesForClubs(tx, clubIds));
      if (edges.length === 0) return { data: [], total: 0 };

      const compIds = [
        ...new Set(edges.map((e) => (e.sourceType === 'Competition' ? e.sourceId : e.targetId))),
      ];
      const comps = await tx.competition.findMany({
        where: { id: { in: compIds }, deletedAt: null },
        select: { id: true, qid: true, name: true, type: true, country: true },
      });
      const compById = new Map(comps.map((c) => [c.id, c]));

      const items: FavoriteFeedItem[] = edges.map((e) => {
        const clubIsSource = e.sourceType === 'Club';
        const clubId = clubIsSource ? e.sourceId : e.targetId;
        const comp = compById.get(clubIsSource ? e.targetId : e.sourceId) ?? null;
        const meta = (e.metadata as Record<string, unknown> | null) ?? {};
        return {
          clubId,
          clubName: nameByClub.get(clubId) ?? '',
          year: typeof meta.year === 'number' ? meta.year : null,
          season: typeof meta.season === 'string' ? meta.season : null,
          competitionId: comp?.id ?? null,
          competitionName: comp?.name ?? null,
          hierarchy: hierarchyOfEdge(e.metadata, comp),
          sourceUrl: typeof meta.sourceUrl === 'string' ? meta.sourceUrl : null,
        };
      });
      const data = buildFeed(items);
      return { data, total: data.length };
    });
  },
};
