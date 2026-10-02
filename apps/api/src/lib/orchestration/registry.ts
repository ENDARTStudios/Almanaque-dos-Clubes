/**
 * WS-G-1 — Registro de jobs (dry-run). Liga cada `JobKind` ao seu schema de validação e
 * ao planner puro. NÃO há caminho de escrita aqui.
 */
import {
  JOB_SCHEMAS,
  type WikidataIdentityScanInput,
  type WikidataEnrichmentPlanInput,
  type RsssfStateChampionsPlanInput,
  type RankingRefreshDryRunInput,
  type GeoAttributionAuditInput,
} from './schemas.js';
import {
  auditGeoAttribution,
  planRankingRefreshDiff,
  planRsssfStateChampions,
  planWikidataEnrichment,
  planWikidataIdentityScan,
  type EnrichClub,
  type ExistingRef,
  type FetchedAttrs,
  type GeoAuditClub,
  type IdentityCandidate,
  type RankingEntryInput,
  type RsssfRow,
} from './planners.js';
import type { JobKind, PlanResult } from './types.js';

/** Dados injetáveis (network-free nos testes; em produção viriam de fetchers gated). */
export interface DryRunDeps {
  identityCandidates?: IdentityCandidate[];
  existingRefs?: ExistingRef[];
  enrichClubs?: EnrichClub[];
  fetchedAttrs?: FetchedAttrs[];
  rsssfRows?: RsssfRow[];
  currentRanking?: RankingEntryInput[];
  proposedRanking?: RankingEntryInput[];
  geoClubs?: GeoAuditClub[];
}

export interface JobDefinition {
  kind: JobKind;
  schema: { parse: (v: unknown) => unknown };
  run: (input: unknown, deps: DryRunDeps) => PlanResult<unknown>;
}

export const JOB_REGISTRY: Record<JobKind, JobDefinition> = {
  'wikidata-identity-scan': {
    kind: 'wikidata-identity-scan',
    schema: JOB_SCHEMAS['wikidata-identity-scan'],
    run: (_input, deps) =>
      planWikidataIdentityScan({
        candidates: deps.identityCandidates ?? [],
        existing: deps.existingRefs ?? [],
      }) as PlanResult<unknown>,
  },
  'wikidata-enrichment-plan': {
    kind: 'wikidata-enrichment-plan',
    schema: JOB_SCHEMAS['wikidata-enrichment-plan'],
    run: (input, deps) => {
      const parsed = input as WikidataEnrichmentPlanInput;
      return planWikidataEnrichment({
        clubs: deps.enrichClubs ?? [],
        fetched: deps.fetchedAttrs ?? [],
        fields: parsed.fields,
      }) as PlanResult<unknown>;
    },
  },
  'rsssf-state-champions-plan': {
    kind: 'rsssf-state-champions-plan',
    schema: JOB_SCHEMAS['rsssf-state-champions-plan'],
    run: (_input, deps) =>
      planRsssfStateChampions({ rows: deps.rsssfRows ?? [] }) as PlanResult<unknown>,
  },
  'ranking-refresh-dry-run': {
    kind: 'ranking-refresh-dry-run',
    schema: JOB_SCHEMAS['ranking-refresh-dry-run'],
    run: (_input, deps) =>
      planRankingRefreshDiff({
        current: deps.currentRanking ?? [],
        proposed: deps.proposedRanking ?? [],
      }).plan as PlanResult<unknown>,
  },
  'geo-attribution-audit': {
    kind: 'geo-attribution-audit',
    schema: JOB_SCHEMAS['geo-attribution-audit'],
    run: (_input, deps) =>
      auditGeoAttribution({ clubs: deps.geoClubs ?? [] }) as PlanResult<unknown>,
  },
};

export type {
  WikidataIdentityScanInput,
  WikidataEnrichmentPlanInput,
  RsssfStateChampionsPlanInput,
  RankingRefreshDryRunInput,
  GeoAttributionAuditInput,
};
