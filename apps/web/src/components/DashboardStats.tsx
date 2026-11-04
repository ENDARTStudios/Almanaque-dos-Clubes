'use client';
/**
 * WS-C-14 — cards de stats do dashboard (favoritos por tipo + notificações).
 * Conceito FICHA: quatro cartões densos, sem sombra, número em carmim e rótulo de 11px.
 */
import Link from 'next/link';
import { useI18n } from '@/i18n/Provider';
import { wsConceitoDashboard } from '@/i18n/wsConceitoDashboard';

export interface DashboardStatsData {
  totalFavorites: { club: number; player: number; competition: number };
  totalNotifications: { total: number; unread: number };
  totalProposals: { total: number; pending: number; approved: number; rejected: number };
  ownedClubsCount: number;
  isAdmin: boolean;
}

export default function DashboardStats({ stats }: { stats: DashboardStatsData }) {
  const { locale } = useI18n();
  const s = wsConceitoDashboard[locale];
  const cards = [
    {
      title: s.cards.clubs,
      value: stats.totalFavorites.club,
      href: '#favoritos',
      testid: 'dash-favorites-clubs',
    },
    {
      title: s.cards.competitions,
      value: stats.totalFavorites.competition,
      href: '#favoritos',
      testid: 'dash-favorites-competitions',
    },
    {
      title: s.cards.players,
      value: stats.totalFavorites.player,
      href: '#favoritos',
      testid: 'dash-favorites-players',
    },
    {
      title: s.cards.notifications,
      value: stats.totalNotifications.total,
      detail:
        stats.totalNotifications.unread > 0
          ? `${stats.totalNotifications.unread} ${s.unread}`
          : s.allRead,
      href: '/notifications',
      testid: 'dash-notifications',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" data-testid="dashboard-stats">
      {cards.map((c) => (
        <Link
          key={c.title}
          href={c.href}
          data-testid={c.testid}
          className="flex min-h-[92px] flex-col justify-between rounded-[2px] border border-border bg-surface px-4 py-3 transition-colors duration-200 hover:border-foreground"
        >
          <div>
            <p className="text-[11px] leading-none text-ink-3">{c.title}</p>
            <p className="num mt-2 text-[30px] leading-none font-bold text-primary-ink">
              {c.value}
            </p>
          </div>
          {c.detail ? (
            <p className="mt-1 text-[10px] leading-tight text-ink-3">{c.detail}</p>
          ) : null}
        </Link>
      ))}
    </div>
  );
}
