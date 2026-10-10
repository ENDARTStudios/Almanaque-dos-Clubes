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
import {
  enrichClubsMediaBatch,
  enrichPlayersMediaBatch,
  enrichClubsEditorialBatch,
} from '../modules/etl/enrich-media.service.js';
import { pushLog } from '../lib/observability/log-buffer.js';
import { cache } from '../services/cache.js';
import { checkJobFailure } from '../lib/observability/alerts.js';
import { notifyNewTitlesSince } from '../modules/notifications/title-notification.generator.js';

export const DATA_REFRESH_QUEUE = 'dataRefresh' as const;
export const JOB_WIKIDATA_INCREMENTAL = 'wikidata-incremental' as const;
export const JOB_INTEGRITY_CHECK = 'integrity-check' as const;
// T506 — enrichment de mídia (escudos/estádios/cores + fotos), lotes diários.
export const JOB_ENRICH_CLUBS_MEDIA = 'enrich-clubs-media' as const;
export const JOB_ENRICH_PLAYERS_MEDIA = 'enrich-players-media' as const;
// T507 (W5) — texto editorial (Wikipedia REST, 3 idiomas).
export const JOB_ENRICH_CLUBS_EDITORIAL = 'enrich-clubs-editorial' as const;

export const WIKIDATA_CRON_PATTERN = '0 3 * * *' as const;
export const INTEGRITY_CRON_PATTERN = '0 4 * * 0' as const;
// Lotes seguros: 500 clubes/dia (~20 dias p/ 9.6k) e 2.000 jogadores/dia (~53 dias p/ 105k).
export const ENRICH_CLUBS_CRON_PATTERN = '0 4 * * *' as const;
export const ENRICH_PLAYERS_CRON_PATTERN = '0 5 * * *' as const;
export const ENRICH_CLUBS_BATCH = 500;
export const ENRICH_PLAYERS_BATCH = 2000;
export const ENRICH_EDITORIAL_CRON_PATTERN = '0 6 * * *' as const;
export const ENRICH_EDITORIAL_BATCH = 500;

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
  [JOB_ENRICH_CLUBS_MEDIA]: {
    lastRunAt: null,
    lastStatus: null,
    successCount: 0,
    failureCount: 0,
    lastDurationMs: null,
  },
  [JOB_ENRICH_PLAYERS_MEDIA]: {
    lastRunAt: null,
    lastStatus: null,
    successCount: 0,
    failureCount: 0,
    lastDurationMs: null,
  },
  [JOB_ENRICH_CLUBS_EDITORIAL]: {
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

/**
 * Dívida #303 — o health em memória zera a cada redeploy (o restart de 2026-10-08
 * 01:14 UTC apagou os gauges do cron das 03:00). Cada run persiste a entrada em
 * Redis (fire-and-forget: telemetria NUNCA falha o job) e a leitura mescla
 * memória × Redis ficando com a entrada de lastRunAt mais recente (fail-open:
 * Redis fora ⇒ só memória, como antes).
 */
const JOB_HEALTH_KEY_PREFIX = 'jobs:health:';
/** 8 dias — cobre o job semanal (integrity-check, domingo 04:00). */
const JOB_HEALTH_TTL_SECONDS = 8 * 24 * 3600;

function persistJobRun(jobName: string, entry: JobHealthEntry): void {
  void cache
    .set(`${JOB_HEALTH_KEY_PREFIX}${jobName}`, JSON.stringify(entry), JOB_HEALTH_TTL_SECONDS)
    .catch(() => {
      // Silenciado de propósito: o client do cache já loga warn único; telemetria
      // persistida é best-effort por construção.
    });
}

/** Nomes canônicos sempre sondados no Redis (mesmo sem entrada em memória). */
const KNOWN_JOB_NAMES = [
  'wikidata-incremental',
  'integrity-check',
  'ranking:compute',
  'enrich-clubs-media',
  'enrich-players-media',
  'enrich-clubs-editorial',
] as const;

export async function getJobHealthMerged(): Promise<Record<string, JobHealthEntry>> {
  const merged: Record<string, JobHealthEntry> = { ...health };
  const names = new Set<string>([...Object.keys(health), ...KNOWN_JOB_NAMES]);
  await Promise.all(
    [...names].map(async (name) => {
      try {
        const raw = await cache.get<string>(`${JOB_HEALTH_KEY_PREFIX}${name}`);
        if (!raw) return;
        const persisted = JSON.parse(raw) as JobHealthEntry;
        const mem = merged[name];
        const persistedNewer =
          persisted.lastRunAt != null &&
          (mem?.lastRunAt == null || new Date(persisted.lastRunAt) > new Date(mem.lastRunAt));
        if (persistedNewer) merged[name] = persisted;
      } catch {
        // fail-open: sem Redis, o health volta a ser só da instância (padrão metrics).
      }
    }),
  );
  return merged;
}

/** WS-O-1 — crons fora da fila (ex.: ranking) registram run no mesmo health. */
export function recordJobRun(
  jobName: string,
  status: 'success' | 'failure',
  durationMs: number,
): void {
  record(jobName, status, durationMs);
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
  persistJobRun(jobName, entry);
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
  pushLog({ level: 'info', job: job.name, event: 'start', data: { id: job.id } });
  try {
    if (job.name === JOB_WIKIDATA_INCREMENTAL) {
      const data = (job.data ?? {}) as { batchSize?: number; dryRun?: boolean };
      const out = await runWikidataIncremental({ batchSize: data.batchSize, dryRun: data.dryRun });
      logger.info(
        { scanned: out.scanned, updated: out.clubsUpdated, dryRun: out.dryRun },
        'data-refresh: incremental ok',
      );
      pushLog({
        level: 'info',
        job: job.name,
        event: 'done',
        data: {
          scanned: out.scanned,
          updated: out.clubsUpdated,
          errors: out.errors.length,
          dryRun: out.dryRun,
        },
      });
      // WS-C-8 — arestas WON criadas DESDE O ÚLTIMO CHECK viram notificações
      // new_title para favoritantes. O marcador persiste no Redis (sobrevive a
      // redeploy) e avança só após processar — arestas criadas ENTRE runs não
      // são perdidas (primeira tentativa usava o início do job e perdeu as
      // criadas antes dele). Falha de notificação NÃO falha o ETL.
      if (!out.dryRun) {
        const markerKey = 'data-refresh:new-titles-last-check';
        const lastCheck = await cache.get<string>(markerKey);
        const since = lastCheck ? new Date(lastCheck) : new Date(startedAt);
        const gen = await notifyNewTitlesSince(since);
        await cache.set(markerKey, new Date().toISOString(), 30 * 24 * 3600);
        if (gen) {
          pushLog({ level: 'info', job: job.name, event: 'notifications', data: { ...gen } });
        }
      }
    } else if (job.name === JOB_ENRICH_CLUBS_MEDIA) {
      // T506 — lote diário de mídia de clubes (só preenche NULL; re-run noop).
      const out = await enrichClubsMediaBatch(ENRICH_CLUBS_BATCH, { apply: true });
      logger.info(
        { processed: out.processed, updated: out.updated, skipped: out.skipped },
        'data-refresh: enrich-clubs-media ok',
      );
      pushLog({
        level: 'info',
        job: job.name,
        event: 'done',
        data: {
          processed: out.processed,
          updated: out.updated,
          skipped: out.skipped,
          unknownColors: out.unknownColors.length,
        },
      });
    } else if (job.name === JOB_ENRICH_PLAYERS_MEDIA) {
      const out = await enrichPlayersMediaBatch(ENRICH_PLAYERS_BATCH, { apply: true });
      logger.info(
        { processed: out.processed, updated: out.updated, skipped: out.skipped },
        'data-refresh: enrich-players-media ok',
      );
      pushLog({
        level: 'info',
        job: job.name,
        event: 'done',
        data: { processed: out.processed, updated: out.updated, skipped: out.skipped },
      });
    } else if (job.name === JOB_ENRICH_CLUBS_EDITORIAL) {
      // T507 (W5) — texto editorial (Wikipedia REST, CC-BY-SA).
      const out = await enrichClubsEditorialBatch(ENRICH_EDITORIAL_BATCH, { apply: true });
      logger.info(
        { processed: out.processed, updated: out.updated, skipped: out.skipped },
        'data-refresh: enrich-clubs-editorial ok',
      );
      pushLog({ level: 'info', job: job.name, event: 'done', data: { ...out } });
    } else if (job.name === JOB_INTEGRITY_CHECK) {
      const report = await runIntegrityCheck();
      logger.info(
        { ok: report.ok, anomalies: report.anomalies.length },
        'data-refresh: integrity-check ok',
      );
      pushLog({
        level: 'info',
        job: job.name,
        event: 'done',
        data: { ok: report.ok, anomalies: report.anomalies.length },
      });
    } else {
      throw new Error(`data-refresh: job desconhecido "${job.name}"`);
    }
    record(job.name, 'success', Date.now() - startedAt);
  } catch (err) {
    record(job.name, 'failure', Date.now() - startedAt);
    pushLog({
      level: 'error',
      job: job.name,
      event: 'failure',
      data: { error: err instanceof Error ? err.message : String(err) },
    });
    // WS-O-1 — alerta quando acumula falhas consecutivas (log crítico + buffer).
    checkJobFailure(job.name);
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
    'enrich-clubs-media-daily',
    { pattern: ENRICH_CLUBS_CRON_PATTERN },
    {
      name: JOB_ENRICH_CLUBS_MEDIA,
      data: {},
      opts: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 60_000 },
        removeOnComplete: { count: 10 },
        removeOnFail: { count: 50 },
      },
    },
  );
  await queues.dataRefresh.upsertJobScheduler(
    'enrich-players-media-daily',
    { pattern: ENRICH_PLAYERS_CRON_PATTERN },
    {
      name: JOB_ENRICH_PLAYERS_MEDIA,
      data: {},
      opts: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 60_000 },
        removeOnComplete: { count: 10 },
        removeOnFail: { count: 50 },
      },
    },
  );
  await queues.dataRefresh.upsertJobScheduler(
    'enrich-clubs-editorial-daily',
    { pattern: ENRICH_EDITORIAL_CRON_PATTERN },
    {
      name: JOB_ENRICH_CLUBS_EDITORIAL,
      data: {},
      opts: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 60_000 },
        removeOnComplete: { count: 10 },
        removeOnFail: { count: 50 },
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
    {
      wikidata: WIKIDATA_CRON_PATTERN,
      integrity: INTEGRITY_CRON_PATTERN,
      enrichClubs: ENRICH_CLUBS_CRON_PATTERN,
      enrichPlayers: ENRICH_PLAYERS_CRON_PATTERN,
      enrichEditorial: ENRICH_EDITORIAL_CRON_PATTERN,
    },
    'data-refresh scheduler agendado (UTC)',
  );
}

// Fallback para processos worker dedicados (mesmo padrão do ranking-cron T425):
// auto-registra FORA de testes e só com a flag explícita.
if (process.env.NODE_ENV !== 'test' && isSchedulerEnabled()) {
  void registerDataRefreshCron();
}
