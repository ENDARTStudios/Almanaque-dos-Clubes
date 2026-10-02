/**
 * T451 — scheduler da fila `data-refresh` (BullMQ).
 *
 * Opt-in por env: o worker/agenda SÓ iniciam com ETL_SCHEDULER_ENABLED=1
 * (default OFF — despacho T451: "não ativar scheduler em produção sem flag").
 * Mesmo com o scheduler ativo, o job `wikidata-incremental` só ESCREVE com
 * WIKIDATA_DRY_RUN=false (default 'true' = dry-run) — dupla guarda.
 *
 * Agendas (UTC): wikidata-incremental diário 03:00 · integrity-check semanal
 * domingo 04:00. Retry máx 3 com backoff exponencial; timeout de 10 min/job.
 */
import type { Job } from 'bullmq';
import { queues, createWorker } from '../services/queue.js';
import { logger } from '../config/logger.js';
import { runWikidataIncremental } from './wikidata-incremental.js';
import { runIntegrityCheck } from './integrity-check.js';

export const DATA_REFRESH_QUEUE = 'dataRefresh' as const;
export const JOB_WIKIDATA_INCREMENTAL = 'wikidata-incremental' as const;
export const JOB_INTEGRITY_CHECK = 'integrity-check' as const;

export const WIKIDATA_CRON_PATTERN = '0 3 * * *' as const;
export const INTEGRITY_CRON_PATTERN = '0 4 * * 0' as const;

const JOB_TIMEOUT_MS = 10 * 60 * 1000;

export function isSchedulerEnabled(): boolean {
  return process.env.ETL_SCHEDULER_ENABLED === '1';
}

/** Contadores em memória para /jobs/health (gauge zera a cada redeploy — padrão metrics). */
export interface JobHealthEntry {
  lastRunAt: string | null;
  lastStatus: 'success' | 'failure' | null;
  successCount: number;
  failureCount: number;
  lastDurationMs: number | null;
}
const health: Record<string, JobHealthEntry> = {
  [JOB_WIKIDATA_INCREMENTAL]: {
    lastRunAt: null,
    lastStatus: null,
    successCount: 0,
    failureCount: 0,
    lastDurationMs: null,
  },
  [JOB_INTEGRITY_CHECK]: {
    lastRunAt: null,
    lastStatus: null,
    successCount: 0,
    failureCount: 0,
    lastDurationMs: null,
  },
};

export function getJobHealth(): Record<string, JobHealthEntry> {
  return health;
}

function record(jobName: string, status: 'success' | 'failure', durationMs: number): void {
  const entry = health[jobName] ?? {
    lastRunAt: null,
    lastStatus: null,
    successCount: 0,
    failureCount: 0,
    lastDurationMs: null,
  };
  entry.lastRunAt = new Date().toISOString();
  entry.lastStatus = status;
  entry.lastDurationMs = durationMs;
  if (status === 'success') entry.successCount += 1;
  else entry.failureCount += 1;
  health[jobName] = entry;
}

/** Roda o handler com teto duro de 10 min (rejeita, não derruba o processo). */
async function withTimeout(jobName: string, fn: () => Promise<void>): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${jobName}: timeout de ${JOB_TIMEOUT_MS / 60000} min`)),
          JOB_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function dataRefreshJobHandler(job: Job): Promise<void> {
  const startedAt = Date.now();
  try {
    if (job.name === JOB_WIKIDATA_INCREMENTAL) {
      const data = (job.data ?? {}) as { batchSize?: number; dryRun?: boolean };
      const out = await runWikidataIncremental({ batchSize: data.batchSize, dryRun: data.dryRun });
      logger.info(
        { scanned: out.scanned, updated: out.clubsUpdated, dryRun: out.dryRun },
        'data-refresh: incremental ok',
      );
    } else if (job.name === JOB_INTEGRITY_CHECK) {
      const report = await runIntegrityCheck();
      logger.info(
        { ok: report.ok, anomalies: report.anomalies.length },
        'data-refresh: integrity-check ok',
      );
    } else {
      throw new Error(`data-refresh: job desconhecido "${job.name}"`);
    }
    record(job.name, 'success', Date.now() - startedAt);
  } catch (err) {
    record(job.name, 'failure', Date.now() - startedAt);
    throw err;
  }
}

let registered = false;

/**
 * Registra o worker e as agendas recorrentes (idempotente por processo).
 * Exige Redis. Chamado no boot APENAS com ETL_SCHEDULER_ENABLED=1.
 */
export async function registerDataRefreshCron(): Promise<void> {
  if (registered) return;
  registered = true;
  createWorker(DATA_REFRESH_QUEUE, (job) =>
    withTimeout(job.name, () => dataRefreshJobHandler(job)),
  );

  await queues.dataRefresh.upsertJobScheduler(
    'wikidata-incremental-daily',
    { pattern: WIKIDATA_CRON_PATTERN },
    {
      name: JOB_WIKIDATA_INCREMENTAL,
      data: {},
      opts: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: { count: 10 },
        removeOnFail: { count: 100 },
      },
    },
  );
  await queues.dataRefresh.upsertJobScheduler(
    'integrity-check-weekly',
    { pattern: INTEGRITY_CRON_PATTERN },
    {
      name: JOB_INTEGRITY_CHECK,
      data: {},
      opts: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: { count: 10 },
        removeOnFail: { count: 100 },
      },
    },
  );
  logger.info(
    { wikidata: WIKIDATA_CRON_PATTERN, integrity: INTEGRITY_CRON_PATTERN },
    'data-refresh scheduler agendado (UTC)',
  );
}

// Fallback para processos worker dedicados (mesmo padrão do ranking-cron T425):
// auto-registra FORA de testes e só com a flag explícita.
if (process.env.NODE_ENV !== 'test' && isSchedulerEnabled()) {
  void registerDataRefreshCron();
}
