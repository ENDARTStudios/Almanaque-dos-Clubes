/**
 * T449b — Motor de pontos BRUTOS de técnico. Funções PURAS (sem DB/rede).
 */
import type { CoachContextModifier, FinalStage, Title } from '../types/coach.js';
import type { CompetitionTier } from '../types/player.js';
import {
  HIERARCHY_WEIGHT,
  COACH_TITLE_BONUS,
  COACH_FINALIST_FRACTION,
  COACH_PROMOTION_BONUS,
  COACH_RELEGATION_PENALTY,
  COACH_PROGRESS_K,
  COACH_INTERIM_FACTOR,
} from '../constants/weights.js';

/** Peso hierárquico médio ponderado pelos jogos em cada competição. */
export function weightedCompetitionWeight(
  appearances: Array<{ tier: CompetitionTier; matches: number }>,
): number {
  const total = appearances.reduce((s, a) => s + a.matches, 0);
  if (total === 0) return HIERARCHY_WEIGHT.nacional;
  const sum = appearances.reduce((s, a) => s + HIERARCHY_WEIGHT[a.tier] * a.matches, 0);
  return sum / total;
}

/** Eficiência básica: taxa de vitória × 100 × peso médio ponderado. */
export function calculateEfficiencyBase(
  wins: number,
  _draws: number,
  _losses: number,
  appearances: Array<{ tier: CompetitionTier; matches: number }>,
): number {
  const total = wins + _draws + _losses;
  if (total === 0) return 0;
  const winRate = wins / total;
  return winRate * 100 * weightedCompetitionWeight(appearances);
}

/** Impacto em copas: bônus por título + fração por semi/final sem título. */
export function calculateImpactEliminations(
  titles: Title[],
  finals: Array<{ tier: CompetitionTier; stage: FinalStage }>,
): number {
  const titleTiers = new Set(titles.map((t) => t.competitionTier));
  let points = titles.reduce((s, t) => s + COACH_TITLE_BONUS[t.competitionTier], 0);
  for (const f of finals) {
    if ((f.stage === 'semi' || f.stage === 'final') && !titleTiers.has(f.tier)) {
      points += COACH_TITLE_BONUS[f.tier] * COACH_FINALIST_FRACTION;
    }
  }
  return points;
}

/** Progresso na liga: Δposição × K + promoção/rebaixamento. */
export function calculateProgressDelta(
  startPos: number | null | undefined,
  endPos: number | null | undefined,
  promoted?: boolean,
  relegated?: boolean,
): number {
  let pts = 0;
  if (typeof startPos === 'number' && typeof endPos === 'number') {
    pts += (startPos - endPos) * COACH_PROGRESS_K;
  }
  if (promoted) pts += COACH_PROMOTION_BONUS;
  if (relegated) pts += COACH_RELEGATION_PENALTY;
  return pts;
}

/** Agrega componentes; aplica desconto de interino/mandato curto. */
export function aggregateCoachScore(
  efficiencyBase: number,
  impactEliminations: number,
  progressDelta: number,
  modifier: Pick<CoachContextModifier, 'isInterim' | 'tenureType'>,
): number {
  const raw = efficiencyBase + impactEliminations + progressDelta;
  const interim = modifier.isInterim || modifier.tenureType === 'interim';
  return interim ? raw * COACH_INTERIM_FACTOR : raw;
}
