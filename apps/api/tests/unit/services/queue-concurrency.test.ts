import { describe, expect, it } from 'vitest';
import { normalizeConcurrency } from '../../../src/services/queue.js';

// Regressão do deploy 2cb47c09 (11-04): `createWorker` sem opts passava
// `concurrency: undefined` ao BullMQ 6, que LANÇA no construtor do Worker —
// derrubando o boot da API inteira (registerDataRefreshCron).
describe('normalizeConcurrency', () => {
  it('undefined/null/NaN/0/negativo → 1 (nunca lança no BullMQ)', () => {
    expect(normalizeConcurrency(undefined)).toBe(1);
    expect(normalizeConcurrency(null)).toBe(1);
    expect(normalizeConcurrency('abc')).toBe(1);
    expect(normalizeConcurrency(0)).toBe(1);
    expect(normalizeConcurrency(-3)).toBe(1);
  });

  it('valor válido é respeitado e truncado para inteiro', () => {
    expect(normalizeConcurrency(1)).toBe(1);
    expect(normalizeConcurrency(4)).toBe(4);
    expect(normalizeConcurrency(2.7)).toBe(2);
    expect(normalizeConcurrency('3')).toBe(3);
  });
});
