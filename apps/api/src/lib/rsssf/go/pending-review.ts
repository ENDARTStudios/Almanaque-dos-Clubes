/** T448b-2d GO — pendências estruturadas do parser GO. */
import type { GoPendingReview, GoReasonCode, GoSeverity } from './types.js';

const BLOCKERS: readonly GoReasonCode[] = [
  'missing_attribution',
  'multiple_champions',
  'conflicting_champion',
  'champion_unconfirmed',
  'ambiguous_club',
  'ambiguous_competition',
  'missing_club',
  'missing_competition',
  'gender_unknown',
  'hierarchy_unknown',
  'malformed_table',
  'excluded_season_in_candidates',
];

export function goSeverityFor(code: GoReasonCode): GoSeverity {
  return BLOCKERS.includes(code) ? 'blocker' : 'review';
}

export function makeGoPending(args: {
  reasonCode: GoReasonCode;
  season: number;
  competitionName: string;
  teamName: string | null;
  sourceUrl: string;
  details?: Record<string, unknown>;
}): GoPendingReview {
  return {
    reasonCode: args.reasonCode,
    severity: goSeverityFor(args.reasonCode),
    season: args.season,
    competitionName: args.competitionName,
    teamName: args.teamName,
    sourceUrl: args.sourceUrl,
    details: args.details ?? {},
  };
}

export function goCountsByReason(items: GoPendingReview[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const it of items) out[it.reasonCode] = (out[it.reasonCode] ?? 0) + 1;
  return out;
}
