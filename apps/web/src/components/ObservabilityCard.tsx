'use client';

/**
 * WS-O-1 — card de estado de um job/cron (último run, status, contadores).
 */

export interface JobHealthView {
  lastRunAt: string | null;
  lastStatus: 'success' | 'failure' | null;
  successCount: number;
  failureCount: number;
  lastDurationMs: number | null;
}

export default function ObservabilityCard({
  name,
  schedule,
  health,
  labels,
}: {
  name: string;
  schedule?: string;
  health: JobHealthView;
  labels: {
    lastRun: string;
    neverRun: string;
    success: string;
    failure: string;
    duration: string;
  };
}) {
  const statusColor =
    health.lastStatus === 'success'
      ? 'bg-green-100 text-green-700'
      : health.lastStatus === 'failure'
        ? 'bg-red-100 text-red-700'
        : 'bg-foreground/5 text-foreground/50';
  const statusLabel =
    health.lastStatus === 'success'
      ? labels.success
      : health.lastStatus === 'failure'
        ? labels.failure
        : labels.neverRun;
  return (
    <div
      className="bg-background rounded-2xl p-5 shadow-md border border-border/50"
      data-testid={`obs-card-${name}`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-heading font-semibold text-foreground text-sm truncate">{name}</h3>
        <span className={`text-xs rounded-full px-2 py-0.5 ${statusColor}`}>{statusLabel}</span>
      </div>
      {schedule && <p className="text-xs text-foreground/40 mt-1 font-mono">{schedule}</p>}
      <dl className="mt-3 space-y-1 text-xs text-foreground/60">
        <div className="flex justify-between gap-2">
          <dt>{labels.lastRun}</dt>
          <dd className="tabular-nums">
            {health.lastRunAt ? new Date(health.lastRunAt).toLocaleString() : labels.neverRun}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>{labels.success}</dt>
          <dd className="tabular-nums">{health.successCount}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>{labels.failure}</dt>
          <dd className="tabular-nums">{health.failureCount}</dd>
        </div>
        {health.lastDurationMs != null && (
          <div className="flex justify-between gap-2">
            <dt>{labels.duration}</dt>
            <dd className="tabular-nums">{(health.lastDurationMs / 1000).toFixed(1)}s</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
