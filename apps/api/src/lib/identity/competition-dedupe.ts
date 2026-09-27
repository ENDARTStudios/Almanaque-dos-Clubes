/**
 * T448b-2i — Dedupe de competições (PURO). Identidade canônica = QID; nome é só agrupamento.
 */

export function normalizeCompetitionName(name: string): string {
  return (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export interface CompetitionRow {
  id: string;
  name: string;
  qid: string | null;
  deletedAt: Date | null;
}

export type CanonicalStatus =
  'ok' | 'ambiguous_no_qid' | 'ambiguous_multiple_qid' | 'duplicate_qid';

export interface CanonicalSelection {
  status: CanonicalStatus;
  canonicalId: string | null;
  canonicalQid: string | null;
  duplicates: CompetitionRow[];
}

/** Escolhe a canônica por QID (NUNCA por nome fuzzy/createdAt). */
export function selectCanonical(rows: CompetitionRow[]): CanonicalSelection {
  const active = rows.filter((r) => r.deletedAt == null);
  const withQid = active.filter((r) => r.qid != null);
  const qids = new Set(withQid.map((r) => r.qid));
  if (withQid.length > 1) {
    return {
      status: qids.size < withQid.length ? 'duplicate_qid' : 'ambiguous_multiple_qid',
      canonicalId: null,
      canonicalQid: null,
      duplicates: [],
    };
  }
  if (withQid.length === 0) {
    return { status: 'ambiguous_no_qid', canonicalId: null, canonicalQid: null, duplicates: [] };
  }
  const canonical = withQid[0];
  const duplicates = active.filter((r) => r.id !== canonical.id && r.qid == null);
  return { status: 'ok', canonicalId: canonical.id, canonicalQid: canonical.qid, duplicates };
}

export interface HumanPair {
  duplicateId: string;
  canonicalId: string;
  canonicalQid: string;
  duplicateName: string;
  canonicalName: string;
  reason: string;
  evidence: {
    wikidataUrl: string;
    wikidataLabels: string[];
    wikidataDescriptions?: string[];
    p31?: string[];
    notes?: string;
  };
}
export interface HumanPairsFile {
  version: string;
  source: string;
  reviewedBy: string;
  retrievedAt: string;
  pairs: HumanPair[];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Valida o arquivo de pares humanos (sem DB). */
export function validatePairsFile(raw: unknown): { errors: string[]; file: HumanPairsFile | null } {
  const errors: string[] = [];
  const f = raw as HumanPairsFile;
  if (!f || typeof f !== 'object') return { errors: ['pairs_file_invalid'], file: null };
  if (!f.retrievedAt || Number.isNaN(Date.parse(f.retrievedAt)))
    errors.push('retrievedAt_missing_or_invalid');
  if (!Array.isArray(f.pairs) || f.pairs.length === 0) errors.push('pairs_empty');
  const seen = new Set<string>();
  for (const p of f.pairs ?? []) {
    if (!UUID_RE.test(p.duplicateId ?? '')) errors.push(`duplicateId_invalid:${p.duplicateId}`);
    if (!UUID_RE.test(p.canonicalId ?? '')) errors.push(`canonicalId_invalid:${p.canonicalId}`);
    if (p.duplicateId === p.canonicalId) errors.push(`duplicate_equals_canonical:${p.duplicateId}`);
    if (seen.has(p.duplicateId)) errors.push(`duplicate_id_repeated:${p.duplicateId}`);
    seen.add(p.duplicateId);
    if (!/^Q\d+$/.test(p.canonicalQid ?? '')) errors.push(`canonicalQid_invalid:${p.duplicateId}`);
    if (!p.evidence?.wikidataUrl?.includes('/Q') || !p.evidence?.wikidataLabels?.length)
      errors.push(`evidence_missing:${p.duplicateId}`);
  }
  return { errors, file: errors.length ? null : f };
}

export type PairStatus =
  | 'ok'
  | 'same_id'
  | 'missing_duplicate'
  | 'missing_canonical'
  | 'duplicate_has_qid'
  | 'duplicate_soft_deleted'
  | 'canonical_soft_deleted'
  | 'canonical_qid_mismatch';

/** Valida um par humano contra as rows atuais (sem usar nome). */
export function validateHumanPair(
  pair: HumanPair,
  duplicate: CompetitionRow | null,
  canonical: CompetitionRow | null,
): PairStatus {
  if (pair.duplicateId === pair.canonicalId) return 'same_id';
  if (!duplicate) return 'missing_duplicate';
  if (!canonical) return 'missing_canonical';
  if (duplicate.qid != null) return 'duplicate_has_qid';
  if (duplicate.deletedAt != null) return 'duplicate_soft_deleted';
  if (canonical.deletedAt != null) return 'canonical_soft_deleted';
  if (canonical.qid !== pair.canonicalQid) return 'canonical_qid_mismatch';
  return 'ok';
}

export type ReferenceTable = 'knowledge_graph' | 'rankings' | 'matches';
export type ReferenceColumn = 'targetId' | 'sourceId' | 'competitionId';

export interface ReferenceCount {
  table: ReferenceTable;
  column: ReferenceColumn;
  count: number;
}

export interface RedirectPlan {
  canonicalId: string;
  canonicalQid: string;
  duplicateId: string;
  duplicateName: string;
  references: ReferenceCount[];
  referencesTotal: number;
  softDeleteDuplicate: true;
}

/** Monta o plano de redirect/soft-delete (a contagem real é injetada pelo script). */
export function buildRedirectPlan(
  duplicate: CompetitionRow,
  canonicalId: string,
  canonicalQid: string,
  references: ReferenceCount[],
): RedirectPlan {
  return {
    canonicalId,
    canonicalQid,
    duplicateId: duplicate.id,
    duplicateName: duplicate.name,
    references,
    referencesTotal: references.reduce((a, r) => a + r.count, 0),
    softDeleteDuplicate: true,
  };
}
