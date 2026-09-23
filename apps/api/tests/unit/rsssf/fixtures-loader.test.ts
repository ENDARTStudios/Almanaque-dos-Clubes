import { describe, it, expect } from 'vitest';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadClubIndex,
  loadCompetitionIndex,
  loadFixtures,
  loadJson,
} from '../../../src/lib/rsssf/fixtures-loader.js';

// T448b-2b FASE 1 — loader de fixtures locais. Sem rede.

const here = dirname(fileURLToPath(import.meta.url));
const FIX = resolve(here, '../../fixtures/rsssf/mg');

describe('T448b-2b FASE 1 — fixtures-loader', () => {
  it('carrega as 3 fixtures reais do MG (2023–2025)', () => {
    const fx = loadFixtures(FIX);
    expect(fx.map((f) => f.season)).toEqual([2023, 2024, 2025]);
    for (const f of fx) {
      expect(f.meta.authorCredit.length).toBeGreaterThan(0);
      expect(f.meta.licenseText).toContain('acknowledgement');
      expect(f.rawBase64?.length).toBeGreaterThan(0);
    }
  });

  it('carrega os índices de amostra', () => {
    expect(loadClubIndex(resolve(FIX, 'clubs-index.sample.json')).length).toBe(2);
    expect(loadCompetitionIndex(resolve(FIX, 'competitions-index.sample.json'))[0].qid).toBe(
      'Q731877',
    );
    expect(
      loadJson<{ x: number }>(resolve(FIX, 'competitions-index.sample.json'))[0],
    ).toBeDefined();
  });
});
