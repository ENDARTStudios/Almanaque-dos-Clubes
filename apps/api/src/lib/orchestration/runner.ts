/**
 * WS-G-1 — Runner DRY-RUN. Único modo desta camada: planeja e mede, NUNCA escreve.
 * `apply: true` no payload é recusado explicitamente (trava dura).
 */
import type { Job } from 'bullmq';
import { JOB_REGISTRY, type DryRunDeps } from './registry.js';
import { createMetrics, finishMetrics, recordSkip } from './metrics.js';
import { redact } from './redact.js';
import { orchestrationEnabled } from './flags.js';
import type { JobKind, JobManifest } from './types.js';

export interface RunDryRunOptions {
  deps?: DryRunDeps;
  now?: Date;
  context?: Record<string, unknown>;
}

export function runDryRun(
  kind: JobKind,
  payload: unknown,
  opts: RunDryRunOptions = {},
): JobManifest<unknown> {
  if (payload && typeof payload === 'object' && (payload as { apply?: unknown }).apply === true) {
    throw new Error('WS-G-1: modo apply não é suportado por esta camada (dry-run apenas).');
  }
  const parsed = JOB_REGISTRY[kind].schema.parse(payload ?? {});
  const startedAt = opts.now ?? new Date();
  const metrics = createMetrics(startedAt);

  const plan = JOB_REGISTRY[kind].run(parsed, opts.deps ?? {});

  for (const item of plan.planned) {
    if (item.action === 'create') metrics.itemsCreated += 1;
    else if (item.action === 'update') metrics.itemsUpdated += 1;
  }
  for (const s of plan.skipped) recordSkip(metrics, s.reason);
  metrics.itemsProcessed = plan.planned.length + plan.skipped.length;

  finishMetrics(metrics, opts.now);

  return {
    manifestVersion: 'ws-g-1-dry-run-v1',
    mode: 'dry-run',
    batchId: `${kind}-${startedAt.toISOString()}`,
    kind,
    startedAt: metrics.startedAt,
    finishedAt: metrics.finishedAt ?? startedAt.toISOString(),
    metrics,
    plan,
    context: redact(opts.context ?? {}),
  };
}

/**
 * Factory de handler de worker (BullMQ). FAIL-SAFE: com a flag de orquestração OFF
 * (default), o handler não faz nada. Mesmo ligada, roda APENAS dry-run — nunca aplica.
 */
export function createDryRunHandler(
  log: (msg: string, meta?: Record<string, unknown>) => void = () => {},
) {
  return async (job: Job): Promise<void> => {
    if (!orchestrationEnabled()) {
      log('orchestration disabled (flag off) — job ignorado', { jobId: job.id, name: job.name });
      return;
    }
    const kind = job.name as JobKind;
    if (!(kind in JOB_REGISTRY)) {
      log('unknown job kind — ignored', { jobId: job.id, name: job.name });
      return;
    }
    const deps = (job.data as { deps?: DryRunDeps } | undefined)?.deps ?? {};
    const manifest = runDryRun(kind, (job.data as { payload?: unknown })?.payload ?? {}, { deps });
    log('dry-run finished', {
      jobId: job.id,
      kind,
      batchId: manifest.batchId,
      planned: manifest.plan.planned.length,
      skipped: manifest.plan.skipped.length,
      metrics: manifest.metrics,
    });
  };
}
