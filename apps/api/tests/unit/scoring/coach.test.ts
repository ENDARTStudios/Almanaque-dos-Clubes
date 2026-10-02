import { describe, it, expect } from 'vitest';
import {
  calculateEfficiencyBase,
  calculateImpactEliminations,
  calculateProgressDelta,
  aggregateCoachScore,
  weightedCompetitionWeight,
} from '../../../src/lib/scoring/engine/computeCoachRaw.js';
import { minMaxNormalize } from '../../../src/lib/scoring/utils/normalization.js';
import { COACH_RELEGATION_PENALTY } from '../../../src/lib/scoring/constants/weights.js';

// T449b — testes PUROS do motor de técnico. Zero DB, zero rede.

describe('T449b Técnico — Caso A: interino vs temporada completa', () => {
  it('mandato interino sofre desconto (×0.7)', () => {
    const eff = calculateEfficiencyBase(4, 1, 0, [{ tier: 'nacional', matches: 5 }]); // 0.8*100*3=240
    const asInterim = aggregateCoachScore(eff, 0, 0, { isInterim: true, tenureType: 'interim' });
    const asMain = aggregateCoachScore(eff, 0, 0, { isInterim: false, tenureType: 'full_season' });
    expect(asMain).toBeCloseTo(240);
    expect(asInterim).toBeCloseTo(240 * 0.7);
  });

  it('peso médio ponderado por jogos (nacional=3)', () => {
    expect(weightedCompetitionWeight([{ tier: 'nacional', matches: 10 }])).toBe(3);
  });
});

describe('T449b Técnico — Caso B: título Mundial vs Estadual', () => {
  it('bônus escalonado por hierarquia', () => {
    expect(calculateImpactEliminations([{ competitionTier: 'mundial' }], [])).toBe(50);
    expect(calculateImpactEliminations([{ competitionTier: 'estadual' }], [])).toBe(15);
  });

  it('finalista sem título recebe metade do bônus', () => {
    expect(calculateImpactEliminations([], [{ tier: 'continental', stage: 'final' }])).toBeCloseTo(
      20,
    ); // 40 * 0.5
  });
});

describe('T449b Técnico — Caso C: rebaixamento sob comando', () => {
  it('rebaixamento aplica penalidade severa (-30 base)', () => {
    const withRelegation = calculateProgressDelta(5, 19, false, true);
    const withoutRelegation = calculateProgressDelta(5, 19, false, false);
    expect(withoutRelegation).toBeCloseTo((5 - 19) * 1);
    expect(withRelegation - withoutRelegation).toBeCloseTo(COACH_RELEGATION_PENALTY);
    expect(withRelegation).toBeLessThan(withoutRelegation);
  });

  it('promoção soma +20', () => {
    expect(calculateProgressDelta(5, 1, true, false)).toBeCloseTo((5 - 1) * 1 + 20);
  });
});

describe('T449b Técnico — Caso D: empate perfeito no MinMax', () => {
  it('todos com a mesma taxa ⇒ fallback 50 (controlado)', () => {
    const effs = [150, 150, 150].map((e) =>
      aggregateCoachScore(e, 0, 0, { isInterim: false, tenureType: 'main' }),
    );
    expect(minMaxNormalize(effs)).toEqual([50, 50, 50]);
  });
});
