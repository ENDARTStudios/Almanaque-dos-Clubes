/**
 * T448b-2d GO — Seed de IDENTIDADE (reduzido 2023–2024). Tipos puros.
 * SEM parser RSSSF, SEM writer WON, SEM arestas, SEM migration.
 * Proveniência persistível: `importedFrom` + `sourceUrl` (Competition/Club NÃO têm metadata).
 */

export const GO_SEED_SCOPE = 'go-2023-2024' as const;
export const GO_SEED_IMPORTED_FROM = 'wikidata-go-pre' as const;
export const GO_SEED_LICENSE = 'CC0' as const;
export const GO_SEED_RETRIEVED_AT = '2026-09-24T14:49:12Z' as const;

/** Ação de clube PERMITIDA no seed reduzido — só noop (nada de create/link). */
export type GoSeedClubAction = 'noop_if_present';

export interface GoSeedCompetition {
  qid: string;
  name: string;
  type: 'LEAGUE';
  country: string;
  importedFrom: string;
  sourceUrl: string;
}

export interface GoSeedClub {
  qid: string;
  action: GoSeedClubAction;
  name: string;
  country: string;
  sourceUrl: string;
}

export interface GoSeedExcluded {
  qid: string;
  name: string;
  reason: string;
  detail: string;
  pilotImpact: string;
}

export interface GoSeedPack {
  pilotScope: string;
  source: string;
  license: string;
  retrievedAt: string;
  competition: GoSeedCompetition;
  clubs: GoSeedClub[];
  excluded: GoSeedExcluded[];
  doNotTouch: string[];
}

/** Referência de competição lida do banco (para o plano). */
export interface GoSeedCompetitionRef {
  id: string;
  qid: string | null;
  name: string | null;
  type: string | null;
  country: string | null;
  importedFrom: string | null;
  sourceUrl: string | null;
}

/** Referência de clube lida do banco (para o plano). */
export interface GoSeedClubRef {
  id: string;
  qid: string | null;
  name: string;
  country: string | null;
  deletedAt: Date | null;
}

export type GoSeedActionName = 'create' | 'noop';

export interface CompetitionPlan {
  qid: string;
  action: GoSeedActionName;
  conflicts: string[];
}

export interface ClubPlan {
  qid: string;
  action: GoSeedActionName;
  conflicts: string[];
}

export interface GoSeedPlan {
  mode: 'DRY' | 'APPLY';
  pilotScope: string;
  competition: CompetitionPlan;
  clubs: ClubPlan[];
  excluded: Array<{ qid: string; reason: string }>;
  errors: string[];
  wouldWrite: boolean;
}
