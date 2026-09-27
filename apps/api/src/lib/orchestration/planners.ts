/**
 * WS-G-1 — Planners PUROS (determinísticos, sem I/O/rede). Produzem o plano de um job dry-run.
 * Regras: identidade = QID (nunca nome/fuzzy); nunca sobrescreve dado existente; ambíguo = omitido;
 * soft-deleted = intocável; proveniência obrigatória por item.
 */
import type { PlanResult, SkipReason } from './types.js';

// ── 1. wikidata-identity-scan ────────────────────────────────────────────────
export interface IdentityCandidate {
  qid: string | null;
  label: string | null;
  country: string | null;
}
export interface ExistingRef {
  qid: string;
  deletedAt: string | null;
}

export function planWikidataIdentityScan(input: {
  candidates: IdentityCandidate[];
  existing: ExistingRef[];
}): PlanResult<IdentityCandidate> {
  const existingByQid = new Map(input.existing.map((e) => [e.qid, e]));
  const planned: PlanResult<IdentityCandidate>['planned'] = [];
  const skipped: PlanResult<IdentityCandidate>['skipped'] = [];
  const seen = new Set<string>();

  for (const c of input.candidates) {
    if (!c.qid) {
      skipped.push({ key: c.label ?? '∅', reason: 'missing_qid' });
      continue;
    }
    if (seen.has(c.qid)) {
      skipped.push({ key: c.qid, reason: 'duplicate' });
      continue;
    }
    seen.add(c.qid);
    const ex = existingByQid.get(c.qid);
    if (ex) {
      skipped.push({ key: c.qid, reason: ex.deletedAt ? 'soft_deleted_qid' : 'existing_qid' });
      continue;
    }
    planned.push({ action: 'create', entity: c, source: 'wikidata' });
  }
  return { planned, skipped };
}

// ── 2. wikidata-enrichment-plan ──────────────────────────────────────────────
export type EnrichField = 'fullName' | 'city' | 'coordinates';
export interface EnrichClub {
  qid: string;
  fullName: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}
export interface FetchedAttrs {
  qid: string;
  fullName?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

function missingFields(club: EnrichClub, fields: EnrichField[]): EnrichField[] {
  const out: EnrichField[] = [];
  if (fields.includes('fullName') && !club.fullName) out.push('fullName');
  if (fields.includes('city') && !club.city) out.push('city');
  if (fields.includes('coordinates') && (club.latitude == null || club.longitude == null))
    out.push('coordinates');
  return out;
}

export function planWikidataEnrichment(input: {
  clubs: EnrichClub[];
  fetched: FetchedAttrs[];
  fields: EnrichField[];
}): PlanResult<{ qid: string; fields: EnrichField[] }> {
  const fetchedByQid = new Map(input.fetched.map((f) => [f.qid, f]));
  const planned: PlanResult<{ qid: string; fields: EnrichField[] }>['planned'] = [];
  const skipped: PlanResult<{ qid: string; fields: EnrichField[] }>['skipped'] = [];

  for (const club of input.clubs) {
    const missing = missingFields(club, input.fields);
    if (missing.length === 0) {
      skipped.push({ key: club.qid, reason: 'no_missing_fields' });
      continue;
    }
    const f = fetchedByQid.get(club.qid);
    if (!f) {
      skipped.push({ key: club.qid, reason: 'no_fetched_data' });
      continue;
    }
    // Só preenche o que a fonte realmente tem (nunca sobrescreve, nunca inventa).
    const fillable = missing.filter((field) => {
      if (field === 'fullName') return !!f.fullName;
      if (field === 'city') return !!f.city;
      return f.latitude != null && f.longitude != null;
    });
    if (fillable.length === 0) {
      skipped.push({ key: club.qid, reason: 'no_fetched_data' });
      continue;
    }
    planned.push({
      action: 'update',
      entity: { qid: club.qid, fields: fillable },
      source: 'wikidata',
    });
  }
  return { planned, skipped };
}

// ── 3. rsssf-state-champions-plan ────────────────────────────────────────────
export interface RsssfRow {
  uf: string;
  year: number;
  clubQid: string | null;
  clubLabel: string | null;
  authorCredit: string | null;
  sourceUrl: string | null;
}
export interface WonEdgePlan {
  uf: string;
  year: number;
  clubQid: string;
  authorCredit: string | null;
  sourceUrl: string | null;
}

export function planRsssfStateChampions(input: { rows: RsssfRow[] }): PlanResult<WonEdgePlan> {
  const groups = new Map<string, Set<string>>();
  for (const r of input.rows) {
    if (!r.clubQid) continue;
    const key = `${r.uf}|${r.year}`;
    const set = groups.get(key) ?? new Set<string>();
    set.add(r.clubQid);
    groups.set(key, set);
  }

  const planned: PlanResult<WonEdgePlan>['planned'] = [];
  const skipped: PlanResult<WonEdgePlan>['skipped'] = [];
  const emitted = new Set<string>();

  for (const r of input.rows) {
    const key = `${r.uf}|${r.year}`;
    if (!r.clubQid) {
      skipped.push({ key, reason: 'missing_qid', detail: r.clubLabel ?? undefined });
      continue;
    }
    const distinct = groups.get(key) ?? new Set();
    if (distinct.size > 1) {
      skipped.push({ key, reason: 'ambiguous', detail: `${distinct.size} clubes distintos` });
      continue;
    }
    if (emitted.has(`${key}|${r.clubQid}`)) {
      skipped.push({ key, reason: 'duplicate' });
      continue;
    }
    emitted.add(`${key}|${r.clubQid}`);
    planned.push({
      action: 'create',
      entity: {
        uf: r.uf,
        year: r.year,
        clubQid: r.clubQid,
        authorCredit: r.authorCredit,
        sourceUrl: r.sourceUrl,
      },
      source: 'rsssf',
    });
  }
  return { planned, skipped };
}

// ── 4. ranking-refresh-dry-run ───────────────────────────────────────────────
export interface RankingEntryInput {
  clubId: string;
  position: number | null;
  points: number | null;
}

export function planRankingRefreshDiff(input: {
  current: RankingEntryInput[];
  proposed: RankingEntryInput[];
}): {
  plan: PlanResult<{ clubId: string; from: RankingEntryInput; to: RankingEntryInput }>;
  hasChanges: boolean;
} {
  const curBy = new Map(input.current.map((e) => [e.clubId, e]));
  const propBy = new Map(input.proposed.map((e) => [e.clubId, e]));
  const planned: PlanResult<{
    clubId: string;
    from: RankingEntryInput;
    to: RankingEntryInput;
  }>['planned'] = [];
  const skipped: PlanResult<{
    clubId: string;
    from: RankingEntryInput;
    to: RankingEntryInput;
  }>['skipped'] = [];

  for (const to of input.proposed) {
    const from = curBy.get(to.clubId);
    if (!from) {
      planned.push({
        action: 'update',
        entity: {
          clubId: to.clubId,
          from: { clubId: to.clubId, position: null, points: null },
          to,
        },
        source: 'wikidata',
      });
      continue;
    }
    if (from.position === to.position && from.points === to.points) {
      skipped.push({ key: to.clubId, reason: 'unchanged' });
      continue;
    }
    planned.push({ action: 'update', entity: { clubId: to.clubId, from, to }, source: 'wikidata' });
  }
  // Remoção: clubes que existiam e sumiram da proposta.
  for (const from of input.current) {
    if (!propBy.has(from.clubId)) {
      planned.push({
        action: 'update',
        entity: {
          clubId: from.clubId,
          from,
          to: { clubId: from.clubId, position: null, points: null },
        },
        source: 'wikidata',
      });
    }
  }
  return { plan: { planned, skipped }, hasChanges: planned.length > 0 };
}

// ── 5. geo-attribution-audit ─────────────────────────────────────────────────
export interface GeoAuditClub {
  id: string;
  qid: string | null;
  metadata: unknown;
}
export interface GeoAuditFinding {
  id: string;
  qid: string | null;
  coordSource: string | null;
  issue: 'missing_attribution' | 'inconsistent_attribution';
}

const OSM_SOURCES = new Set(['nominatim', 'osm', 'openstreetmap']);

export function auditGeoAttribution(input: { clubs: GeoAuditClub[] }): PlanResult<GeoAuditFinding> {
  const planned: PlanResult<GeoAuditFinding>['planned'] = [];
  const skipped: PlanResult<GeoAuditFinding>['skipped'] = [];

  for (const c of input.clubs) {
    const meta = (c.metadata as Record<string, unknown> | null) ?? {};
    const coordSource =
      typeof meta.coordSource === 'string' ? meta.coordSource.toLowerCase() : null;
    const isOsm = coordSource != null && OSM_SOURCES.has(coordSource);
    if (!isOsm) {
      skipped.push({ key: c.id, reason: 'unchanged', detail: 'not_osm_source' });
      continue;
    }
    const credit = typeof meta.coordAttribution === 'string' ? meta.coordAttribution.trim() : '';
    if (!credit) {
      planned.push({
        action: 'audit',
        entity: { id: c.id, qid: c.qid, coordSource, issue: 'missing_attribution' },
        source: 'openstreetmap',
      });
      continue;
    }
    if (!/openstreetmap|odbl/i.test(credit)) {
      planned.push({
        action: 'audit',
        entity: { id: c.id, qid: c.qid, coordSource, issue: 'inconsistent_attribution' },
        source: 'openstreetmap',
      });
      continue;
    }
    skipped.push({ key: c.id, reason: 'unchanged', detail: 'attribution_ok' });
  }
  return { planned, skipped };
}

/** Helper interno para mensagens — não usado em produção, mantém SkipReason referenciado. */
export const _skipReasonTypeCheck: SkipReason | null = null;
