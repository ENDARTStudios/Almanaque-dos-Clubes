import type { Prisma } from '@prisma/client';

/**
 * T439 — Repositório de favoritos. TODAS as chamadas acontecem dentro de
 * `withRlsContext({ userId, role: 'USER' })` (policies owner-only em
 * scripts/sql/rls_favorites_setup.sql; FORCE RLS).
 */

export type Tx = Prisma.TransactionClient;

export interface FavoriteWithClub {
  id: string;
  clubId: string;
  notificationsActive: boolean;
  createdAt: Date;
  club: {
    id: string;
    name: string;
    country: string | null;
    state: string | null;
    city: string | null;
  };
}

export const favoritesRepository = {
  /** Favorito ATIVO do par (usuário, clube) — índice parcial único no Postgres. */
  async findActive(tx: Tx, userId: string, clubId: string) {
    return tx.favorite.findFirst({ where: { userId, clubId, deletedAt: null } });
  },

  /** Último favorito removido (soft-delete) do par — para reativação idempotente. */
  async findLatestDeleted(tx: Tx, userId: string, clubId: string) {
    return tx.favorite.findFirst({
      where: { userId, clubId, deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
    });
  },

  async create(tx: Tx, data: { userId: string; clubId: string }) {
    return tx.favorite.create({ data });
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

  async listActiveWithClub(tx: Tx, userId: string): Promise<FavoriteWithClub[]> {
    return tx.favorite.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        clubId: true,
        notificationsActive: true,
        createdAt: true,
        club: { select: { id: true, name: true, country: true, state: true, city: true } },
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
