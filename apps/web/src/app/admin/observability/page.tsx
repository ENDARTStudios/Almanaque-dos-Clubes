'use client';
import { useCallback, useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import ObservabilityCard, { type JobHealthView } from '@/components/ObservabilityCard';
import QueueStatus, { type QueueCountsView } from '@/components/QueueStatus';
import LogViewer, { type LogEntryView, type QueueJobView } from '@/components/LogViewer';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';
import { wsO1Strings } from '@/i18n/wsO1';

/**
 * WS-O-1 — painel de observabilidade operacional (/admin/observability).
 * Dados: GET /jobs/health + /jobs/logs + /observability/slo (admin-only na API;
 * 403 para usuário comum → mensagem de restrição). Telemetria 100% interna.
 */

interface HealthResponse {
  schedulerEnabled: boolean;
  schedules: Record<string, string>;
  queue: QueueCountsView | null;
  queueError: string | null;
  jobs: Record<string, JobHealthView>;
  alerts: {
    active: Array<{ at: string; kind: string; job?: string; message: string }>;
    backlog: boolean;
    integrityDrift: { drift: boolean; findings: Array<{ check: string; count: number }> } | null;
    checksError: string | null;
  };
}

interface LogsResponse {
  entries: LogEntryView[];
  queueJobs: QueueJobView[];
  queueError: string | null;
}

interface SloResponse {
  measuredAt: string;
  slo: Array<{
    job: string;
    schedule: string;
    target: string;
    lastRunAt: string | null;
    lastRunAgeHours: number | null;
    sloMet: boolean | null;
    successCount: number;
    failureCount: number;
    successRate: number | null;
  }>;
}

const JOB_ORDER = ['wikidata-incremental', 'integrity-check', 'ranking:compute'];

function ObservabilityPanel() {
  const { locale } = useI18n();
  const t = wsO1Strings[locale].observability;
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [logs, setLogs] = useState<LogsResponse | null>(null);
  const [slo, setSlo] = useState<SloResponse | null>(null);
  const [error, setError] = useState<'forbidden' | 'error' | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const h = await api.get<HealthResponse>('/jobs/health');
      setHealth(h);
      const l = await api.get<LogsResponse>('/jobs/logs?limit=100');
      setLogs(l);
      try {
        const s = await api.get<SloResponse>('/observability/slo');
        setSlo(s);
      } catch {
        setSlo(null);
      }
      setError(null);
      setUpdatedAt(new Date().toISOString());
    } catch (e) {
      setError(e instanceof Error && /403|FORBIDDEN/i.test(e.message) ? 'forbidden' : 'error');
    }
  }, []);

  useEffect(() => {
    // promise callback (não sincrono) — regra react-hooks/set-state-in-effect
    void Promise.resolve().then(refresh);
  }, [refresh]);

  if (error === 'forbidden') {
    return (
      <p role="alert" className="text-sm text-red-600 py-10" data-testid="obs-forbidden">
        {t.restricted}
      </p>
    );
  }

  const jobNames = health
    ? [
        ...JOB_ORDER.filter((n) => health.jobs[n]),
        ...Object.keys(health.jobs).filter((n) => !JOB_ORDER.includes(n)),
      ]
    : [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span
          className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${
            health?.schedulerEnabled
              ? 'bg-green-100 text-green-700'
              : 'bg-foreground/5 text-foreground/50'
          }`}
          data-testid="obs-scheduler"
        >
          <span
            aria-hidden="true"
            className={`w-1.5 h-1.5 rounded-full ${health?.schedulerEnabled ? 'bg-green-500' : 'bg-foreground/30'}`}
          />
          {health?.schedulerEnabled ? t.schedulerOn : t.schedulerOff}
        </span>
        <button
          type="button"
          onClick={() => void refresh()}
          className="text-sm rounded-lg border border-border px-3 py-1.5 text-foreground/70 hover:border-primary/50 hover:text-primary"
        >
          {t.refresh}
        </button>
      </div>
      {updatedAt && (
        <p className="text-xs text-foreground/40 -mt-4">
          {t.lastUpdated} {new Date(updatedAt).toLocaleString()}
        </p>
      )}

      {error === 'error' && (
        <p role="alert" className="text-sm text-red-600" data-testid="obs-error">
          {t.title}: ERROR
        </p>
      )}

      {/* Jobs */}
      <section aria-label={t.title}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {jobNames.map((name) => (
            <ObservabilityCard
              key={name}
              name={name}
              schedule={health?.schedules[name]}
              health={health!.jobs[name]}
              labels={{
                lastRun: t.jobLastRun,
                neverRun: t.jobNeverRun,
                success: t.jobSuccess,
                failure: t.jobFailure,
                duration: t.jobDuration,
              }}
            />
          ))}
        </div>
      </section>

      {/* Fila + alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-background rounded-2xl p-5 shadow-md border border-border/50">
          <h2 className="text-sm font-heading font-semibold text-foreground mb-3">{t.queue}</h2>
          {health?.queue ? (
            <QueueStatus
              counts={health.queue}
              labels={{
                waiting: t.queueWaiting,
                active: t.queueActive,
                completed: t.queueCompleted,
                failed: t.queueFailed,
                delayed: t.queueDelayed,
              }}
            />
          ) : (
            <p className="text-sm text-foreground/50">{health?.queueError ?? t.loading}</p>
          )}
          <p className="text-xs text-foreground/40 mt-3 font-mono">
            {t.schedules}:{' '}
            {Object.entries(health?.schedules ?? {})
              .map(([k, v]) => `${k}=${v}`)
              .join(' · ')}
          </p>
        </section>

        <section
          className="bg-background rounded-2xl p-5 shadow-md border border-border/50"
          data-testid="obs-alerts"
        >
          <h2 className="text-sm font-heading font-semibold text-foreground mb-3">{t.alerts}</h2>
          {health?.alerts.backlog && (
            <p className="text-xs text-red-600 mb-1">[ALERT] {t.backlog}</p>
          )}
          {health?.alerts.integrityDrift?.drift && (
            <p className="text-xs text-red-600 mb-1">
              [ALERT] {t.integrityDrift}:{' '}
              {health.alerts.integrityDrift.findings
                .map((f) => `${f.check}=${f.count}`)
                .join(' · ')}
            </p>
          )}
          {(health?.alerts.active ?? []).length === 0 ? (
            <p className="text-sm text-foreground/50">{t.alertsNone}</p>
          ) : (
            <ul className="space-y-1 font-mono text-xs">
              {health!.alerts.active.map((a, i) => (
                <li key={`${a.at}-${i}`} className="text-foreground/70">
                  <span className="text-foreground/40">{new Date(a.at).toLocaleTimeString()}</span>{' '}
                  <span className="text-red-600 uppercase">{a.kind}</span>{' '}
                  {a.job ? `(${a.job}) ` : ''}
                  {a.message}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* SLOs */}
      {slo && (
        <section
          className="bg-background rounded-2xl p-5 shadow-md border border-border/50"
          data-testid="obs-slo"
        >
          <h2 className="text-sm font-heading font-semibold text-foreground mb-3">{t.slo}</h2>
          <ul className="space-y-2 text-xs">
            {slo.slo.map((s) => (
              <li key={s.job} className="flex flex-wrap items-center gap-2 justify-between">
                <span className="font-mono text-foreground">{s.job}</span>
                <span className="text-foreground/50 font-mono">{s.schedule}</span>
                <span
                  className={`rounded-full px-2 py-0.5 ${
                    s.sloMet === null
                      ? 'bg-foreground/5 text-foreground/50'
                      : s.sloMet
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                  }`}
                >
                  {s.sloMet === null ? t.sloUnknown : s.sloMet ? t.sloMet : t.sloMissed}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Logs */}
      <section className="bg-background rounded-2xl p-5 shadow-md border border-border/50">
        <h2 className="text-sm font-heading font-semibold text-foreground mb-3">{t.logs}</h2>
        <LogViewer
          entries={logs?.entries ?? []}
          queueJobs={logs?.queueJobs ?? []}
          queueLabel={t.logsQueue}
          emptyLabel={t.logsEmpty}
        />
      </section>
    </div>
  );
}

export default function AdminObservabilityPage() {
  const { locale } = useI18n();
  const t = wsO1Strings[locale].observability;
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground">{t.title}</h1>
      <p className="text-foreground/60 mt-1 mb-8">{t.subtitle}</p>
      <ProtectedRoute>
        <ObservabilityPanel />
      </ProtectedRoute>
    </div>
  );
}
