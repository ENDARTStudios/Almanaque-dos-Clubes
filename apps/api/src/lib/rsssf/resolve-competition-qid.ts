/**
 * T448b-2b FASE 1 — Resolução da competição-mãe por QID/alias AUDITÁVEL. PURO.
 * NUNCA hardcodar QID não verificado; a FASE 1 NÃO semeia mãe — ausência é gap
 * declarado (missing_competition), como no T448.
 */
import type { CompetitionIndexEntry, ReasonCode } from './types.js';
import { normalizeTeamName } from './map-team-to-club.js';

export interface CompetitionResolution {
  competition: CompetitionIndexEntry | null;
  matches: CompetitionIndexEntry[];
  reasonCode: ReasonCode | null;
  details: Record<string, unknown>;
}

export function resolveCompetitionQid(
  meta: { expectedCompetitionName: string; expectedSeason?: number },
  index: CompetitionIndexEntry[],
  opts: { qid?: string } = {},
): CompetitionResolution {
  let matches: CompetitionIndexEntry[];
  if (opts.qid) {
    matches = index.filter((c) => c.qid === opts.qid);
  } else {
    const key = normalizeTeamName(meta.expectedCompetitionName);
    matches = index.filter((c) => {
      const names = [c.name, ...(c.aliases ?? [])].map(normalizeTeamName);
      return names.includes(key);
    });
  }

  if (matches.length === 0) {
    return {
      competition: null,
      matches,
      reasonCode: 'missing_competition',
      details: { expectedCompetitionName: meta.expectedCompetitionName, qid: opts.qid ?? null },
    };
  }
  if (matches.length > 1) {
    return {
      competition: null,
      matches,
      reasonCode: 'ambiguous_competition',
      details: { candidates: matches.map((c) => c.qid) },
    };
  }
  return { competition: matches[0], matches, reasonCode: null, details: {} };
}
