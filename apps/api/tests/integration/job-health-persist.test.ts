/**
 * Dívida #303 — persistência do health de jobs em Redis.
 * (a) recordJobRun grava na memória do processo (comportamento original intacto)
 * (b) getJobHealthMerged sobe entrada persistida de job SEM entrada em memória
 *     (simula o pós-redeploy: memória zerada, Redis com o run das 03:00)
 * (c) memória MAIS RECENTE vence a persistida (não-regressão do relógio)
 * (d) fail-open: sem Redis, merged resolve com a memória (nunca lança)
 *
 * Redis vem do serviço do CI; local sem Redis ⇒ skip LOGADO (D-2026-09-18:
 * sem skip silencioso) — as asserções (a)/(d) ainda rodam.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import {
  recordJobRun,
  getJobHealth,
  getJobHealthMerged,
} from '../../src/jobs/data-refresh.scheduler.js';
import { cache } from '../../src/services/cache.js';

let redisOk = false;

beforeAll(async () => {
  try {
    // Sonda com TTL curto (o serviço de cache não expõe delete — a chave expira só).
    await cache.set('jobs:health:__probe', '1', 10);
    redisOk = (await cache.get<string>('jobs:health:__probe')) === '1';
  } catch {
    redisOk = false;
  }
  if (!redisOk) {
    console.warn(
      '[job-health-persist] Redis ausente — testes (b)/(c) pulados com motivo declarado',
    );
  }
});

describe('health de jobs persistido (dívida #303)', () => {
  it('(a) recordJobRun grava na memória do processo', () => {
    recordJobRun('ranking:compute', 'success', 123);
    const mem = getJobHealth()['ranking:compute'];
    expect(mem).toBeTruthy();
    expect(mem?.lastStatus).toBe('success');
    expect(mem?.lastDurationMs).toBe(123);
    expect(mem?.successCount).toBeGreaterThan(0);
  });

  it('(b) entrada persistida de job sem entrada em memória entra no merged', async () => {
    if (!redisOk) return; // skip logado no beforeAll
    // O merger só sonda nomes canônicos + chaves presentes na memória — semear
    // 'integrity-check' (memória com lastRunAt null ⇒ persistida mais recente vence).
    const persisted = {
      lastRunAt: new Date().toISOString(),
      lastStatus: 'success' as const,
      successCount: 7,
      failureCount: 0,
      lastDurationMs: 4321,
    };
    await cache.set('jobs:health:integrity-check', JSON.stringify(persisted), 60);
    const merged = await getJobHealthMerged();
    expect(merged['integrity-check']?.successCount).toBe(7);
    expect(merged['integrity-check']?.lastDurationMs).toBe(4321);
  });

  it('(c) memória mais recente vence a persistida', async () => {
    if (!redisOk) return; // skip logado no beforeAll
    // Garante entrada em memória com agora.
    recordJobRun('t077-race-job', 'success', 10);
    // Persiste uma entrada "de ontem" para o mesmo job.
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    await cache.set(
      'jobs:health:t077-race-job',
      JSON.stringify({
        lastRunAt: yesterday,
        lastStatus: 'success',
        successCount: 99,
        failureCount: 0,
        lastDurationMs: 999,
      }),
      60,
    );
    const merged = await getJobHealthMerged();
    expect(merged['t077-race-job']?.lastDurationMs).toBe(10);
    expect(merged['t077-race-job']?.successCount).toBe(1);
  });

  it('(d) merged nunca lança — resolve com a memória presente', async () => {
    const merged = await getJobHealthMerged();
    expect(merged).toBeTypeOf('object');
    // Nomes canônicos sempre sondados aparecem com entrada ou ausentes —
    // mas a chamada em si é infalível (fail-open por construção).
    expect(Object.isFrozen(merged)).toBe(false);
  });
});
