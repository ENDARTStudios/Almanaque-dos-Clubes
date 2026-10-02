import { describe, it, expect, afterEach } from 'vitest';
import { runDryRun, createDryRunHandler } from '../../../src/lib/orchestration/runner.js';
import type { Job } from 'bullmq';

// WS-G-1 — runner dry-run: nunca escreve; apply recusado; re-run determinístico.

const geoClubs = [
  { id: 'c1', qid: 'Q1', metadata: { coordSource: 'nominatim' } },
  { id: 'c2', qid: 'Q2', metadata: { coordSource: 'P115_P131' } },
];

afterEach(() => {
  delete process.env.ORCHESTRATION_ENABLED;
});

describe('runDryRun', () => {
  it('gera manifest dry-run com métricas e plano', () => {
    const m = runDryRun('geo-attribution-audit', {}, { deps: { geoClubs } });
    expect(m.mode).toBe('dry-run');
    expect(m.manifestVersion).toBe('ws-g-1-dry-run-v1');
    expect(m.plan.planned).toHaveLength(1); // c1 sem atribuição
    expect(m.metrics.itemsSkipped).toBe(1); // c2 não-OSM
    expect(m.metrics.durationMs).not.toBeNull();
  });

  it('recusa apply:true (trava dura, sem escrita)', () => {
    expect(() => runDryRun('geo-attribution-audit', { apply: true })).toThrow(/apply/);
  });

  it('rejeita payload inválido (Zod)', () => {
    expect(() => runDryRun('rsssf-state-champions-plan', { uf: 'G', year: 1800 })).toThrow();
  });

  it('re-run é determinístico (noop)', () => {
    const a = runDryRun('geo-attribution-audit', {}, { deps: { geoClubs } });
    const b = runDryRun('geo-attribution-audit', {}, { deps: { geoClubs } });
    expect(a.plan).toEqual(b.plan);
  });
});

describe('createDryRunHandler (flag off por default)', () => {
  const job = {
    id: '1',
    name: 'geo-attribution-audit',
    data: { payload: {}, deps: { geoClubs } },
  } as unknown as Job;

  it('flag OFF → no-op (não roda, não escreve)', async () => {
    const events: string[] = [];
    await createDryRunHandler((msg) => events.push(msg))(job);
    expect(events.some((e) => e.includes('disabled'))).toBe(true);
  });

  it('flag ON → roda dry-run', async () => {
    process.env.ORCHESTRATION_ENABLED = 'true';
    const events: Array<{ msg: string; meta?: Record<string, unknown> }> = [];
    await createDryRunHandler((msg, meta) => events.push({ msg, meta }))(job);
    const done = events.find((e) => e.msg.includes('dry-run finished'));
    expect(done).toBeTruthy();
    expect(done?.meta?.planned).toBe(1);
  });
});
