import { describe, it, expect, afterAll } from 'vitest';
import {
  checkJobFailure,
  checkStaleJob,
  getAlerts,
} from '../../../src/lib/observability/alerts.js';
import { recordJobRun } from '../../../src/jobs/data-refresh.scheduler.js';

// WS-O-1 — alertas internos: falhas consecutivas disparam; estado fresco não.

const JOB = 'test-alert-job';

afterAll(() => {
  // health do job de teste vive só no processo (in-memory)
});

describe('checkJobFailure (WS-O-1)', () => {
  it('não alerta abaixo do threshold de falhas consecutivas', () => {
    recordJobRun(JOB, 'failure', 10);
    recordJobRun(JOB, 'failure', 10);
    expect(checkJobFailure(JOB, 3)).toBe(false);
  });

  it('alerta ao atingir 3 falhas consecutivas e registra no buffer', () => {
    recordJobRun(JOB, 'failure', 10);
    const fired = checkJobFailure(JOB, 3);
    expect(fired).toBe(true);
    const alert = getAlerts().find((a) => a.kind === 'job_failure' && a.job === JOB);
    expect(alert).toBeDefined();
    expect(alert?.message).toContain('3 falhas consecutivas');
  });

  it('sucesso reseta a sequência (última entrada manda)', () => {
    recordJobRun(JOB, 'success', 5);
    expect(checkJobFailure(JOB, 3)).toBe(false);
  });
});

describe('checkStaleJob (WS-O-1)', () => {
  it('job com run recente não está stale; job sem run = desconhecido (não alerta)', () => {
    recordJobRun('test-fresh-job', 'success', 5);
    expect(checkStaleJob('test-fresh-job', 48)).toBe(false);
    expect(checkStaleJob('job-que-nunca-rodou-ws-o-1', 48)).toBe(false);
  });
});

describe('buffer de alertas (WS-O-1)', () => {
  it('getAlerts limita e devolve mais recentes primeiro', () => {
    const all = getAlerts(10);
    for (let i = 1; i < all.length; i++) {
      expect(all[i - 1].at >= all[i].at).toBe(true);
    }
    expect(getAlerts(1).length).toBeLessThanOrEqual(1);
  });
});
