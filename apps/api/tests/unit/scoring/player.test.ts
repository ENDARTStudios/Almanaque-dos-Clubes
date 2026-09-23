import { describe, it, expect } from 'vitest';
import {
  calculateIndividualPoints,
  applyConsistencyBonus,
  applySampleCap,
  matchRawPoints,
} from '../../../src/lib/scoring/engine/computePlayerRaw.js';
import { minMaxNormalize } from '../../../src/lib/scoring/utils/normalization.js';
import { PLAYER_WEIGHTS } from '../../../src/lib/scoring/constants/weights.js';
import type { PlayerMatchStats } from '../../../src/lib/scoring/types/player.js';

// T449b — testes PUROS do motor de jogador. Zero DB, zero rede (mocks sintéticos).

const match = (over: Partial<PlayerMatchStats> = {}): PlayerMatchStats => ({
  competitionTier: 'nacional',
  phase: 'regular',
  minutesPlayed: 90,
  goals: 0,
  assists: 0,
  shotsOnTarget: 0,
  passesCompleted: 0,
  crossesCompleted: 0,
  dribblesCompleted: 0,
  defensiveActions: 0,
  yellowCards: 0,
  redCards: 0,
  foulsCommitted: 0,
  ...over,
});

describe('T449b Jogador — Caso A: ordem antes da normalização', () => {
  it('atacante de elite supera atacante mediano (mesma posição)', () => {
    // Comparação DENTRO da posição: raw cross-position não é apples-to-apples
    // (a normalização é por grupo/posição — ver metodologia).
    const elite = calculateIndividualPoints(
      [match({ goals: 2, assists: 1, shotsOnTarget: 4 })],
      PLAYER_WEIGHTS.ATACANTE,
    );
    const median = calculateIndividualPoints(
      [match({ goals: 0, assists: 0, shotsOnTarget: 1 })],
      PLAYER_WEIGHTS.ATACANTE,
    );
    expect(elite).toBeGreaterThan(median);
    expect(median).toBeCloseTo(1.5);
  });

  it('MIJ por fase escala os pontos (final > amistoso)', () => {
    const stats = [match({ goals: 1, phase: 'final' }), match({ goals: 1, phase: 'friendly' })];
    const pts = calculateIndividualPoints(stats, PLAYER_WEIGHTS.ATACANTE);
    const final = matchRawPoints(stats[0], PLAYER_WEIGHTS.ATACANTE) * 1.5;
    const friendly = matchRawPoints(stats[1], PLAYER_WEIGHTS.ATACANTE) * 0.5;
    expect(pts).toBeCloseTo(final + friendly);
  });
});

describe('T449b Jogador — Caso B: amostra insuficiente (cap)', () => {
  it('minutos < 10% do grupo ⇒ nota capada em 70', () => {
    const highRaw = 99;
    expect(applySampleCap(highRaw, 0.05, 70)).toBe(70);
    expect(applySampleCap(highRaw, 0.5, 70)).toBe(99); // amostra ok, sem cap
  });
});

describe('T449b Jogador — Caso C: cartões vermelhos reduzem o bruto', () => {
  it('acúmulo de vermelhos reduz linearmente (peso)', () => {
    const noCards = matchRawPoints(match({ defensiveActions: 5 }), PLAYER_WEIGHTS.VOLANTE_ZAGUEIRO);
    const oneRed = matchRawPoints(
      match({ defensiveActions: 5, redCards: 1 }),
      PLAYER_WEIGHTS.VOLANTE_ZAGUEIRO,
    );
    expect(oneRed).toBeCloseTo(noCards + PLAYER_WEIGHTS.VOLANTE_ZAGUEIRO.redCards);
    const twoReds = matchRawPoints(
      match({ defensiveActions: 5, redCards: 2 }),
      PLAYER_WEIGHTS.VOLANTE_ZAGUEIRO,
    );
    expect(twoReds).toBeLessThan(oneRed);
  });

  it('bônus de consistência: >80% titular ⇒ +5%; <50% ⇒ -10%', () => {
    expect(applyConsistencyBonus(100, 90, 0.9)).toBeCloseTo(105);
    expect(applyConsistencyBonus(100, 90, 0.3)).toBeCloseTo(90);
    expect(applyConsistencyBonus(100, 90, 0.6)).toBeCloseTo(100);
  });
});

describe('T449b Jogador — Caso D: MinMax com outlier extremo', () => {
  it('comprime a escala (outlier 500 vs 10-20)', () => {
    const scores = [500, 20, 15, 10];
    const norm = minMaxNormalize(scores);
    expect(norm[0]).toBe(100);
    expect(norm[3]).toBe(0);
    // 20, 15 e 10 ficam comprimidos perto de 0..
    expect(norm[1]).toBeLessThanOrEqual(2);
    expect(norm[2]).toBeLessThanOrEqual(2);
  });

  it('todos iguais ⇒ fallback 50 (sem divisão por zero)', () => {
    expect(minMaxNormalize([7, 7, 7])).toEqual([50, 50, 50]);
    expect(minMaxNormalize([])).toEqual([]);
  });
});
