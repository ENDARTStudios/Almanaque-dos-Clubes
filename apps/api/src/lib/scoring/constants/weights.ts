/**
 * T449b — Constantes do motor de scoring (pesos, multiplicadores, penalidades).
 * Ilustrativas/documentadas; refináveis com benchmark futuro. Públicas em
 * docs/METODOLOGIA_RANKING.md (nenhuma caixa-preta).
 */
import type {
  PlayerPosition,
  PositionWeightMatrix,
  CompetitionTier,
  MatchPhase,
} from '../types/player.js';

/** Pesos por posição (matriz posição × estatística). */
export const PLAYER_WEIGHTS: Record<PlayerPosition, PositionWeightMatrix> = {
  ATACANTE: {
    goals: 3.0,
    assists: 2.5,
    shotsOnTarget: 1.5,
    passesCompleted: 0.5,
    crossesCompleted: 0.3,
    dribblesCompleted: 1.0,
    defensiveActions: 0.1,
    cleanSheet: 0,
    penaltiesSaved: 0,
    penaltiesMissed: -1.5,
    penaltiesConceded: 0,
    yellowCards: -0.2,
    redCards: -2.0,
    foulsCommitted: -0.05,
    errorsLeadingToGoal: -1.0,
  },
  MEIA: {
    goals: 2.0,
    assists: 3.0,
    shotsOnTarget: 1.0,
    passesCompleted: 1.0,
    crossesCompleted: 1.5,
    dribblesCompleted: 1.5,
    defensiveActions: 0.3,
    cleanSheet: 0,
    penaltiesSaved: 0,
    penaltiesMissed: -1.5,
    penaltiesConceded: 0,
    yellowCards: -0.2,
    redCards: -2.0,
    foulsCommitted: -0.05,
    errorsLeadingToGoal: -1.0,
  },
  VOLANTE_ZAGUEIRO: {
    goals: 1.0,
    assists: 0.5,
    shotsOnTarget: 0.2,
    passesCompleted: 1.5,
    crossesCompleted: 0.2,
    dribblesCompleted: 0.1,
    defensiveActions: 3.0,
    cleanSheet: 0,
    penaltiesSaved: 0,
    penaltiesMissed: -1.5,
    penaltiesConceded: 0,
    yellowCards: -0.3,
    redCards: -2.5,
    foulsCommitted: -0.1,
    errorsLeadingToGoal: -1.5,
  },
  LATERAL: {
    goals: 0.8,
    assists: 1.5,
    shotsOnTarget: 0.5,
    passesCompleted: 1.0,
    crossesCompleted: 2.0,
    dribblesCompleted: 1.0,
    defensiveActions: 1.5,
    cleanSheet: 0,
    penaltiesSaved: 0,
    penaltiesMissed: -1.5,
    penaltiesConceded: 0,
    yellowCards: -0.2,
    redCards: -2.0,
    foulsCommitted: -0.08,
    errorsLeadingToGoal: -1.2,
  },
  GOLEIRO: {
    goals: 0,
    assists: 0,
    shotsOnTarget: 0,
    passesCompleted: 0.5,
    crossesCompleted: 0,
    dribblesCompleted: 0,
    defensiveActions: 0,
    cleanSheet: 2.0,
    penaltiesSaved: 3.0,
    penaltiesMissed: 0,
    penaltiesConceded: -0.5,
    yellowCards: -0.5,
    redCards: -5.0,
    foulsCommitted: -0.1,
    errorsLeadingToGoal: -3.0,
  },
};

/** Multiplicador de Importância do Jogo (MIJ) por fase (final vale mais). */
export const MIJ_BY_PHASE: Record<MatchPhase, number> = {
  friendly: 0.5,
  regular: 1.0,
  group: 1.1,
  round16: 1.2,
  quarter: 1.25,
  semi: 1.3,
  final: 1.5,
};

/** Peso hierárquico da competição (aplicado ao desempenho individual). */
export const HIERARCHY_WEIGHT: Record<CompetitionTier, number> = {
  mundial: 5.0,
  continental: 4.0,
  nacional: 3.0,
  estadual: 2.0,
  municipal: 1.0,
};

/** Regra de amostra insuficiente: < 10% dos minutos médios do grupo ⇒ cap. */
export const LOW_SAMPLE_RATIO = 0.1;
export const LOW_SAMPLE_CAP = 70;

/** Bônus/desconto de consistência (titularidade + minutos). */
export const CONSISTENCY_BONUS_RATIO = 0.8; // >80% ⇒ +5%
export const CONSISTENCY_BONUS = 0.05;
export const CONSISTENCY_PENALTY_RATIO = 0.5; // <50% ⇒ -10%
export const CONSISTENCY_PENALTY = 0.1;

// ----- Técnicos -----
export const COACH_TITLE_BONUS: Record<CompetitionTier, number> = {
  mundial: 50,
  continental: 40,
  nacional: 30,
  estadual: 15,
  municipal: 8,
};
/** Fração do bônus de título quando chegou à semi/final sem vencer. */
export const COACH_FINALIST_FRACTION = 0.5;
export const COACH_PROMOTION_BONUS = 20;
export const COACH_RELEGATION_PENALTY = -30;
export const COACH_PROGRESS_K = 1.0; // Δposição × K
export const COACH_MIN_MATCHES = 10; // abaixo ⇒ amostra insuficiente
export const COACH_INTERIM_FACTOR = 0.7; // mandato curto ⇒ ×0.7
