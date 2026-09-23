/**
 * T449b — Tipos LÓGICOS do motor de nota 0-100 de JOGADORES.
 *
 * Interfaces puras (NÃO são models Prisma; nenhum dado real é gravado/lido).
 * O motor recebe estatísticas granulares (futuras fontes) e devolve número bruto
 * ou normalizado. Determinístico, sem I/O.
 */

/** Posição principal — afeta os pesos relativos (D-spec Operador). */
export type PlayerPosition = 'ATACANTE' | 'MEIA' | 'VOLANTE_ZAGUEIRO' | 'LATERAL' | 'GOLEIRO';

export type CompetitionTier = 'mundial' | 'continental' | 'nacional' | 'estadual' | 'municipal';

export type MatchPhase =
  'regular' | 'group' | 'round16' | 'quarter' | 'semi' | 'final' | 'friendly';

/** Estatísticas individuais de UMA partida. Campos ausentes na fonte = undefined. */
export interface PlayerMatchStats {
  competitionTier: CompetitionTier;
  phase: MatchPhase;
  minutesPlayed: number;
  goals?: number;
  assists?: number;
  shotsOnTarget?: number;
  passesCompleted?: number;
  crossesCompleted?: number;
  dribblesCompleted?: number;
  /** tackles + interceptações + cortes + bloqueios (proxy DEF_ACTIONS). */
  defensiveActions?: number;
  /** goleiro — jogo sem sofrer gol. */
  cleanSheet?: boolean;
  penaltiesSaved?: number;
  penaltiesMissed?: number;
  penaltiesConceded?: number;
  yellowCards?: number;
  redCards?: number;
  foulsCommitted?: number;
  errorsLeadingToGoal?: number;
}

/** Matriz de pesos por estatística, por posição. */
export interface PositionWeightMatrix {
  goals: number;
  assists: number;
  shotsOnTarget: number;
  passesCompleted: number;
  crossesCompleted: number;
  dribblesCompleted: number;
  defensiveActions: number;
  cleanSheet: number;
  penaltiesSaved: number;
  penaltiesMissed: number;
  penaltiesConceded: number;
  yellowCards: number;
  redCards: number;
  foulsCommitted: number;
  errorsLeadingToGoal: number;
}

/** Agregado de temporada (entrada do pipeline de nota). */
export interface PlayerSeasonAggregate {
  totalMatches: number;
  totalMinutes: number;
  avgMinutes: number;
  /** fração de partidas como titular (0..1). */
  starterRatio: number;
  positionPrimary: PlayerPosition;
  /** minutos médios do grupo comparável (p/ regra de amostra insuficiente). */
  groupAvgMinutes: number;
  rawScoreBeforeNormalization: number;
}
