'use client';
/**
 * WS-C-14 — seção de stats do usuário (favoritos/notificações/contribuições/
 * clubes editados) + favoritos recentes + placeholder de tracking. Dados do
 * GET /dashboard (read-only, 30/min por usuário).
 */
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import DashboardStats from '@/components/DashboardStats';
import RecentFavorites from '@/components/RecentFavorites';

interface DashboardData {
  user: { name: string | null; createdAt: string; roles: string[] };
  stats: {
    totalFavorites: { club: number; player: number; competition: number };
    totalNotifications: { total: number; unread: number };
    totalProposals: { total: number; pending: number; approved: number; rejected: number };
  };
  recentFavorites: Array<{
    targetType: 'club' | 'player' | 'competition';
    targetId: string;
    targetName: string;
    targetQid: string | null;
    addedAt: string;
  }>;
  ownedClubs: Array<{ id: string; name: string }>;
  tracking: { enabled: boolean };
}

export default function DashboardStatsSection() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get<DashboardData>('/dashboard')
      .then((res: unknown) => {
        const d =
          (res as unknown as { data?: DashboardData }).data ?? (res as unknown as DashboardData);
        if (active) setData(d);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (failed || !data) return null;

  const memberSince = new Date(data.user.createdAt).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <section aria-label="Seu resumo" className="mb-10" data-testid="dashboard-stats-section">
      <h2 className="text-xl font-heading font-semibold text-foreground mb-1">
        {data.user.name ? `Olá, ${data.user.name.split(' ')[0]}` : 'Olá'}
        <span className="text-sm font-normal text-foreground/50 ml-2">
          Membro desde {memberSince}
        </span>
      </h2>
      <DashboardStats
        stats={{
          totalFavorites: data.stats.totalFavorites,
          totalNotifications: data.stats.totalNotifications,
          totalProposals: data.stats.totalProposals,
          ownedClubsCount: data.ownedClubs.length,
          isAdmin: data.user.roles?.includes('admin') ?? false,
        }}
      />

      <h3 className="text-lg font-heading font-semibold text-foreground mt-6 mb-3">
        Favoritos recentes
      </h3>
      <RecentFavorites items={data.recentFavorites} />

      {/* WS-C-14 — tracking de pageViews/searches PREPARADO mas DESATIVADO até
          WS-L (cookie consent). Placeholder honesto. */}
      {!data.tracking.enabled && (
        <p className="text-xs text-foreground/40 mt-6" data-testid="tracking-coming-soon">
          📊 Estatísticas de exploração — em breve (requer consentimento de cookies, WS-L).
        </p>
      )}
    </section>
  );
}
