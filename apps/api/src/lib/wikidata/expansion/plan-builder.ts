/**
 * WS-D M1b-conservadora — Constrói o plano (PURO): filtros + dedupe por QID + coords.
 * Só produz `create`/`skip` — NUNCA update/merge/rename/reativar.
 */
import { filterClub, filterCompetition, displayName, validFoundedYear } from './filters.js';
import { normalizeCompetitionName } from '../../identity/competition-dedupe.js';
import type { RawCandidate, ClubPlanRow, CompetitionPlanRow, PlanSkips } from './types.js';
import type { CandidateAttrs } from './extract-attributes.js';

export interface ExistingIndex {
  /** qid → name (clubes ativos) */
  activeClubByQid: Map<string, string>;
  /** qids soft-deleted (clubes) */
  softDeletedClubQids: Set<string>;
  /** normal(name)|country → qid (clubes ativos) */
  activeClubNameCountry: Map<string, string>;
  /** qid → name (competições ativas) */
  activeCompetitionByQid: Map<string, string>;
  softDeletedCompetitionQids: Set<string>;
  /** normal(name)|country → qid (competições ativas) */
  activeCompetitionNameCountry: Map<string, string>;
}

export interface ClubPlanBuild {
  rows: ClubPlanRow[];
  wouldCreate: number;
  skips: PlanSkips;
  coordinateCoverage: { with_coords: number; without_coords: number; percent: number };
}

const key = (name: string, country: string) => `${normalizeCompetitionName(name)}|${country}`;
function bump(skips: PlanSkips, r: string) {
  skips[r] = (skips[r] ?? 0) + 1;
}

/** Plano de clubes (create-only). */
export function buildClubPlan(
  candidates: RawCandidate[],
  attrs: Map<string, CandidateAttrs>,
  existing: ExistingIndex,
): ClubPlanBuild {
  const rows: ClubPlanRow[] = [];
  const skips: PlanSkips = {};
  let withCoords = 0;
  let withoutCoords = 0;

  for (const c of candidates) {
    const f = filterClub(c);
    if (!f.include) {
      bump(skips, f.reason!);
      rows.push({ qid: c.qid, action: 'skip', skipReason: f.reason });
      continue;
    }
    if (existing.activeClubByQid.has(c.qid)) {
      bump(skips, 'existing_qid');
      rows.push({ qid: c.qid, action: 'skip', skipReason: 'existing_qid' });
      continue;
    }
    if (existing.softDeletedClubQids.has(c.qid)) {
      bump(skips, 'soft_deleted_qid_reserved');
      rows.push({ qid: c.qid, action: 'skip', skipReason: 'soft_deleted_qid_reserved' });
      continue;
    }
    const name = displayName(c);
    const iso2 = f.iso2!;
    const homonymQid = existing.activeClubNameCountry.get(key(name, iso2));
    if (homonymQid && homonymQid !== c.qid) {
      bump(skips, 'possible_homonym');
      rows.push({ qid: c.qid, action: 'skip', skipReason: 'possible_homonym' });
      continue;
    }
    const a = attrs.get(c.qid) ?? { latitude: null, longitude: null, city: null };
    if (a.latitude != null) withCoords += 1;
    else withoutCoords += 1;
    rows.push({
      qid: c.qid,
      action: 'create',
      name,
      fullName: name,
      country: iso2,
      city: a.city,
      state: null,
      latitude: a.latitude,
      longitude: a.longitude,
      foundedYear: validFoundedYear(c.inceptionYear ?? null),
    });
  }

  const wouldCreate = rows.filter((r) => r.action === 'create').length;
  const total = withCoords + withoutCoords;
  return {
    rows,
    wouldCreate,
    skips,
    coordinateCoverage: {
      with_coords: withCoords,
      without_coords: withoutCoords,
      percent: total ? Math.round((withCoords / total) * 100) : 0,
    },
  };
}

export interface CompetitionPlanBuild {
  rows: CompetitionPlanRow[];
  wouldCreate: number;
  skips: PlanSkips;
}

/** Plano de competições (create-only). */
export function buildCompetitionPlan(
  candidates: RawCandidate[],
  existing: ExistingIndex,
): CompetitionPlanBuild {
  const rows: CompetitionPlanRow[] = [];
  const skips: PlanSkips = {};
  for (const c of candidates) {
    const f = filterCompetition(c);
    if (!f.include) {
      bump(skips, f.reason!);
      rows.push({ qid: c.qid, action: 'skip', skipReason: f.reason });
      continue;
    }
    if (existing.activeCompetitionByQid.has(c.qid)) {
      bump(skips, 'existing_qid');
      rows.push({ qid: c.qid, action: 'skip', skipReason: 'existing_qid' });
      continue;
    }
    if (existing.softDeletedCompetitionQids.has(c.qid)) {
      bump(skips, 'soft_deleted_qid_reserved');
      rows.push({ qid: c.qid, action: 'skip', skipReason: 'soft_deleted_qid_reserved' });
      continue;
    }
    const name = displayName(c);
    const iso2 = f.iso2!;
    const conflict = existing.activeCompetitionNameCountry.get(key(name, iso2));
    if (conflict && conflict !== c.qid) {
      bump(skips, 'possible_competition_name_conflict');
      rows.push({ qid: c.qid, action: 'skip', skipReason: 'possible_competition_name_conflict' });
      continue;
    }
    rows.push({ qid: c.qid, action: 'create', name, country: iso2 });
  }
  return { rows, wouldCreate: rows.filter((r) => r.action === 'create').length, skips };
}
