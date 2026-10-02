/**
 * T448b-2d GO — Tipos do PARSER puro (piloto Campeonato Goiano 2023–2024).
 * PURO: sem DB/rede/Prisma/escrita. Identidade por QID.
 */

export const GO_PARSER_VERSION = 't448b2d-go-parser-v1';
export const GO_PILOT_SCOPE = 'go-2023-2024';
export const GO_COMPETITION_QID = 'Q931386';
export const GO_CHAMPION_QID = 'Q198034';
export const GO_EXCLUDED_SEASONS = [2025];

import type { ReasonCode } from '../types.js';

/** Códigos do núcleo genérico + específicos de GO (hierarquia/exclusão). */
export type GoReasonCode = ReasonCode | 'hierarchy_unknown' | 'excluded_season_in_candidates';

export type GoSeverity = 'blocker' | 'review';

export interface GoCandidate {
  relation: 'WON';
  competitionQid: string;
  seasonYear: number;
  clubQid: string;
  hierarchy: 'estadual';
  gender: 'men' | 'women' | 'unknown';
  source: 'rsssf';
  sourceUrl: string;
  retrievedAt: string;
  authorCredit: string;
  licenseText: string;
  attributionRequired: true;
  externalId: string;
  dedupKey: string;
  parserVersion: string;
  metadataExtras: {
    championPhrase: string | null;
    tablePosition: number | null;
    sourcePageUrlHash: string;
    uf: string;
    pilotScope: string;
  };
}

export interface GoExcludedSeason {
  seasonYear: number;
  reason: string;
  clubQid?: string;
  detail?: string;
}

export interface GoPack {
  pilotScope: string;
  parserVersion: string;
  source: 'rsssf';
  attributionRequired: true;
  candidates: GoCandidate[];
  excluded: GoExcludedSeason[];
  doNotTouch: string[];
}

export interface GoPendingReview {
  reasonCode: GoReasonCode;
  severity: GoSeverity;
  season: number;
  competitionName: string;
  teamName: string | null;
  sourceUrl: string;
  details: Record<string, unknown>;
}
