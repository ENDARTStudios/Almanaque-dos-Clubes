import type { Prisma } from '@prisma/client';

/**
 * T439 — Repositório de favoritos. TODAS as chamadas acontecem dentro de
 * `withRlsContext({ userId, role: 'USER' })` (policies owner-only em
 * scripts/sql/rls_favorites_setup.sql; FORCE RLS).
 */

export type Tx = Prisma.TransactionClient;

export interface FavoriteWithClub {
  id: string;
  clubId: string | null;
  notificationsActive: boolean;
  createdAt: Date;
  club: {
    id: string;
    name: string;
    /** WS-C-6 — identidade Wikidata do clube (aditivo). */
    qid: string | null;
    country: string | null;
    state: string | null;
    city: string | null;
  } | null;
}

export const favoritesRepository = {
  /** Favorito ATIVO do par (usuário, clube) — índice parcial único no Postgres. */
  async findActive(tx: Tx, userId: string, clubId: string) {
    return tx.favorite.findFirst({
      where: { userId, clubId, targetType: 'club', deletedAt: null },
    });
  },

  /** WS-C-12 — favorito ativo por alvo genérico. */
  async findActiveByTarget(tx: Tx, userId: string, targetType: string, targetId: string) {
    return tx.favorite.findFirst({
      where: { userId, targetType, targetId, deletedAt: null },
    });
  },

  /** Último favorito removido (soft-delete) do par — para reativação idempotente. */
  async findLatestDeleted(tx: Tx, userId: string, clubId: string) {
    return tx.favorite.findFirst({
      where: { userId, clubId, deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
    });
  },

  /** WS-C-12 — último removido por alvo genérico (reativação). */
  async findLatestDeletedByTarget(tx: Tx, userId: string, targetType: string, targetId: string) {
    return tx.favorite.findFirst({
      where: { userId, targetType, targetId, deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
    });
  },

  async create(tx: Tx, data: { userId: string; clubId: string }) {
    return tx.favorite.create({
      data: { userId: data.userId, clubId: data.clubId, targetType: 'club', targetId: data.clubId },
    });
  },

  /** WS-C-12 — cria por alvo genérico (clubId null para player/competition). */
  async createByTarget(tx: Tx, data: { userId: string; targetType: string; targetId: string }) {
    return tx.favorite.create({
      data: {
        userId: data.userId,
        targetType: data.targetType,
        targetId: data.targetId,
        ...(data.targetType === 'club' ? { clubId: data.targetId } : {}),
      },
    });
  },

  async reactivate(tx: Tx, id: string) {
    return tx.favorite.update({
      where: { id },
      data: { deletedAt: null, notificationsActive: true },
    });
  },

  /** Soft-delete (princípio 1.1 — sem hard-delete de dado de usuário). */
  async softDelete(tx: Tx, id: string) {
    return tx.favorite.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  async listActiveWithClub(
    tx: Tx,
    userId: string,
    opts?: { take?: number; skip?: number },
  ): Promise<FavoriteWithClub[]> {
    return tx.favorite.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      ...(opts?.take != null ? { take: opts.take } : {}),
      ...(opts?.skip != null ? { skip: opts.skip } : {}),
      select: {
        id: true,
        clubId: true,
        notificationsActive: true,
        createdAt: true,
        club: {
          select: { id: true, qid: true, name: true, country: true, state: true, city: true },
        },
      },
    });
  },

  /** WS-C-6 — total de favoritos ativos (paginação offset-based). */
  async countActive(tx: Tx, userId: string): Promise<number> {
    return tx.favorite.count({ where: { userId, deletedAt: null } });
  },

  /** WS-C-12 — ativos por tipo com dados básicos do alvo (abas do painel). */
  async listActiveByTarget(
    tx: Tx,
    userId: string,
    targetType: string,
    opts?: { take?: number; skip?: number },
  ) {
    const rows = await tx.favorite.findMany({
      where: { userId, targetType, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      ...(opts?.take != null ? { take: opts.take } : {}),
      ...(opts?.skip != null ? { skip: opts.skip } : {}),
      select: { id: true, targetId: true, createdAt: true },
    });
    // Join com o alvo para nome/qid (tabela por tipo).
    const ids = rows.map((r) => r.targetId);
    let nameById = new Map<string, { name: string; qid: string | null }>();
    if (targetType === 'club' && ids.length > 0) {
      const cs = await tx.club.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, qid: true },
      });
      nameById = new Map(cs.map((c) => [c.id, { name: c.name, qid: c.qid }]));
    } else if (targetType === 'player' && ids.length > 0) {
      const ps = await tx.player.findMany({
        where: { id: { in: ids } },
        select: { id: true, fullName: true, qid: true },
      });
      nameById = new Map(ps.map((p) => [p.id, { name: p.fullName, qid: p.qid }]));
    } else if (targetType === 'competition' && ids.length > 0) {
      const cs = await tx.competition.findMany({
        where: { id: { in: ids }, deletedAt: null },
        select: { id: true, name: true, qid: true },
      });
      nameById = new Map(cs.map((c) => [c.id, { name: c.name, qid: c.qid }]));
    }
    return rows
      .filter((r) => nameById.has(r.targetId))
      .map((r) => ({
        id: r.id,
        targetId: r.targetId,
        createdAt: r.createdAt,
        name: nameById.get(r.targetId)!.name,
        qid: nameById.get(r.targetId)!.qid,
      }));
  },

  /** WS-C-12 — alvo existe (club | player | competition)? */
  async targetExists(tx: Tx, targetType: string, targetId: string): Promise<boolean> {
    if (targetType === 'club') {
      return (
        (await tx.club.findFirst({
          where: { id: targetId, deletedAt: null },
          select: { id: true },
        })) !== null
      );
    }
    if (targetType === 'player') {
      return (
        (await tx.player.findUnique({ where: { id: targetId }, select: { id: true } })) !== null
      );
    }
    return (
      (await tx.competition.findFirst({
        where: { id: targetId, deletedAt: null },
        select: { id: true },
      })) !== null
    );
  },

  /**
   * WS-C-6 — arestas WON dos clubes favoritados (feed de conquistas e
   * totalTitles). Exclusão de soft-deleted fica no chamador (excludeSoftDeleted).
   */
  async listWonEdgesForClubs(tx: Tx, clubIds: string[]) {
    if (clubIds.length === 0) return [];
    return tx.knowledgeGraph.findMany({
      where: {
        relation: 'WON',
        OR: [
          { sourceType: 'Club', sourceId: { in: clubIds } },
          { targetType: 'Club', targetId: { in: clubIds } },
        ],
      },
      select: {
        sourceId: true,
        sourceType: true,
        targetId: true,
        targetType: true,
        metadata: true,
      },
    });
  },

  async clubExists(tx: Tx, clubId: string): Promise<boolean> {
    const c = await tx.club.findUnique({ where: { id: clubId }, select: { id: true } });
    return c !== null;
  },

  /**
   * Entrada de ranking vigente (último ranking publicado) para os clubes
   * favoritados — badge do painel.
   */
  async findRankingEntriesForClubs(tx: Tx, clubIds: string[]) {
    if (clubIds.length === 0) return [];
    const latest = await tx.ranking.findFirst({
      where: { publishedAt: { not: null } },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      select: { id: true, name: true, season: true },
    });
    if (!latest) return [];
    return tx.rankingEntry.findMany({
      where: { rankingId: latest.id, clubId: { in: clubIds }, position: { not: null } },
      select: { clubId: true, position: true, points: true },
    });
  },

  async rankingMeta(tx: Tx): Promise<{ id: string; name: string; season: string | null } | null> {
    return tx.ranking.findFirst({
      where: { publishedAt: { not: null } },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      select: { id: true, name: true, season: true },
    });
  },
};
