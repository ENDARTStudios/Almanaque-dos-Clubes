/**
 * WS-C-14 — Dashboard do usuário (dados agregados dos módulos existentes).
 *
 * Zero escrita em rankings; consumo read-only de favorites/notifications/
 * club_ownerships/club_description_proposals/reports. O tracking de
 * pageViews/searches fica PREPARADO (UserActivity) mas DESATIVADO até
 * USER_TRACKING_ENABLED=true E WS-L (cookie consent) publicado.
 */
import { prisma } from '../../config/prisma.js';
import { withRlsContext } from '../../config/rls-context.js';
import { env } from '../../config/env.js';
import { NotFoundError } from '@almanaque/domain';

export interface DashboardPayload {
  user: {
    id: string;
    name: string | null;
    email: string;
    createdAt: Date;
    roles: string[];
  };
  stats: {
    totalFavorites: { club: number; player: number; competition: number };
    totalNotifications: { total: number; unread: number };
    totalProposals: { total: number; pending: number; approved: number; rejected: number };
    totalReports: number | null; // só para admins
  };
  recentFavorites: Array<{
    targetType: string;
    targetId: string;
    targetName: string;
    targetQid: string | null;
    addedAt: Date;
  }>;
  recentNotifications: Array<{
    id: string;
    type: string;
    payload: unknown;
    createdAt: Date;
    read: boolean;
  }>;
  favoriteClubs: Array<{
    id: string;
    name: string;
    qid: string | null;
    country: string | null;
    fansCount: number;
  }>;
  ownedClubs: Array<{ id: string; name: string; qid: string | null; role: string; since: Date }>;
  tracking: { enabled: boolean };
}

/** Contagem pública via SECURITY DEFINER favorites_count (padrão T442). */
async function countPublic(targetType: string, targetId: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(
    `SELECT favorites_count($1, $2) AS n`,
    targetType,
    targetId,
  );
  return Number(rows[0]?.n ?? 0);
}

export async function getDashboard(userId: string): Promise<DashboardPayload> {
  // T442 — users sob FORCE RLS: a leitura da própria linha exige contexto
  // owner (app_user sem contexto não vê nada — foi o 500 do gate). TODAS as
  // consultas do dashboard rodam na mesma transação com o contexto owner.
  return withRlsContext({ userId, role: 'USER' }, async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        deletedAt: true,
        userRoles: { select: { role: { select: { name: true } } } },
      },
    });
    if (!user || user.deletedAt) throw new NotFoundError('Usuário', userId);
    const roles = user.userRoles.map((ur) => ur.role.name);

    // Favoritos por tipo (polymorphic, WS-C-12)
    const [favClub, favPlayer, favCompetition] = await Promise.all([
      tx.favorite.count({ where: { userId, targetType: 'club', deletedAt: null } }),
      tx.favorite.count({ where: { userId, targetType: 'player', deletedAt: null } }),
      tx.favorite.count({ where: { userId, targetType: 'competition', deletedAt: null } }),
    ]);

    const [notifTotal, notifUnread] = await Promise.all([
      tx.notification.count({ where: { userId } }),
      tx.notification.count({ where: { userId, read: false } }),
    ]);

    const proposals = await tx.clubDescriptionProposal.groupBy({
      by: ['status'],
      where: { proposedBy: userId },
      _count: { _all: true },
    });
    const propBy = (st: string) => proposals.find((p) => p.status === st)?._count._all ?? 0;
    const totalProposals = proposals.reduce((acc, p) => acc + p._count._all, 0);

    // Clubs favoritados com fansCount (contagem pública via SD favorites_count)
    const clubFavs = await tx.favorite.findMany({
      where: { userId, targetType: 'club', deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        targetId: true,
        createdAt: true,
        club: { select: { id: true, name: true, qid: true, country: true } },
      },
    });
    const favoriteClubs = await Promise.all(
      clubFavs
        .filter((f) => f.club)
        .map(async (f) => ({
          id: f.targetId,
          name: f.club!.name,
          qid: f.club!.qid,
          country: f.club!.country,
          fansCount: await countPublic('club', f.targetId),
        })),
    );

    // Favoritos recentes (todos os tipos, 6 mais recentes) com nome do alvo
    const recent = await tx.favorite.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { targetType: true, targetId: true, createdAt: true },
    });
    const recentFavorites = await Promise.all(
      recent.map(async (r) => {
        let targetName: string;
        let targetQid: string | null;
        if (r.targetType === 'club') {
          const c = await tx.club.findUnique({
            where: { id: r.targetId },
            select: { name: true, qid: true },
          });
          targetName = c?.name ?? '';
          targetQid = c?.qid ?? null;
        } else if (r.targetType === 'player') {
          const pl = await tx.player.findUnique({
            where: { id: r.targetId },
            select: { fullName: true, qid: true },
          });
          targetName = pl?.fullName ?? '';
          targetQid = pl?.qid ?? null;
        } else {
          const c = await tx.competition.findUnique({
            where: { id: r.targetId },
            select: { name: true, qid: true },
          });
          targetName = c?.name ?? '';
          targetQid = c?.qid ?? null;
        }
        return {
          targetType: r.targetType,
          targetId: r.targetId,
          targetName,
          targetQid,
          addedAt: r.createdAt,
        };
      }),
    );

    const recentNotifications = await tx.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, type: true, payload: true, createdAt: true, read: true },
    });

    const ownedClubs = await tx.clubOwnership.findMany({
      where: { userId, status: 'active' },
      orderBy: { requestedAt: 'desc' },
      take: 10,
      select: {
        role: true,
        approvedAt: true,
        requestedAt: true,
        club: { select: { id: true, name: true, qid: true } },
      },
    });

    // Denúncias: contagem própria; o total da fila é só para admins.
    const isAdmin = roles.includes('admin');
    const myReports = await tx.report.count({ where: { reporterId: userId } });
    let pendingReports: number | null = null;
    if (isAdmin) pendingReports = await tx.report.count({ where: { status: 'pending' } });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        roles,
      },
      stats: {
        totalFavorites: { club: favClub, player: favPlayer, competition: favCompetition },
        totalNotifications: { total: notifTotal, unread: notifUnread },
        totalProposals: {
          total: totalProposals,
          pending: propBy('pending'),
          approved: propBy('approved'),
          rejected: propBy('rejected'),
        },
        totalReports: isAdmin ? pendingReports : myReports,
      },
      recentFavorites,
      recentNotifications: recentNotifications.map((n) => ({
        id: n.id,
        type: n.type,
        payload: n.payload,
        createdAt: n.createdAt,
        read: n.read,
      })),
      favoriteClubs,
      ownedClubs: ownedClubs.map((o) => ({
        id: o.club.id,
        name: o.club.name,
        qid: o.club.qid,
        role: o.role,
        since: (o.approvedAt ?? o.requestedAt) as Date,
      })),
      tracking: { enabled: env.userTrackingEnabled === true },
    };
  });
}
