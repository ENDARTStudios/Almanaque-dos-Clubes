'use client';
/**
 * WS-C-14 — cards de stats do dashboard (favoritos por tipo, notificações,
 * contribuições, clubes editados). Dados do GET /dashboard.
 */
import Link from 'next/link';

export interface DashboardStatsData {
  totalFavorites: { club: number; player: number; competition: number };
  totalNotifications: { total: number; unread: number };
  totalProposals: { total: number; pending: number; approved: number; rejected: number };
  ownedClubsCount: number;
  isAdmin: boolean;
}

export default function DashboardStats({ stats }: { stats: DashboardStatsData }) {
  const favTotal = stats.totalFavorites.club + stats.totalFavorites.player + stats.totalFavorites.competition;
  const cards = [
    {
      title: 'Favoritos',
      value: favTotal,
      detail: `${stats.totalFavorites.club} clubes · ${stats.totalFavorites.player} jogadores · ${stats.totalFavorites.competition} competições`,
      href: '/favoritos',
      testid: 'dash-favorites',
    },
    {
      title: 'Notificações',
      value: stats.totalNotifications.total,
      detail: stats.totalNotifications.unread > 0 ? `${stats.totalNotifications.unread} não lida(s)` : 'Tudo lido',
      href: '/notifications',
      testid: 'dash-notifications',
    },
    {
      title: 'Propostas enviadas',
      value: stats.totalProposals.total,
      detail: `${stats.totalProposals.pending} pendente(s) · ${stats.totalProposals.approved} aprovada(s)`,
      href: '/favoritos',
      testid: 'dash-proposals',
    },
    {
      title: 'Clubes que você edita',
      value: stats.ownedClubsCount,
      detail: 'Como editor (Modo Clube)',
      href: '/favoritos',
      testid: 'dash-owned',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8" data-testid="dashboard-stats">
      {cards.map((c) => (
        <Link
          key={c.title}
          href={c.href}
          data-testid={c.testid}
          className="bg-background rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-200 border border-border/50 cursor-pointer"
        >
          <p className="text-3xl font-heading font-bold text-primary">{c.value}</p>
          <p className="text-sm font-medium text-foreground mt-1">{c.title}</p>
          <p className="text-xs text-foreground/50 mt-0.5">{c.detail}</p>
        </Link>
      ))}
    </div>
  );
}
