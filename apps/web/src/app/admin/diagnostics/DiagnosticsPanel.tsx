'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import type { JobHealthView } from '@/components/ObservabilityCard';
import type { QueueCountsView } from '@/components/QueueStatus';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';
import { fill } from '@/components/admin/strings';
import { diagnosticsStrings, type DiagnosticsStrings } from './strings';
import type { AdminDiagnosticsPayload, DiagnosticFlagView, WebProcessView } from './types';

/**
 * T-ADMIN-W3 — painel de DIAGNÓSTICO (/admin/diagnostics).
 *
 * Duas fontes, ambas já existentes ou estritamente necessárias:
 *   1. GET /api/v1/admin/diagnostics (novo): inventário de flags com valor real,
 *      processo que responde, origem no código e próxima execução dos jobs.
 *   2. GET /api/v1/jobs/health (já existia): último resultado de cada job e a fila.
 *      A página de /admin/observability consome a MESMA rota — nada de endpoint de
 *      saúde duplicado aqui.
 *
 * Honestidade na tela:
 *   - Flag de outro processo aparece como "Outro processo" com o motivo declarado;
 *     nunca um valor adivinhado.
 *   - Não existe botão de alternar flag: não há override persistido (o texto na tela
 *     diz isso e explica que mudar exige variável no provedor + redeploy).
 *   - Lacuna de Redis/scheduler aparece como lacuna, com o erro real.
 */

type Status = 'loading' | 'ready' | 'forbidden' | 'error';

interface HealthResponse {
  schedulerEnabled: boolean;
  schedules: Record<string, string>;
  queue: QueueCountsView | null;
  queueError: string | null;
  jobs: Record<string, JobHealthView>;
  alerts: {
    active: Array<{ at: string; kind: string; job?: string; message: string }>;
    backlog: boolean;
    integrityDrift: { drift: boolean } | null;
    checksError: string | null;
  };
}

function ValueChip({ flag, L }: { flag: DiagnosticFlagView; L: DiagnosticsStrings }) {
  if (flag.value === null) {
    return (
      <span
        className="inline-flex items-center rounded-full bg-neutral-surface px-2 py-0.5 text-xs text-ink-2"
        data-testid={`flag-value-${flag.key}`}
      >
        {L.valueUnknown}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs ${
        flag.value ? 'bg-success-surface text-success-ink' : 'bg-neutral-surface text-ink-2'
      }`}
      data-testid={`flag-value-${flag.key}`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${flag.value ? 'bg-success-ink' : 'bg-ink-3'}`}
      />
      {flag.value ? L.valueOn : L.valueOff}
    </span>
  );
}

function FlagCard({
  flag,
  L,
  webValue,
  webResolved,
}: {
  flag: DiagnosticFlagView;
  L: DiagnosticsStrings;
  webValue: boolean | null;
  webResolved: boolean;
}) {
  const value = flag.value !== null ? flag.value : webValue;
  const owner =
    flag.owner === 'api'
      ? L.ownerApi
      : flag.owner === 'web'
        ? `${L.ownerWeb} · Vercel`
        : L.ownerWorker;
  return (
    <li
      className="rounded-xl border border-border bg-muted p-4"
      data-testid={`flag-card-${flag.key}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <code className="font-mono text-sm break-all text-foreground">{flag.key}</code>
        <ValueChip flag={{ ...flag, value }} L={L} />
        <span className="rounded-full bg-background px-2 py-0.5 text-xs text-ink-3">{owner}</span>
        <span className="rounded-full bg-background px-2 py-0.5 text-xs text-ink-3">
          {flag.kind === 'derived' ? L.kindDerived : L.kindEnv}
        </span>
        <span className="rounded-full bg-background px-2 py-0.5 text-xs text-ink-3">
          {flag.scope}
        </span>
      </div>

      <dl className="mt-3 space-y-1 text-xs">
        <div className="flex gap-2">
          <dt className="shrink-0 text-ink-3">{L.effectOnLabel}</dt>
          <dd className="text-ink-2">{flag.effectOn}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 text-ink-3">{L.effectOffLabel}</dt>
          <dd className="text-ink-2">{flag.effectOff}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 text-ink-3">{L.defaultLabel}</dt>
          <dd className="text-ink-2">{flag.defaultOn ? L.defaultOn : L.defaultOff}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 text-ink-3">{L.sourceLabel}</dt>
          <dd className="font-mono break-all text-ink-2">{flag.source}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 text-ink-3">{L.rawLabel}</dt>
          <dd className="font-mono break-all text-ink-2">
            {flag.raw === null ? L.rawAbsent : flag.raw}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 text-ink-3">{L.changeLabel}</dt>
          <dd className="text-ink-2">{flag.change}</dd>
        </div>
      </dl>

      {flag.value === null && !webResolved && flag.unavailableReason && (
        <p className="mt-3 text-xs text-ink-3">{flag.unavailableReason}</p>
      )}

      {flag.drift && (
        <div className="mt-3 rounded-lg border border-warn-ink/40 bg-warn-surface p-2.5">
          <p className="text-xs font-semibold text-warn-ink">
            <span aria-hidden="true">⚠ </span>
            {L.driftLabel}
          </p>
          <p className="mt-1 text-xs text-ink-2">{flag.drift}</p>
        </div>
      )}
    </li>
  );
}

function DiagnosticsPanel({ web }: { web: WebProcessView }) {
  const { locale } = useI18n();
  const L = diagnosticsStrings[locale] ?? diagnosticsStrings['pt-br'];
  const [data, setData] = useState<AdminDiagnosticsPayload | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthFailed, setHealthFailed] = useState(false);
  const [status, setStatus] = useState<Status>('loading');

  // Mapa (e não indexação de objeto por chave variável) para cruzar as flags lidas
  // no servidor do site com o inventário da API.
  const webFlags = useMemo(() => new Map(Object.entries(web.flags)), [web.flags]);

  const refresh = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await api.get<{ data: AdminDiagnosticsPayload }>('/admin/diagnostics');
      setData(res.data);
      setStatus('ready');
    } catch (e) {
      const err = e as Error & { status?: number };
      setStatus(err.status === 403 || /403|FORBIDDEN/i.test(err.message) ? 'forbidden' : 'error');
      return;
    }
    try {
      const h = await api.get<{ data: HealthResponse }>('/jobs/health');
      setHealth(h.data);
      setHealthFailed(false);
    } catch {
      // Telemetria de jobs fora do ar NÃO derruba o inventário de flags: a seção
      // correspondente declara a lacuna.
      setHealth(null);
      setHealthFailed(true);
    }
  }, []);

  useEffect(() => {
    // promise callback (não sincrono) — regra react-hooks/set-state-in-effect
    void Promise.resolve().then(refresh);
  }, [refresh]);

  if (status === 'forbidden') {
    return (
      <p role="alert" className="py-10 text-sm text-danger-ink" data-testid="diag-forbidden">
        {L.restricted}
      </p>
    );
  }

  if (status === 'error') {
    return (
      <div className="py-10" data-testid="diag-error">
        <p role="alert" className="text-sm text-danger-ink">
          {L.error}
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="mt-3 min-h-8 rounded-lg border border-border px-3 py-1.5 text-sm text-ink-2 hover:border-primary/50 hover:text-primary-ink"
        >
          {L.refresh}
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <p role="status" className="py-10 text-sm text-ink-2" data-testid="diag-loading">
        {L.loading}
      </p>
    );
  }

  const apiProc = data.processes.api;
  const queueCounts = health?.queue ?? null;
  const activeAlerts = health?.alerts?.active.length ?? 0;
  // Divergência real: flag lida NOS DOIS processos com valores diferentes.
  const divergent = data.flags
    .filter((f) => f.value !== null && webFlags.has(f.key))
    .filter((f) => webFlags.get(f.key) !== f.value);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-2" data-testid="diag-generated-at">
          {L.generatedAt} {new Date(data.generatedAt).toLocaleString()}
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="min-h-8 rounded-lg border border-border px-3 py-1.5 text-sm text-ink-2 hover:border-primary/50 hover:text-primary-ink"
        >
          {L.refresh}
        </button>
      </div>

      {/* Processos */}
      <section aria-label={L.processTitle}>
        <h2 className="font-heading text-lg font-semibold text-foreground">{L.processTitle}</h2>
        <p className="mt-1 mb-4 text-sm text-ink-2">{L.processNote}</p>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2" data-testid="diag-processes">
          <div className="rounded-xl border border-border bg-muted p-4">
            <dt className="font-heading text-sm font-semibold text-foreground">{L.apiProcess}</dt>
            <dd className="mt-2 space-y-1 text-xs text-ink-2">
              <p>
                <span className="text-ink-3">{L.nodeEnv}: </span>
                <code className="font-mono">{apiProc.nodeEnv}</code>
              </p>
              <p>
                <span className="text-ink-3">{L.commit}: </span>
                <code className="font-mono break-all">{apiProc.commit ?? L.commitUnknown}</code>
              </p>
              <p>
                <span className="text-ink-3">{L.uptime}: </span>
                <span className="tabular-nums">{Math.round(apiProc.uptimeSeconds / 60)} </span>
                {L.uptimeUnit}
              </p>
              <p>
                <span className="text-ink-3">{L.scheduler}: </span>
                <span className={apiProc.schedulerEnabled ? 'text-success-ink' : 'text-ink-2'}>
                  {apiProc.schedulerEnabled ? L.schedulerOn : L.schedulerOff}
                </span>
              </p>
              <p>
                <span className="text-ink-3">{L.redis}: </span>
                {apiProc.redisConfigured ? L.redisOn : L.redisOff}
              </p>
            </dd>
          </div>
          <div className="rounded-xl border border-border bg-muted p-4">
            <dt className="font-heading text-sm font-semibold text-foreground">{L.webProcess}</dt>
            <dd className="mt-2 space-y-1 text-xs text-ink-2">
              <p>
                <span className="text-ink-3">{L.nodeEnv}: </span>
                <code className="font-mono">{web.nodeEnv ?? L.commitUnknown}</code>
              </p>
              <p>
                <span className="text-ink-3">{L.commit}: </span>
                <code className="font-mono break-all">{web.commit ?? L.commitUnknown}</code>
              </p>
              <p>
                <span className="text-ink-3">{L.deployment}: </span>
                <code className="font-mono">{web.deployment ?? L.commitUnknown}</code>
              </p>
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-ink-3">{L.separateServices}</p>
      </section>

      {/* Divergência entre processos */}
      <section aria-label={L.divergenceTitle} data-testid="diag-divergence">
        <h2 className="font-heading text-lg font-semibold text-foreground">{L.divergenceTitle}</h2>
        {divergent.length === 0 ? (
          <p className="mt-1 text-sm text-ink-2">{L.divergenceNone}</p>
        ) : (
          <ul className="mt-2 space-y-2 rounded-xl border border-warn-ink/40 bg-warn-surface p-4">
            {divergent.map((f) => (
              <li key={f.key} className="text-xs text-ink-2">
                {fill(L.divergenceBody, {
                  key: f.key,
                  api: f.value ? L.valueOn : L.valueOff,
                  web: webFlags.get(f.key) ? L.valueOn : L.valueOff,
                })}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Flags */}
      <section aria-label={L.flagsTitle}>
        <h2 className="font-heading text-lg font-semibold text-foreground">{L.flagsTitle}</h2>
        <p className="mt-1 text-sm text-ink-2">{L.flagsNote}</p>
        <p
          className="mt-3 rounded-xl border border-info-ink/40 bg-info-surface p-3 text-xs text-ink-2"
          data-testid="diag-no-toggle"
        >
          {L.noOverrideNote}
        </p>
        <ul className="mt-4 space-y-3" data-testid="diag-flags">
          {data.flags.map((flag) => {
            const has = webFlags.has(flag.key);
            return (
              <FlagCard
                key={flag.key}
                flag={flag}
                L={L}
                webValue={has ? webFlags.get(flag.key) === true : null}
                webResolved={has}
              />
            );
          })}
        </ul>
      </section>

      {/* Jobs */}
      <section aria-label={L.jobsTitle}>
        <h2 className="font-heading text-lg font-semibold text-foreground">{L.jobsTitle}</h2>
        <p className="mt-1 text-sm text-ink-2">{L.jobsNote}</p>

        {!apiProc.schedulerEnabled && (
          <p className="mt-3 rounded-xl border border-border bg-muted p-3 text-xs text-ink-2">
            {L.schedulerDisabled}
          </p>
        )}

        {data.schedulers.error !== null ? (
          <p
            className="mt-3 rounded-xl border border-warn-ink/40 bg-warn-surface p-3 text-xs text-ink-2"
            data-testid="diag-schedulers-gap"
          >
            {fill(L.schedulersGap, { error: data.schedulers.error })}
          </p>
        ) : data.schedulers.items.length === 0 ? (
          <p className="mt-3 text-sm text-ink-2" data-testid="diag-schedulers-empty">
            {L.nextUnknown}
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-muted">
            <table className="w-full min-w-[36rem] text-left text-xs">
              <caption className="sr-only">{L.jobsTitle}</caption>
              <thead>
                <tr className="border-b border-border text-ink-3">
                  <th scope="col" className="px-3 py-2 font-medium">
                    {L.colQueue}
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    {L.colJob}
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    {L.colCadence}
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    {L.colNext}
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    {L.colLastRun}
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    {L.colLastResult}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.schedulers.items.map((s) => {
                  const h = health?.jobs[s.name];
                  const lastResult = !h?.lastStatus
                    ? L.resultUnknown
                    : h.lastStatus === 'success'
                      ? L.resultSuccess
                      : L.resultFailure;
                  return (
                    <tr
                      key={`${s.queue}-${s.id ?? s.name}`}
                      className="border-b border-border/50 last:border-b-0"
                    >
                      <td className="px-3 py-2 font-mono text-ink-2">{s.queue}</td>
                      <td className="px-3 py-2 font-mono break-all text-foreground">{s.name}</td>
                      <td className="px-3 py-2 font-mono text-ink-2">
                        {s.pattern ?? (s.everyMs !== null ? `${s.everyMs} ms` : '—')}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-ink-2">
                        {s.nextRunAt === null
                          ? L.nextUnknown
                          : new Date(s.nextRunAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-ink-2">
                        {h?.lastRunAt ? new Date(h.lastRunAt).toLocaleString() : L.never}
                      </td>
                      <td
                        className={`px-3 py-2 ${
                          h?.lastStatus === 'failure' ? 'text-danger-ink' : 'text-ink-2'
                        }`}
                      >
                        {lastResult}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {healthFailed && (
          <p className="mt-3 text-xs text-danger-ink" data-testid="diag-health-gap">
            {L.healthGap}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2">
          {queueCounts && (
            <span data-testid="diag-queue">
              {L.queueLabel}: {L.queueActive} {queueCounts.active ?? 0} · {L.queueFailed}{' '}
              {queueCounts.failed ?? 0}
            </span>
          )}
          {activeAlerts > 0 && <span className="text-danger-ink">{activeAlerts} alerta(s)</span>}
          <Link
            href="/admin/observability"
            className="text-primary-ink underline-offset-2 hover:underline"
          >
            {L.viewObservability}
          </Link>
        </div>
      </section>

      {/* Pacote feature-flags */}
      <section aria-label={L.pkgTitle} data-testid="diag-pkg">
        <h2 className="font-heading text-lg font-semibold text-foreground">{L.pkgTitle}</h2>
        <p className="mt-1 text-sm text-ink-2">{L.pkgState}</p>
        <p className="mt-2 font-mono text-xs text-ink-3">{data.featureFlagPackage.module}</p>
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.featureFlagPackage.flags.map((f) => (
            <li
              key={f.key}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted px-3 py-2 text-xs"
            >
              <code className="font-mono text-ink-2">{f.key}</code>
              <span className="rounded-full bg-background px-2 py-0.5 text-ink-3">
                {f.minimumPlan}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Limites declarados */}
      <section aria-label={L.notesTitle}>
        <h2 className="font-heading text-lg font-semibold text-foreground">{L.notesTitle}</h2>
        <ul className="mt-2 space-y-2 text-xs text-ink-2">
          {data.notes.map((note) => (
            <li key={note} className="rounded-lg border border-border bg-muted p-3">
              {note}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/**
 * Moldura da página + painel. O H1 e o subtítulo ficam AQUI (e não no `page.tsx`)
 * porque `page.tsx` é Server Component — é ele que consegue ler o `process.env` do
 * processo web no momento da requisição, e o `useI18n` só existe no cliente.
 */
export default function DiagnosticsClient({ web }: { web: WebProcessView }) {
  const { locale } = useI18n();
  const L = diagnosticsStrings[locale] ?? diagnosticsStrings['pt-br'];
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">{L.title}</h1>
      <p className="mt-1 mb-8 text-ink-2">{L.subtitle}</p>
      <ProtectedRoute>
        <DiagnosticsPanel web={web} />
      </ProtectedRoute>
    </div>
  );
}
