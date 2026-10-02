/**
 * T449b — Tipos LÓGICOS do motor de nota 0-100 de TÉCNICOS.
 * Interfaces puras; sem I/O. Baseado em desempenho coletivo sob o mandato.
 */

import type { CompetitionTier } from './player.js';

export type TenureType = 'interim' | 'main' | 'full_season';

/** Nível alcançado numa competição eliminatória. */
export type FinalStage = 'none' | 'group' | 'round16' | 'quarter' | 'semi' | 'final';

/** Título conquistado sob o mandato. */
export interface Title {
  competitionTier: CompetitionTier;
  competitionName?: string;
}

/** Registro de um mandato/tenure de técnico. */
export interface CoachTenureRecord {
  startDate: string; // ISO
  endDate: string | null; // null = em curso
  matchesManaged: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  /** competições em que atuou e nº de jogos nelas (para peso médio ponderado). */
  competitionAppearances: Array<{ tier: CompetitionTier; matches: number }>;
  /** estágios finais alcançados por competição. */
  finalsReached: Array<{ tier: CompetitionTier; stage: FinalStage }>;
  titlesWon: Title[];
  leagueStartPosition?: number | null;
  leagueEndPosition?: number | null;
  promoted?: boolean;
  relegated?: boolean;
}

/** Contexto que ajusta o mandato (interinidade, recurso, etc.). */
export interface CoachContextModifier {
  isInterim: boolean;
  tenureType: TenureType;
  /** proxy grosseiro de recurso (ex.: divisão). Opcional/indisponível. */
  budgetProxy?: number | null;
  squadStrengthIndex?: number | null;
}
