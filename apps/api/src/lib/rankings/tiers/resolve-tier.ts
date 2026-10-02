/**
 * T449c-v1 — Resolução de tier/divisão de uma competição. PURO (sem DB/rede).
 *
 * Regras:
 *  - `competition.level` (persistido) é o dado CANÔNICO.
 *  - `divisionLabel`/`tierSource`/`tierVersion` só aparecem quando o nível está persistido
 *    E o QID consta no mapeamento versionado — assim o rollback (`level = NULL`) zera o display.
 *  - Nunca inferir por nome fuzzy/substring; nunca inventar nível.
 */
import {
  EN_PYRAMID_TIER_VERSION,
  EN_PYRAMID_TIERS_BY_QID,
  type EnDivisionTier,
} from './en-pyramid.js';

export interface CompetitionTierView {
  level: number | null;
  divisionLabel: string | null;
  tierSource: string | null;
  tierVersion: string | null;
}

const EMPTY: CompetitionTierView = {
  level: null,
  divisionLabel: null,
  tierSource: null,
  tierVersion: null,
};

/** Tier de uma divisão do piloto EN pelo QID da competição (ou null). */
export function getEnDivisionTierByCompetitionQid(qid?: string | null): EnDivisionTier | null {
  if (!qid) return null;
  return EN_PYRAMID_TIERS_BY_QID[qid] ?? null;
}

/** Resolve a visão de tier de uma competição (pura, aditiva, honesta). */
export function resolveCompetitionTier(
  competition: { qid?: string | null; level?: number | null } | null,
): CompetitionTierView {
  if (!competition) return { ...EMPTY };
  const level = competition.level ?? null;
  const mapped = getEnDivisionTierByCompetitionQid(competition.qid);
  if (level === null || !mapped) {
    return { level, divisionLabel: null, tierSource: null, tierVersion: null };
  }
  return {
    level,
    divisionLabel: mapped.divisionLabel,
    tierSource: mapped.source,
    tierVersion: EN_PYRAMID_TIER_VERSION,
  };
}
