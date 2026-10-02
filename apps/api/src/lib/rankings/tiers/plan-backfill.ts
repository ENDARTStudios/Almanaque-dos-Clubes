/**
 * T449c-v1 — Plano PURO de backfill de `Competition.level` (piloto EN). Sem DB/rede.
 *
 * Fail-fast (vira erro no plano, nunca escrita): QID duplicado/level inválido no mapeamento,
 * competição ausente ou ambígua. NUNCA atualiza competição fora do mapeamento.
 */
import type { EnDivisionTier } from './en-pyramid.js';

export interface ExistingCompetition {
  id: string;
  qid: string | null;
  level: number | null;
}

export interface BackfillPlanItem {
  competitionQid: string;
  competitionId: string;
  level: number;
  action: 'update' | 'noop';
}

export interface EnLevelBackfillPlan {
  totalMapped: number;
  wouldUpdate: number;
  noop: number;
  missingCompetitions: string[];
  ambiguousCompetitions: string[];
  errors: string[];
  items: BackfillPlanItem[];
}

export function validateEnPyramidMapping(mapping: readonly EnDivisionTier[]): string[] {
  const errors: string[] = [];
  const qids = new Set<string>();
  const levels = new Set<number>();
  for (const t of mapping) {
    if (!t.competitionQid || !/^Q\d+$/.test(t.competitionQid))
      errors.push(`qid_invalido:${t.competitionQid}`);
    else if (qids.has(t.competitionQid)) errors.push(`qid_duplicado:${t.competitionQid}`);
    else qids.add(t.competitionQid);
    if (!Number.isInteger(t.level) || t.level < 1 || t.level > 5)
      errors.push(`level_fora_de_1_5:${t.competitionQid}:${t.level}`);
    else if (levels.has(t.level)) errors.push(`level_duplicado:${t.level}`);
    else levels.add(t.level);
    if (!t.divisionLabel?.trim()) errors.push(`label_vazio:${t.competitionQid}`);
    if (!t.source) errors.push(`source_ausente:${t.competitionQid}`);
  }
  return errors;
}

export function planEnLevelBackfill(
  mapping: readonly EnDivisionTier[],
  existing: readonly ExistingCompetition[],
): EnLevelBackfillPlan {
  const errors = validateEnPyramidMapping(mapping);
  const missing: string[] = [];
  const ambiguous: string[] = [];
  const items: BackfillPlanItem[] = [];

  for (const t of mapping) {
    const rows = existing.filter((r) => r.qid === t.competitionQid);
    if (rows.length === 0) {
      missing.push(t.competitionQid);
      errors.push(`missing_competition:${t.competitionQid}`);
      continue;
    }
    if (rows.length > 1) {
      ambiguous.push(t.competitionQid);
      errors.push(`ambiguous_competition:${t.competitionQid}`);
      continue;
    }
    const row = rows[0];
    const action: BackfillPlanItem['action'] = row.level === t.level ? 'noop' : 'update';
    items.push({ competitionQid: t.competitionQid, competitionId: row.id, level: t.level, action });
  }

  return {
    totalMapped: mapping.length,
    wouldUpdate: items.filter((i) => i.action === 'update').length,
    noop: items.filter((i) => i.action === 'noop').length,
    missingCompetitions: missing,
    ambiguousCompetitions: ambiguous,
    errors,
    items,
  };
}
