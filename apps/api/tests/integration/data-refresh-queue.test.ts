/**
 * T451 — Integração da fila data-refresh (exige Redis: CI tem serviço redis:7;
 * local sem Redis pula honestamente). Prova: job enfileirado → worker processa
 * → health counters incrementam.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { Redis } from 'ioredis';
import { queues, createWorker, type Worker as BullWorker } from '../../src/services/queue.js';
import {
  DATA_REFRESH_QUEUE,
  JOB_INTEGRITY_CHECK,
  dataRefreshJobHandler,
  getJobHealth,
} from '../../src/jobs/data-refresh.scheduler.js';

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  connectTimeout: 2000,
});
let redisOk = false;
let worker: BullWorker | undefined;

async function probeRedis(): Promise<boolean> {
  try {
    await redis.connect();
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}

afterAll(async () => {
  if (worker) await worker.close();
  try {
    redis.disconnect();
  } catch {
    /* já fechado */
  }
});

describe('T451 fila data-refresh', () => {
  it(
    'job enfileirado é processado e registrado no health (Redis)',
    { timeout: 60_000 },
    async () => {
      redisOk = await probeRedis();
      if (!redisOk) {
        if (process.env.TEST_REQUIRE_DB === 'true' || process.env.TEST_REQUIRE_REDIS === 'true') {
          throw new Error('[T451/TEST_REQUIRE_REDIS] Redis ausente no ambiente — falha, não skip');
        }
        return; // local sem Redis: pulado honestamente (CI valida)
      }
      const before = getJobHealth()[JOB_INTEGRITY_CHECK].successCount;
      worker = createWorker(DATA_REFRESH_QUEUE, (job) => dataRefreshJobHandler(job));

      const job = await queues.dataRefresh.add(JOB_INTEGRITY_CHECK, {});
      const deadline = Date.now() + 30_000;
      let state = '';
      while (Date.now() < deadline) {
        state = await job.getState();
        if (state === 'completed' || state === 'failed') break;
        await new Promise((r) => setTimeout(r, 500));
      }
      expect(state).toBe('completed');
      expect(getJobHealth()[JOB_INTEGRITY_CHECK].successCount).toBeGreaterThan(before);
      const counts = await queues.dataRefresh.getJobCounts();
      expect(counts.completed ?? 0).toBeGreaterThanOrEqual(1);
    },
  );
});
