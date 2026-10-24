/**
 * T596 — TIME DO CORAÇÃO: serviço do vínculo 1:1 usuário → clube.
 *
 * ── O QUE DISTINGUE "TIME DO CORAÇÃO" DE "FAVORITO" ────────────────────────────────────
 * `favorites` (WS-C-12) é a lista PLURAL de clubes/jogadores/competições que o usuário
 * SEGUE — sem hierarquia entre eles. O Time do Coração é o clube de que ele é torcedor
 * fanático: UM só, declarado, e a declaração é dele — o sistema NUNCA presume um a
 * partir do histórico de favoritos (inferir torcida a partir de cliques fabricaria um
 * dado de identidade que o usuário nunca confirmou).
 *
 * Armazenamento: `users.heartClubId` (FK → clubs, ON DELETE SET NULL). Vínculo 1:1 por
 * construção — a FK mora no usuário — e não uma linha extra numa tabela de favoritos.
 *
 * Isolamento: todas as operações rodam em `withRlsContext` owner (padrão do dashboard
 * WS-C-14 e dos favoritos T439) — um usuário nunca lê/altera o Time do Coração de outro.
 */
import { NotFoundError } from '@almanaque/domain';
import { withRlsContext } from '../../config/rls-context.js';

/** Visão do Time do Coração devolvida à UI. */
export interface HeartClubView {
  clubId: string;
  name: string;
  qid: string | null;
  country: string | null;
  logoUrl: string | null;
}

const CLUB_SELECT = {
  id: true,
  name: true,
  qid: true,
  country: true,
  logoUrl: true,
} as const;

function view(club: {
  id: string;
  name: string;
  qid: string | null;
  country: string | null;
  logoUrl: string | null;
}): HeartClubView {
  return {
    clubId: club.id,
    name: club.name,
    qid: club.qid,
    country: club.country,
    logoUrl: club.logoUrl,
  };
}

export const heartClubService = {
  /** O Time do Coração do usuário, ou null se ainda não escolheu. */
  async get(userId: string): Promise<HeartClubView | null> {
    return withRlsContext({ userId, role: 'USER' }, async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { heartClubId: true, heartClub: { select: CLUB_SELECT } },
      });
      if (!user?.heartClubId || !user.heartClub) return null;
      return view(user.heartClub);
    });
  },

  /**
   * Define (ou substitui) o Time do Coração. Idempotente: escolher o mesmo clube
   * de novo é no-op. Trocar substitui — é UMA torcida, a última declaração vale.
   */
  async set(userId: string, clubId: string): Promise<HeartClubView> {
    return withRlsContext({ userId, role: 'USER' }, async (tx) => {
      const club = await tx.club.findFirst({
        where: { id: clubId, deletedAt: null },
        select: CLUB_SELECT,
      });
      if (!club) throw new NotFoundError('Clube', clubId);
      await tx.user.update({
        where: { id: userId },
        data: { heartClubId: club.id },
        select: { id: true },
      });
      return view(club);
    });
  },

  /** Remove a declaração. Idempotente: false = já não havia vínculo. */
  async clear(userId: string): Promise<{ removed: boolean }> {
    return withRlsContext({ userId, role: 'USER' }, async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { heartClubId: true },
      });
      if (!user?.heartClubId) return { removed: false };
      await tx.user.update({
        where: { id: userId },
        data: { heartClubId: null },
        select: { id: true },
      });
      return { removed: true };
    });
  },
};
