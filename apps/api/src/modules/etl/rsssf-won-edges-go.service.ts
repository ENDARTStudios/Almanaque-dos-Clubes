/**
 * T448b-2d GO — Writer de arestas WON estaduais (Campeonato Goiano 2023–2024).
 *
 * GO não CRIA/LINKA entidades: resolve competição/clube SÓ por QID (fail-fast).
 * Idempotência factual = (clubId, competitionId, year, WON); inclui soft-deleted;
 * restore só para reasons de rollback do próprio piloto GO. Sem agora() em retrievedAt.
 */
import { Prisma, PrismaClient } from '@prisma/client';
import { GO_CHAMPION_QID, type GoCandidate } from '../../lib/rsssf/go/types.js';
import { RSSSF_LICENSE } from './connectors/rsssf-tables.connector.js';

export const GO_WRITER_VERSION = 't448b2d-writer-go-v1';
/** T448b-2d — writer dos pilotos 2025 (GO 2025 + PR 2025). */
export const GO_PR_WRITER_VERSION = 't448b2d-writer-go-pr-v1';
export const GO_PILOT_SCOPE_VALUE = 'go-2023-2024';
export const GO_WON_RESTORABLE_REASONS: readonly string[] = [
  'rollback_t448b2d_go_apply',
  'rollback_t448b2d_go_provenance',
  'rollback_t448b2d_go_failure',
];
export const GO_PR_WON_RESTORABLE_REASONS: readonly string[] = [
  ...GO_WON_RESTORABLE_REASONS,
  'rollback_t448b2d_go_2025_apply',
  'rollback_t448b2d_pr_2025_apply',
  'rollback_t448b2d_writers_failure',
];

export interface GoWonEdgeMetadata {
  year: number;
  season: string;
  hierarchy: 'estadual';
  gender: 'men' | 'women' | 'unknown';
  dataSource: 'rsssf';
  source: 'rsssf';
  sourceUrl: string;
  license: string;
  authorCredit: string;
  licenseText: string;
  retrievedAt: string;
  attributionRequired: true;
  parserVersion: string;
  writerVersion: string;
  dedupKey: string;
  externalId: string;
  pilotScope: string;
  uf: string;
  sourcePageUrlHash: string;
  championPhrase: string | null;
  tablePosition: number | null;
  importedAt: string;
  reactivatedAt?: string;
  reactivationReason?: string;
  previousDeletionReason?: string;
}

function assertIso(v: unknown, dedupKey: string): string {
  if (typeof v !== 'string' || v.trim() === '' || Number.isNaN(Date.parse(v))) {
    throw new Error(`retrievedAt ausente/inválido no candidate ${dedupKey}`);
  }
  return v;
}

export interface GoWonMetadataOptions {
  writerVersion?: string;
  uf?: string;
}

export function buildGoWonEdgeMetadata(
  c: GoCandidate,
  importedAt: Date,
  opts: GoWonMetadataOptions = {},
): GoWonEdgeMetadata {
  return {
    year: c.seasonYear,
    season: String(c.seasonYear),
    hierarchy: 'estadual',
    gender: c.gender,
    dataSource: 'rsssf',
    source: 'rsssf',
    sourceUrl: c.sourceUrl,
    license: RSSSF_LICENSE,
    authorCredit: c.authorCredit,
    licenseText: c.licenseText,
    retrievedAt: assertIso(c.retrievedAt, c.dedupKey),
    attributionRequired: true,
    parserVersion: c.parserVersion,
    writerVersion: opts.writerVersion ?? GO_WRITER_VERSION,
    dedupKey: c.dedupKey,
    externalId: c.externalId,
    pilotScope: c.metadataExtras.pilotScope,
    uf: opts.uf ?? c.metadataExtras.uf ?? 'GO',
    sourcePageUrlHash: c.metadataExtras.sourcePageUrlHash,
    championPhrase: c.metadataExtras.championPhrase,
    tablePosition: c.metadataExtras.tablePosition,
    importedAt: importedAt.toISOString(),
  };
}

export const GO_WON_STABLE_FIELDS: readonly string[] = [
  'source',
  'sourceUrl',
  'authorCredit',
  'licenseText',
  'retrievedAt',
  'hierarchy',
  'gender',
  'year',
  'parserVersion',
  'writerVersion',
  'dedupKey',
];

export function isSameGoStableData(prev: unknown, next: GoWonEdgeMetadata): boolean {
  const p = (prev as Record<string, unknown> | null) ?? {};
  const n = next as unknown as Record<string, unknown>;
  for (const f of GO_WON_STABLE_FIELDS) {
    // eslint-disable-next-line security/detect-object-injection -- lista fixa de campos
    const pv = f === 'year' ? Number(p.year) : p[f];
    // eslint-disable-next-line security/detect-object-injection -- lista fixa de campos
    const nv = f === 'year' ? Number(n.year) : n[f];
    if (pv !== nv) return false;
  }
  return true;
}

export interface GoClubRef {
  id: string;
  qid: string | null;
  name: string;
  deletedAt: Date | null;
}

export interface GoWonRepo {
  findCompetitionByQid(qid: string): Promise<Array<{ id: string }>>;
  findClubByQid(qid: string): Promise<GoClubRef[]>;
  findWonEdges(args: {
    clubId: string;
    competitionId: string;
    year: number;
  }): Promise<Array<{ id: string; metadata: unknown }>>;
  createWonEdge(args: {
    clubId: string;
    competitionId: string;
    metadata: GoWonEdgeMetadata;
  }): Promise<{ id: string }>;
  updateWonEdgeMetadata(id: string, metadata: GoWonEdgeMetadata): Promise<void>;
}

export function createPrismaGoWonRepo(prisma: PrismaClient): GoWonRepo {
  return {
    findCompetitionByQid: (qid) =>
      prisma.competition.findMany({ where: { qid }, select: { id: true } }),
    findClubByQid: (qid) =>
      prisma.club.findMany({
        where: { qid },
        select: { id: true, qid: true, name: true, deletedAt: true },
      }),
    findWonEdges: async ({ clubId, competitionId, year }) => {
      const edges = await prisma.knowledgeGraph.findMany({
        where: {
          sourceId: clubId,
          sourceType: 'Club',
          targetId: competitionId,
          targetType: 'Competition',
          relation: 'WON',
        },
        select: { id: true, metadata: true },
      });
      return edges.filter(
        (e) => Number((e.metadata as Record<string, unknown> | null)?.year) === year,
      );
    },
    createWonEdge: ({ clubId, competitionId, metadata }) =>
      prisma.knowledgeGraph.create({
        data: {
          sourceId: clubId,
          sourceType: 'Club',
          targetId: competitionId,
          targetType: 'Competition',
          relation: 'WON',
          metadata: metadata as unknown as Prisma.InputJsonObject,
        },
        select: { id: true },
      }),
    updateWonEdgeMetadata: async (id, metadata) => {
      await prisma.knowledgeGraph.update({
        where: { id },
        data: { metadata: metadata as unknown as Prisma.InputJsonObject },
      });
    },
  };
}

export interface GoWonCounts {
  created: number;
  updated: number;
  restored: number;
  skipped: number;
  failed: number;
  attributionMissing: number;
  duplicatesInBatch: number;
}

export interface GoWonRow {
  clubQid: string;
  competitionQid: string;
  year: number;
  edgeId: string;
}
export interface GoWonFailure {
  clubQid: string;
  reason:
    | 'attribution_missing'
    | 'invalid_retrieved_at'
    | 'missing_competition'
    | 'ambiguous_competition'
    | 'missing_club'
    | 'ambiguous_club'
    | 'soft_deleted_club'
    | 'unexpected_soft_deleted_edge'
    | 'duplicate_factual_edges'
    | 'out_of_scope_season'
    | 'out_of_scope_competition'
    | 'out_of_scope_club';
}

export interface GoWonSyncOptions {
  importedAt?: Date;
  /** Temporadas aceitas pelo escopo (default GO 2023–2024). */
  allowedYears?: readonly number[];
  /** Se definido, exige este QID de competição no candidate. */
  expectedCompetitionQid?: string;
  /** Se definido, exige este QID de clube no candidate. Default = campeão GO histórico. */
  expectedClubQid?: string;
  writerVersion?: string;
  uf?: string;
  restorableReasons?: readonly string[];
}
export interface GoWonSyncResult {
  counts: GoWonCounts;
  created: GoWonRow[];
  restored: GoWonRow[];
  failures: GoWonFailure[];
  totalCandidates: number;
}

export async function syncGoWonEdges(
  candidates: GoCandidate[],
  repo: GoWonRepo,
  opts: GoWonSyncOptions = {},
): Promise<GoWonSyncResult> {
  const importedAt = opts.importedAt ?? new Date();
  const allowedYears = opts.allowedYears ?? [2023, 2024];
  const expectedClubQid = opts.expectedClubQid ?? GO_CHAMPION_QID;
  const restorableReasons = opts.restorableReasons ?? GO_WON_RESTORABLE_REASONS;
  const counts: GoWonCounts = {
    created: 0,
    updated: 0,
    restored: 0,
    skipped: 0,
    failed: 0,
    attributionMissing: 0,
    duplicatesInBatch: 0,
  };
  const created: GoWonRow[] = [];
  const restored: GoWonRow[] = [];
  const failures: GoWonFailure[] = [];
  const seen = new Set<string>();

  for (const c of candidates) {
    if (seen.has(c.dedupKey)) {
      counts.duplicatesInBatch += 1;
      continue;
    }
    seen.add(c.dedupKey);

    // Guardas de escopo (fail-fast, zero escrita).
    if (!allowedYears.includes(c.seasonYear)) {
      counts.failed += 1;
      failures.push({ clubQid: c.clubQid, reason: 'out_of_scope_season' });
      continue;
    }
    if (opts.expectedCompetitionQid && c.competitionQid !== opts.expectedCompetitionQid) {
      counts.failed += 1;
      failures.push({ clubQid: c.clubQid, reason: 'out_of_scope_competition' });
      continue;
    }
    if (expectedClubQid && c.clubQid !== expectedClubQid) {
      counts.failed += 1;
      failures.push({ clubQid: c.clubQid, reason: 'out_of_scope_club' });
      continue;
    }
    if (!c.authorCredit?.trim() || !c.licenseText?.trim()) {
      counts.attributionMissing += 1;
      counts.failed += 1;
      failures.push({ clubQid: c.clubQid, reason: 'attribution_missing' });
      continue;
    }

    // Competição-mãe: só por QID (nunca criar).
    const comps = await repo.findCompetitionByQid(c.competitionQid);
    if (comps.length === 0) {
      counts.failed += 1;
      failures.push({ clubQid: c.clubQid, reason: 'missing_competition' });
      continue;
    }
    if (comps.length > 1) {
      counts.failed += 1;
      failures.push({ clubQid: c.clubQid, reason: 'ambiguous_competition' });
      continue;
    }
    const competitionId = comps[0].id;

    // Clube: só por QID (nunca criar/linkar por nome).
    const clubs = await repo.findClubByQid(c.clubQid);
    if (clubs.length === 0) {
      counts.failed += 1;
      failures.push({ clubQid: c.clubQid, reason: 'missing_club' });
      continue;
    }
    if (clubs.length > 1) {
      counts.failed += 1;
      failures.push({ clubQid: c.clubQid, reason: 'ambiguous_club' });
      continue;
    }
    if (clubs[0].deletedAt) {
      counts.failed += 1;
      failures.push({ clubQid: c.clubQid, reason: 'soft_deleted_club' });
      continue;
    }
    const clubId = clubs[0].id;

    let metadata: GoWonEdgeMetadata;
    try {
      metadata = buildGoWonEdgeMetadata(c, importedAt, {
        writerVersion: opts.writerVersion,
        uf: opts.uf,
      });
    } catch {
      counts.failed += 1;
      failures.push({ clubQid: c.clubQid, reason: 'invalid_retrieved_at' });
      continue;
    }

    const existingList = await repo.findWonEdges({ clubId, competitionId, year: c.seasonYear });
    if (existingList.length > 1) {
      counts.failed += 1;
      failures.push({ clubQid: c.clubQid, reason: 'duplicate_factual_edges' });
      continue;
    }
    const existing = existingList[0];
    if (existing) {
      const prev = (existing.metadata as Record<string, unknown> | null) ?? {};
      const isSoft = typeof prev.deletedAt === 'string' && prev.deletedAt.trim() !== '';
      if (isSoft) {
        const reason = typeof prev.deletionReason === 'string' ? prev.deletionReason : '';
        if (!restorableReasons.includes(reason)) {
          counts.failed += 1;
          failures.push({ clubQid: c.clubQid, reason: 'unexpected_soft_deleted_edge' });
          continue;
        }
        await repo.updateWonEdgeMetadata(existing.id, {
          ...metadata,
          reactivatedAt: importedAt.toISOString(),
          reactivationReason: 't448b2d_go_provenance_fix',
          previousDeletionReason: reason,
        });
        counts.restored += 1;
        restored.push({
          clubQid: c.clubQid,
          competitionQid: c.competitionQid,
          year: c.seasonYear,
          edgeId: existing.id,
        });
        continue;
      }
      if (isSameGoStableData(prev, metadata)) counts.skipped += 1;
      else {
        await repo.updateWonEdgeMetadata(existing.id, metadata);
        counts.updated += 1;
      }
      continue;
    }

    const row = await repo.createWonEdge({ clubId, competitionId, metadata });
    counts.created += 1;
    created.push({
      clubQid: c.clubQid,
      competitionQid: c.competitionQid,
      year: c.seasonYear,
      edgeId: row.id,
    });
  }

  return { counts, created, restored, failures, totalCandidates: candidates.length };
}
