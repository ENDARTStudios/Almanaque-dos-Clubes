import { NotFoundError } from '@almanaque/domain';
import { withRlsContext } from '../../config/rls-context.js';
import { favoritesRepository, type FavoriteWithClub } from './repository.js';

/**
 * T439 — Serviço de favoritos. Isolamento por RLS owner-only: todas as
 * operações rodam em `withRlsContext` com o userId autenticado — um usuário
 * nunca lê/altera favorito de outro (deny no banco, não só no código).
 */
export interface FavoriteView extends FavoriteWithClub {
  ranking: { name: string; season: string | null; position: number; points: number | null } | null;
}

export interface AddResult {
  favorite: { id: string; clubId: string; createdAt: Date };
  created: boolean;
  reactivated: boolean;
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

  /** Painel: favoritos ativos + badge do ranking vigente (se houver). */
  async list(
    userId: string,
  ): Promise<{ data: FavoriteView[]; ranking: { name: string; season: string | null } | null }> {
    return withRlsContext({ userId, role: 'USER' }, async (tx) => {
      const favorites = await favoritesRepository.listActiveWithClub(tx, userId);
      const clubIds = favorites.map((f) => f.clubId);
      const entries = await favoritesRepository.findRankingEntriesForClubs(tx, clubIds);
      const meta = await favoritesRepository.rankingMeta(tx);
      const entryByClub = new Map(entries.map((e) => [e.clubId, e]));
      return {
        data: favorites.map((f) => {
          const e = entryByClub.get(f.clubId);
          return {
            ...f,
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
      };
    });
  },
};
