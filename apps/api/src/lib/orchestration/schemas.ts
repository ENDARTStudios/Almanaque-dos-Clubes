/**
 * WS-G-1 — Validação (Zod) dos payloads de job. Rejeita shape inesperado antes de qualquer planner.
 */
import { z } from 'zod';
import { JOB_KINDS } from './types.js';

export const JobKindSchema = z.enum(JOB_KINDS);

const iso2 = z
  .string()
  .regex(/^[A-Za-z]{2}$/, 'ISO 3166-1 alpha-2')
  .transform((s) => s.toUpperCase());
const qid = z.string().regex(/^Q\d+$/, 'QID Wikidata (Q…');

/** wikidata-identity-scan */
export const WikidataIdentityScanSchema = z.object({
  country: iso2.optional(),
  limit: z.number().int().min(1).max(2000).optional(),
});

/** wikidata-enrichment-plan */
export const WikidataEnrichmentPlanSchema = z.object({
  fields: z
    .array(z.enum(['fullName', 'city', 'coordinates']))
    .min(1)
    .default(['fullName', 'city', 'coordinates']),
  limit: z.number().int().min(1).max(2000).optional(),
});

/** rsssf-state-champions-plan */
export const RsssfStateChampionsPlanSchema = z.object({
  uf: z.string().min(2).max(3),
  year: z.number().int().min(1900).max(2100),
  url: z.string().url().optional(),
});

/** ranking-refresh-dry-run */
export const RankingRefreshDryRunSchema = z.object({
  scope: z.string().min(1),
  season: z.string().min(1),
  gender: z.enum(['men', 'women']).default('men'),
});

/** geo-attribution-audit */
export const GeoAttributionAuditSchema = z.object({
  country: iso2.optional(),
  limit: z.number().int().min(1).max(10000).optional(),
});

export const JOB_SCHEMAS = {
  'wikidata-identity-scan': WikidataIdentityScanSchema,
  'wikidata-enrichment-plan': WikidataEnrichmentPlanSchema,
  'rsssf-state-champions-plan': RsssfStateChampionsPlanSchema,
  'ranking-refresh-dry-run': RankingRefreshDryRunSchema,
  'geo-attribution-audit': GeoAttributionAuditSchema,
} as const;

export type WikidataIdentityScanInput = z.infer<typeof WikidataIdentityScanSchema>;
export type WikidataEnrichmentPlanInput = z.infer<typeof WikidataEnrichmentPlanSchema>;
export type RsssfStateChampionsPlanInput = z.infer<typeof RsssfStateChampionsPlanSchema>;
export type RankingRefreshDryRunInput = z.infer<typeof RankingRefreshDryRunSchema>;
export type GeoAttributionAuditInput = z.infer<typeof GeoAttributionAuditSchema>;

export { qid as qidSchema };
