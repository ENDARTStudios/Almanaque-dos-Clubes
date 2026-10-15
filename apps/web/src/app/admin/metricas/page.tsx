'use client';
import { useCallback, useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';
import MetricsCharts from './MetricsCharts';
import { adminMetricsStrings } from './strings';
import type { AdminMetricsPayload } from './types';

/**
 * Painel de MÉTRICAS do admin (/admin/metricas).
 * Dados: GET /api/v1/admin/metrics (admin + operador na API; 403 → mensagem de
 * restrição, espelhando /admin/observability). Uma requisição alimenta KPIs, os
 * três gráficos e os painéis de cobertura/fila/produto.
 */

type Status = 'loading' | 'ready' | 'forbidden' | 'error';

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-muted p-4">
      <p className="text-xs text-foreground/70">{label}</p>
      <p className="mt-1 text-2xl font-heading font-bold text-foreground tabular-nums">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-border/50 py-1.5 first:border-t-0">
      <dt className="text-sm text-foreground/70">{label}</dt>
      <dd className="text-sm font-medium text-foreground tabular-nums">{value.toLocaleString()}</dd>
    </div>
  );
}

function MetricsPanel() {
  const { locale } = useI18n();
  const s = adminMetricsStrings[locale];
  const [data, setData] = useState<AdminMetricsPayload | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  const refresh = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await api.get<{ data: AdminMetricsPayload }>('/admin/metrics');
      setData(res.data);
      setStatus('ready');
    } catch (e) {
      const err = e as Error & { status?: number };
      setStatus(err.status === 403 || /403|FORBIDDEN/i.test(err.message) ? 'forbidden' : 'error');
    }
  }, []);

  useEffect(() => {
    // promise callback (não sincrono) — regra react-hooks/set-state-in-effect
    void Promise.resolve().then(refresh);
  }, [refresh]);

  if (status === 'forbidden') {
    return (
      <p role="alert" className="py-10 text-sm text-danger-ink" data-testid="metrics-forbidden">
        {s.restricted}
      </p>
    );
  }

  if (status === 'loading' && !data) {
    return (
      <p role="status" className="py-10 text-sm text-foreground/70" data-testid="metrics-loading">
        {s.loading}
      </p>
    );
  }

  if (status === 'error' || !data) {
    return (
      <div className="py-10" data-testid="metrics-error">
        <p role="alert" className="text-sm text-danger-ink">
          {s.error}
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="mt-3 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground/70 hover:border-primary/50 hover:text-primary-ink"
        >
          {s.refresh}
        </button>
      </div>
    );
  }

  const { acervo, cobertura, filaPorChave, produto, series } = data;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-foreground/70" data-testid="metrics-measured-at">
          {s.measuredAt} {new Date(data.measuredAt).toLocaleString()} · {s.cacheNote}
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground/70 hover:border-primary/50 hover:text-primary-ink"
        >
          {s.refresh}
        </button>
      </div>

      {/* KPIs */}
      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
        data-testid="metrics-kpis"
      >
        <KpiCard label={s.kpi.clubs} value={acervo.clubsTotal} />
        <KpiCard label={s.kpi.players} value={acervo.players} />
        <KpiCard label={s.kpi.matches} value={acervo.matches} />
        <KpiCard label={s.kpi.competitions} value={acervo.competitions} />
        <KpiCard label={s.kpi.users} value={produto.users.total} />
        <KpiCard label={s.kpi.champions} value={acervo.seasonsWithChampion} />
      </div>

      {/* Gráficos */}
      <MetricsCharts series={series} s={s} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Acervo */}
        <section className="rounded-xl border border-border bg-muted p-5">
          <h2 className="mb-3 text-lg font-heading font-semibold text-foreground">
            {s.acervoTitle}
          </h2>
          <dl>
            <MetricRow
              label={s.acervo.nationalTeams}
              value={acervo.clubsByKind.national_team ?? 0}
            />
            <MetricRow label={s.acervo.federations} value={acervo.clubsByKind.federation ?? 0} />
            <MetricRow label={s.acervo.players} value={acervo.players} />
            <MetricRow label={s.acervo.matches} value={acervo.matches} />
            <MetricRow label={s.acervo.competitions} value={acervo.competitions} />
            <MetricRow label={s.acervo.seasons} value={acervo.seasons} />
            <MetricRow label={s.acervo.seasonsWithChampion} value={acervo.seasonsWithChampion} />
            <MetricRow label={s.acervo.rankings} value={acervo.rankings} />
          </dl>
        </section>

        {/* Produto */}
        <section className="rounded-xl border border-border bg-muted p-5">
          <h2 className="mb-3 text-lg font-heading font-semibold text-foreground">
            {s.produtoTitle}
          </h2>
          <dl>
            <MetricRow label={s.produto.total} value={produto.users.total} />
            <MetricRow label={s.produto.active} value={produto.users.active} />
            <MetricRow label={s.produto.withBirthDate} value={produto.users.withBirthDate} />
            <MetricRow label={s.produto.giftReceived} value={produto.users.giftReceived} />
            <MetricRow label={s.produto.planFree} value={produto.subscriptionsByPlan.FREE ?? 0} />
            <MetricRow label={s.produto.planPro} value={produto.subscriptionsByPlan.PRO ?? 0} />
            <MetricRow label={s.produto.planElite} value={produto.subscriptionsByPlan.ELITE ?? 0} />
          </dl>
        </section>

        {/* Cobertura — clubes */}
        <section className="rounded-xl border border-border bg-muted p-5">
          <h2 className="mb-1 text-lg font-heading font-semibold text-foreground">
            {s.coberturaTitle} · {s.coberturaClubsTitle}
          </h2>
          <p className="mb-3 text-sm text-foreground/70">{s.coberturaNote}</p>
          <dl>
            <MetricRow label={s.cobertura.total} value={cobertura.clubs.total} />
            <MetricRow label={s.cobertura.logo} value={cobertura.clubs.logoUrl} />
            <MetricRow label={s.cobertura.stadium} value={cobertura.clubs.stadiumName} />
            <MetricRow label={s.cobertura.colors} value={cobertura.clubs.teamColors} />
            <MetricRow label={s.cobertura.editorial} value={cobertura.clubs.editorialText} />
            <MetricRow label={s.cobertura.kits} value={cobertura.clubs.kitHistory} />
            <MetricRow label={s.cobertura.anthem} value={cobertura.clubs.anthem} />
            <MetricRow label={s.cobertura.pennants} value={cobertura.clubs.pennants} />
            <MetricRow
              label={s.cobertura.withoutLatitude}
              value={cobertura.clubs.withoutLatitude}
            />
          </dl>
        </section>

        {/* Cobertura — jogadores + fila */}
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-muted p-5">
            <h2 className="mb-1 text-lg font-heading font-semibold text-foreground">
              {s.coberturaTitle} · {s.coberturaPlayersTitle}
            </h2>
            <p className="mb-3 text-sm text-foreground/70">{s.coberturaNote}</p>
            <dl>
              <MetricRow label={s.cobertura.total} value={cobertura.players.total} />
              <MetricRow label={s.coberturaPlayers.photo} value={cobertura.players.photoUrl} />
              <MetricRow label={s.coberturaPlayers.country} value={cobertura.players.country} />
              <MetricRow label={s.coberturaPlayers.position} value={cobertura.players.position} />
              <MetricRow label={s.coberturaPlayers.withClub} value={cobertura.players.clubId} />
            </dl>
          </section>

          <section className="rounded-xl border border-border bg-muted p-5">
            <h2 className="mb-1 text-lg font-heading font-semibold text-foreground">
              {s.filaTitle}
            </h2>
            <p className="mb-3 text-sm text-foreground/70">{s.filaNote}</p>
            <dl>
              <MetricRow label={s.filaKeys.logo} value={filaPorChave.logo ?? 0} />
              <MetricRow label={s.filaKeys.stadium} value={filaPorChave.stadium ?? 0} />
              <MetricRow label={s.filaKeys.colors} value={filaPorChave.colors ?? 0} />
              <MetricRow label={s.filaKeys.editorial} value={filaPorChave.editorial ?? 0} />
              <MetricRow label={s.filaKeys.kits} value={filaPorChave.kits ?? 0} />
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function AdminMetricsPage() {
  const { locale } = useI18n();
  const s = adminMetricsStrings[locale];
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <h1 className="text-3xl font-heading font-bold text-foreground sm:text-4xl">{s.title}</h1>
      <p className="mt-1 mb-8 text-foreground/60">{s.subtitle}</p>
      <ProtectedRoute>
        <MetricsPanel />
      </ProtectedRoute>
    </div>
  );
}
