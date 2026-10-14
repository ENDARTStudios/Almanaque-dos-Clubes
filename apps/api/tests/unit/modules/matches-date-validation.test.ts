/**
 * T548 — a data do filtro de /matches é validada ANTES de chegar ao banco.
 * Antes: `dateFrom=2026-03-45` descia até o Prisma e devolvia 500.
 */
import { describe, expect, it } from 'vitest';
import { isIsoDate } from '../../../src/modules/matches/routes.js';

describe('T548 — validação de data do filtro', () => {
  it('aceita YYYY-MM-DD de calendário real', () => {
    expect(isIsoDate('2026-10-13')).toBe(true);
    expect(isIsoDate('2020-02-29')).toBe(true); // bissexto
    expect(isIsoDate('2024-12-31')).toBe(true);
  });

  it('rejeita mês/dia inexistente (o `new Date` sozinho aceitaria)', () => {
    expect(isIsoDate('2026-13-45')).toBe(false);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('2021-02-29')).toBe(false); // não bissexto
    expect(isIsoDate('2026-00-10')).toBe(false);
  });

  it('rejeita formato que não seja ISO puro', () => {
    expect(isIsoDate('13/10/2026')).toBe(false);
    expect(isIsoDate('2026-10-13T00:00:00Z')).toBe(false);
    expect(isIsoDate('')).toBe(false);
    expect(isIsoDate('hoje')).toBe(false);
  });
});
