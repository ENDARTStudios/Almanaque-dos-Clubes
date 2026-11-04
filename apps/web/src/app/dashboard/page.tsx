'use client';

import { useState } from 'react';
import DashboardStatsSection from '@/components/DashboardStatsSection';
import HeartClubSection from '@/components/HeartClubSection';
import FavoritosPanel from '@/components/FavoritosPanel';
import ProtectedRoute from '@/components/ProtectedRoute';
import AccountTable from '@/components/conceito/conta/AccountTable';
import type { DashboardStatsData } from '@/components/DashboardStats';
import { useI18n } from '@/i18n/Provider';
import { wsConceitoDashboard } from '@/i18n/wsConceitoDashboard';

/**
 * MEU ALMANAQUE — a área do usuário no conceito FICHA (T559 + T597).
 *
 * Composição do quadro: kicker "Sua conta · painel", h1 "Meu Almanaque", número-âncora de
 * itens seguidos, cartões por tipo, favoritos recentes, clube do coração, a lista de favoritos
 * integrada (T597) e a tabela "Conta e assinatura".
 *
 * Tudo continua atrás de ProtectedRoute. O resumo vem de UMA chamada (GET /dashboard) feita
 * pelo DashboardStatsSection; o callback entrega o mesmo objeto ao cabeçalho e à tabela — sem
 * uma segunda chamada e sem número inventado. Plano/Perfil sem status no payload aparecem como
 * "—" ou "Em breve", nunca como um link falso.
 */
export default function DashboardPage() {
  const { locale } = useI18n();
  const s = wsConceitoDashboard[locale];
  const [resumo, setResumo] = useState<DashboardStatsData | null>(null);

  const totalFavoritos = resumo
    ? resumo.totalFavorites.club + resumo.totalFavorites.player + resumo.totalFavorites.competition
    : null;

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-ink-3 uppercase">
          {s.kicker}
        </p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            <h1 className="font-heading text-[40px] leading-[0.98] font-bold text-foreground sm:text-[56px]">
              {s.title}
            </h1>
            <p className="mt-3 max-w-[640px] text-[15px] leading-[23px] text-ink-2">{s.subtitle}</p>
          </div>
          {totalFavoritos != null ? (
            <div className="text-right">
              <p className="num font-heading text-[56px] leading-none font-bold text-primary-ink">
                {totalFavoritos}
              </p>
              <p className="mt-1 text-[11px] text-ink-3">{s.anchorLabel}</p>
            </div>
          ) : null}
        </div>
        <hr className="mt-6 border-t-2 border-foreground" />

        <div className="mt-8 space-y-10">
          <DashboardStatsSection onStats={setResumo} />
          <HeartClubSection />
          <FavoritosPanel />
          {resumo ? <AccountTable stats={resumo} s={s} /> : null}
        </div>
      </div>
    </ProtectedRoute>
  );
}
