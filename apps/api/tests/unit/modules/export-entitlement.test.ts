/**
 * T094/T096 — entitlement e quota de exportação (matriz pura, sem rede/DB).
 * Fonte da verdade: catálogo /planos — PRO=csv · ELITE=csv+json · FREE=nada.
 */
import { describe, it, expect } from 'vitest';
import {
  resolveExportEntitlement,
  exportQuotaKey,
  secondsUntilUtcMidnight,
  EXPORT_DAILY_LIMIT,
} from '../../../src/modules/export/entitlement.js';

describe('resolveExportEntitlement (T094)', () => {
  it('FREE não exporta nenhum formato (minPlan informado)', () => {
    expect(resolveExportEntitlement('FREE', 'csv')).toEqual({
      allowed: false,
      minPlan: 'PRO',
    });
    expect(resolveExportEntitlement('FREE', 'json')).toEqual({
      allowed: false,
      minPlan: 'ELITE',
    });
  });

  it('PRO exporta csv, mas json exige ELITE', () => {
    expect(resolveExportEntitlement('PRO', 'csv')).toEqual({ allowed: true });
    expect(resolveExportEntitlement('PRO', 'json')).toEqual({
      allowed: false,
      minPlan: 'ELITE',
    });
  });

  it('ELITE exporta ambos', () => {
    expect(resolveExportEntitlement('ELITE', 'csv')).toEqual({ allowed: true });
    expect(resolveExportEntitlement('ELITE', 'json')).toEqual({ allowed: true });
  });

  it('limites diários declarados: PRO 20 · ELITE 60', () => {
    expect(EXPORT_DAILY_LIMIT.PRO).toBe(20);
    expect(EXPORT_DAILY_LIMIT.ELITE).toBe(60);
  });
});

describe('quota diária (T096)', () => {
  it('chave embute o dia UTC (janela e TTL coincidem)', () => {
    const key = exportQuotaKey('u1', new Date('2026-10-08T23:59:59Z'));
    expect(key).toBe('export:quota:u1:2026-10-08');
  });

  it('TTL termina na meia-noite UTC (1s a 86400s)', () => {
    expect(secondsUntilUtcMidnight(new Date('2026-10-08T00:00:00Z'))).toBe(86400);
    expect(secondsUntilUtcMidnight(new Date('2026-10-08T23:59:59Z'))).toBe(1);
    expect(secondsUntilUtcMidnight(new Date('2026-10-08T12:00:00Z'))).toBe(12 * 3600);
  });
});
