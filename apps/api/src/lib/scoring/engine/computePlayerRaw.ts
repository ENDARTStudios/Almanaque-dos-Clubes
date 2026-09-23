/**
 * T449b — Motor de pontos BRUTOS de jogador. Funções PURAS (sem DB/rede).
 */
import type { PlayerMatchStats, PositionWeightMatrix } from '../types/player.js';
import {
  MIJ_BY_PHASE,
  LOW_SAMPLE_RATIO,
  LOW_SAMPLE_CAP,
  CONSISTENCY_BONUS_RATIO,
  CONSISTENCY_BONUS,
  CONSISTENCY_PENALTY_RATIO,
  CONSISTENCY_PENALTY,
} from '../constants/weights.js';

const n = (v: number | undefined): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** Pontos brutos de UMA partida (sem MIJ). */
export function matchRawPoints(stats: PlayerMatchStats, w: PositionWeightMatrix): number {
  return (
    n(stats.goals) * w.goals +
    n(stats.assists) * w.assists +
    n(stats.shotsOnTarget) * w.shotsOnTarget +
    n(stats.passesCompleted) * w.passesCompleted +
    n(stats.crossesCompleted) * w.crossesCompleted +
    n(stats.dribblesCompleted) * w.dribblesCompleted +
    n(stats.defensiveActions) * w.defensiveActions +
    (stats.cleanSheet ? w.cleanSheet : 0) +
    n(stats.penaltiesSaved) * w.penaltiesSaved +
    n(stats.penaltiesMissed) * w.penaltiesMissed +
    n(stats.penaltiesConceded) * w.penaltiesConceded +
    n(stats.yellowCards) * w.yellowCards +
    n(stats.redCards) * w.redCards +
    n(stats.foulsCommitted) * w.foulsCommitted +
    n(stats.errorsLeadingToGoal) * w.errorsLeadingToGoal
  );
}

/**
 * Soma das partidas aplicando o MIJ (Multiplicador de Importância do Jogo).
 * `mijMultipliers` opcional por partida; ausente ⇒ derivado da fase (MIJ_BY_PHASE).
 */
export function calculateIndividualPoints(
  stats: PlayerMatchStats[],
  weights: PositionWeightMatrix,
  mijMultipliers?: number[],
): number {
  return stats.reduce((sum, s, i) => {
    const mij =
      mijMultipliers && typeof mijMultipliers[i] === 'number'
        ? mijMultipliers[i]
        : MIJ_BY_PHASE[s.phase];
    return sum + matchRawPoints(s, weights) * mij;
  }, 0);
}

/** Bônus/desconto de consistência por titularidade. */
export function applyConsistencyBonus(
  rawScore: number,
  _avgMinutes: number,
  starterRatio: number,
): number {
  if (starterRatio > CONSISTENCY_BONUS_RATIO) return rawScore * (1 + CONSISTENCY_BONUS);
  if (starterRatio < CONSISTENCY_PENALTY_RATIO) return rawScore * (1 - CONSISTENCY_PENALTY);
  return rawScore;
}

/**
 * Regra anti-inflação: score final é capado quando o jogador tem amostra
 * insuficiente (minutos < LOW_SAMPLE_RATIO da média do grupo).
 */
export function applySampleCap(score: number, minutesRatio: number, cap = LOW_SAMPLE_CAP): number {
  return minutesRatio < LOW_SAMPLE_RATIO ? Math.min(score, cap) : score;
}
