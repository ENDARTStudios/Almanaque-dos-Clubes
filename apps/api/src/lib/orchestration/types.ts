/**
 * WS-G-1 — Tipos da orquestração ETL/cron (SCAFFOLDING read-only).
 *
 * Regra desta camada: NENHUM caminho de escrita. Os "jobs" aqui são DRY-RUN por contrato —
 * planejam e medem, nunca aplicam. A aplicação (apply) exige um pipeline gated separado,
 * com aprovação explícita (ver docs/WS-G-1-FASE0-DESIGN.md §9).
 */

export const JOB_KINDS = [
  'wikidata-identity-scan',
  'wikidata-enrichment-plan',
  'rsssf-state-champions-plan',
  'ranking-refresh-dry-run',
  'geo-attribution-audit',
] as const;

export type JobKind = (typeof JOB_KINDS)[number];

/** Fontes permitidas (allowlist). Sem fonte nova sem licença/ToS verificados. */
export const ALLOWED_SOURCES = ['wikidata', 'rsssf', 'openstreetmap', 'seed'] as const;
export type SourceName = (typeof ALLOWED_SOURCES)[number];

/** Motivos padronizados de skip (observabilidade + auditoria). */
export type SkipReason =
  | 'existing_qid'
  | 'soft_deleted_qid'
  | 'missing_qid'
  | 'no_missing_fields'
  | 'no_fetched_data'
  | 'ambiguous'
  | 'duplicate'
  | 'unchanged';

export interface PlannedItem<T = Record<string, unknown>> {
  action: 'create' | 'update' | 'publish' | 'audit';
  entity: T;
  source: SourceName;
}

export interface SkippedItem {
  key: string;
  reason: SkipReason;
  detail?: string;
}

export interface PlanResult<T = Record<string, unknown>> {
  planned: Array<PlannedItem<T>>;
  skipped: SkippedItem[];
}

export interface JobMetrics {
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  itemsProcessed: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsSkipped: number;
  skippedByReason: Record<string, number>;
  errors: number;
  rateLimitBackoffs: number;
}

export interface JobManifest<T = Record<string, unknown>> {
  manifestVersion: 'ws-g-1-dry-run-v1';
  mode: 'dry-run';
  batchId: string;
  kind: JobKind;
  startedAt: string;
  finishedAt: string;
  metrics: JobMetrics;
  plan: PlanResult<T>;
  /** Nunca contém segredos (ver redact.ts). */
  context: Record<string, unknown>;
}
