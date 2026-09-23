/**
 * T448b-2b FASE 1 — Pendências (fila de revisão). PURO.
 * Toda pendência é estruturada: reasonCode + severity + contexto.
 */
import type { PendingReviewItem, ReasonCode, Severity } from './types.js';
import { BLOCKER_CODES } from './types.js';

export function severityFor(code: ReasonCode): Severity {
  return BLOCKER_CODES.includes(code) ? 'blocker' : 'review';
}

export function makePending(args: {
  reasonCode: ReasonCode;
  season: number;
  competitionName: string;
  teamName: string | null;
  sourceUrl: string;
  details?: Record<string, unknown>;
}): PendingReviewItem {
  return {
    reasonCode: args.reasonCode,
    severity: severityFor(args.reasonCode),
    season: args.season,
    competitionName: args.competitionName,
    teamName: args.teamName,
    sourceUrl: args.sourceUrl,
    details: args.details ?? {},
  };
}

export function countsByReason(items: PendingReviewItem[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const it of items) out[it.reasonCode] = (out[it.reasonCode] ?? 0) + 1;
  return out;
}
