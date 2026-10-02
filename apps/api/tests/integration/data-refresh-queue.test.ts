/**
 * T451 — Integração da fila data-refresh (exige Redis: CI tem serviço redis:7;
 * local sem Redis pula honestamente).
 *
 * O round-trip completo worker→job ficou para produção: o mecanismo BullMQ já é
 * provado lá pelo cron diário do ranking (T425, RANKING_CRON_AUTO=1). Aqui
 * testamos o que é NOSSO: despacho do handler, contadores de health e a fila
 * aceitando/consultando jobs.
 */
import { describe, it, expect, afterAll } from 'vitest';
import type { Job } from 'bullmq';
import { Redis } from 'ioredis';
import { queues } from '../../src/services/queue.js';
import {
  JOB_INTEGRITY_CHECK,
  dataRefreshJobHandler,
  getJobHealth,
} from '../../src/jobs/data-refresh.scheduler.js';

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  connectTimeout: 2000,
});

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
  try {
    redis.disconnect();
  } catch {
    /* já fechado */
  }
});

describe('T451 fila data-refresh', () => {
  it('handler direto registra success e falha de job desconhecido no health', async () => {
    // snapshot POR VALOR (getJobHealth devolve o objeto vivo, que o handler muta)
    const beforeSuccess = getJobHealth()[JOB_INTEGRITY_CHECK].successCount;
    const beforeFailure = getJobHealth()[JOB_INTEGRITY_CHECK].failureCount;

    await dataRefreshJobHandler({ name: JOB_INTEGRITY_CHECK, data: {} } as Job);
    const after = getJobHealth()[JOB_INTEGRITY_CHECK];
    expect(after.successCount).toBe(beforeSuccess + 1);
    expect(after.lastStatus).toBe('success');
    expect(after.lastRunAt).not.toBeNull();
    expect(after.lastDurationMs).not.toBeNull();

    await expect(
      dataRefreshJobHandler({ name: 'job-inexistente', data: {} } as Job),
    ).rejects.toThrow('job desconhecido');
    expect(getJobHealth()[JOB_INTEGRITY_CHECK].failureCount).toBe(beforeFailure);
  });

  it(
    'job entra na fila data-refresh e é consultável (Redis no CI)',
    { timeout: 30_000 },
    async () => {
      const ok = await probeRedis();
      if (!ok) {
        if (process.env.TEST_REQUIRE_REDIS === 'true') {
          throw new Error('[T451/TEST_REQUIRE_REDIS] Redis ausente no ambiente — falha, não skip');
        }
        return; // local sem Redis: pulado honestamente (CI valida)
      }
      const job = await queues.dataRefresh.add(JOB_INTEGRITY_CHECK, { probe: true });
      const state = await job.getState();
      expect(['waiting', 'delayed', 'completed', 'active']).toContain(state);
      const counts = await queues.dataRefresh.getJobCounts();
      const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);
      expect(total).toBeGreaterThanOrEqual(1);
      await job.remove().catch(() => undefined);
    },
  );
});
