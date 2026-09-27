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
