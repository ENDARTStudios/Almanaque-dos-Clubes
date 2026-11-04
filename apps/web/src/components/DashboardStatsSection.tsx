'use client';
/**
 * WS-C-14 — stats do usuário + favoritos recentes + placeholder de tracking.
 * Conceito FICHA: o bloco começa com o rótulo "Meu Almanaque", os cards densos do
 * DashboardStats e, abaixo, os favoritos recentes. O callback `onStats` entrega o resumo
 * para a página (número-âncora e tabela de conta) sem duplicar a chamada a GET /dashboard.
 */
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import DashboardStats, { type DashboardStatsData } from '@/components/DashboardStats';
import RecentFavorites from '@/components/RecentFavorites';
import { useI18n } from '@/i18n/Provider';
import { wsConceitoDashboard } from '@/i18n/wsConceitoDashboard';

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

export default function DashboardStatsSection({
  onStats,
}: {
  onStats?: (stats: DashboardStatsData) => void;
}) {
  const { locale } = useI18n();
  const s = wsConceitoDashboard[locale];
  const [data, setData] = useState<DashboardData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get<DashboardData>('/dashboard')
      .then((res: unknown) => {
        const d =
          (res as unknown as { data?: DashboardData }).data ?? (res as unknown as DashboardData);
        if (active) {
          setData(d);
          onStats?.({
            totalFavorites: d.stats.totalFavorites,
            totalNotifications: d.stats.totalNotifications,
            totalProposals: d.stats.totalProposals,
            ownedClubsCount: d.ownedClubs.length,
            isAdmin: d.user.roles?.includes('admin') ?? false,
          });
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (failed || !data) return null;

  return (
    <section aria-label="Seu resumo" data-testid="dashboard-stats-section">
      <h2 className="text-[12.5px] font-semibold text-foreground">{s.myAlmanaque}</h2>
      <div className="mt-3">
        <DashboardStats
          stats={{
            totalFavorites: data.stats.totalFavorites,
            totalNotifications: data.stats.totalNotifications,
            totalProposals: data.stats.totalProposals,
            ownedClubsCount: data.ownedClubs.length,
            isAdmin: data.user.roles?.includes('admin') ?? false,
          }}
        />
      </div>

      <h2 className="mt-8 text-[12.5px] font-semibold text-foreground">{s.recentFavorites}</h2>
      <div className="mt-3">
        <RecentFavorites items={data.recentFavorites} />
      </div>

      {/* WS-C-14 — tracking preparado mas DESATIVADO até consentimento de cookies (WS-L). */}
      {!data.tracking.enabled ? (
        <p className="mt-6 text-[11px] text-ink-3" data-testid="tracking-coming-soon">
          {s.recommendations} — em breve (requer consentimento de cookies).
        </p>
      ) : null}
    </section>
  );
}
