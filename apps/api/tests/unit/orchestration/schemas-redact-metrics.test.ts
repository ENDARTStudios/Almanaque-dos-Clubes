import { describe, it, expect } from 'vitest';
import { JOB_SCHEMAS, JobKindSchema } from '../../../src/lib/orchestration/schemas.js';
import { redact } from '../../../src/lib/orchestration/redact.js';
import {
  createMetrics,
  finishMetrics,
  recordBackoff,
  recordError,
  recordSkip,
} from '../../../src/lib/orchestration/metrics.js';

// WS-G-1 — validação, redação de segredos e métricas.

describe('schemas', () => {
  it('aceita kinds válidos e rejeita inválidos', () => {
    expect(JobKindSchema.parse('geo-attribution-audit')).toBe('geo-attribution-audit');
    expect(() => JobKindSchema.parse('nope')).toThrow();
  });
  it('normaliza ISO2 para maiúsculas', () => {
    expect(JOB_SCHEMAS['geo-attribution-audit'].parse({ country: 'br' }).country).toBe('BR');
  });
  it('rejeita year fora do intervalo', () => {
    expect(() => JOB_SCHEMAS['rsssf-state-champions-plan'].parse({ uf: 'GO', year: 50 })).toThrow();
  });
});

describe('redact', () => {
  it('mascara chaves sensíveis', () => {
    const out = redact({
      DATABASE_URL: 'postgres://x',
      REDIS_URL: 'redis://y',
      token: 'abc',
      ok: 'v',
    }) as Record<string, unknown>;
    expect(out.DATABASE_URL).toBe('«redacted»');
    expect(out.REDIS_URL).toBe('«redacted»');
    expect(out.token).toBe('«redacted»');
    expect(out.ok).toBe('v');
  });
  it('mascara valores que parecem segredo', () => {
    const out = redact({ note: 'postgresql://user:pass@host/db' }) as Record<string, unknown>;
    expect(out.note).toBe('«redacted»');
  });
  it('não altera estruturas normais', () => {
    expect(redact({ a: 1, b: ['x', 'y'] })).toEqual({ a: 1, b: ['x', 'y'] });
  });
});

describe('metrics', () => {
  it('conta skips por motivo, erros e backoffs', () => {
    const m = createMetrics(new Date('2026-01-01T00:00:00Z'));
    recordSkip(m, 'existing_qid');
    recordSkip(m, 'existing_qid');
    recordSkip(m, 'ambiguous');
    recordError(m);
    recordBackoff(m);
    finishMetrics(m, new Date('2026-01-01T00:00:02Z'));
    expect(m.itemsSkipped).toBe(3);
    expect(m.skippedByReason).toEqual({ existing_qid: 2, ambiguous: 1 });
    expect(m.errors).toBe(1);
    expect(m.rateLimitBackoffs).toBe(1);
    expect(m.durationMs).toBe(2000);
  });
});
