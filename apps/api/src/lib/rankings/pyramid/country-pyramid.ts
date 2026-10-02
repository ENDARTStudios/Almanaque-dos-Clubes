/**
 * T449c-v2 — Agregado cross-division `country_pyramid`. PURO (sem DB/rede).
 *
 * Fórmula APROVADA: aplica o FATOR DE DIVISÃO LINEAR à NOTA 0-100 intra-divisão JÁ existente:
 *   adjusted = round(divisionScore × weight(level))
 *   pesos: L1 1.00 · L2 0.85 · L3 0.70 · L4 0.55 · L5 0.40
 * NÃO re-parseia RSSSF, NÃO recalcula os rankings por divisão, NÃO persiste pontos brutos.
 * A ordem intra-divisão é sempre preservada (peso uniforme por nível). Gênero isolado.
 */
import { EN_PYRAMID_TIER_VERSION } from '../tiers/en-pyramid.js';

export const COUNTRY_PYRAMID_SCOPE = 'country_pyramid';
export const COUNTRY_PYRAMID_FORMULA_VERSION = 't449c-v2-country-pyramid-v1';
export { EN_PYRAMID_TIER_VERSION };

/** Pesos lineares por degrau (aprovados). */
export const COUNTRY_PYRAMID_WEIGHTS: Readonly<Record<number, number>> = {
  1: 1.0,
  2: 0.85,
  3: 0.7,
  4: 0.55,
  5: 0.4,
};

export function divisionWeight(level: number): number | null {
  return COUNTRY_PYRAMID_WEIGHTS[level] ?? null;
}

export interface SourceEntry {
  clubId: string;
  position: number | null;
  points: number | null; // nota 0-100 intra-divisão
  baseMatches: number | null;
  baseTitles: number | null;
  dataSourceIds: unknown;
  gender: string | null;
}

export interface SourceRanking {
  level: number;
  divisionLabel: string;
  gender: 'men' | 'women';
  entries: SourceEntry[];
}

export interface PyramidRow {
  clubId: string;
  position: number; // 1..N dentro do gênero
  adjustedPoints: number; // 0-100
  level: number;
  divisionLabel: string;
  baseMatches: number | null;
  baseTitles: number | null;
  dataSourceIds: unknown;
  gender: 'men' | 'women';
  reason: null;
}

export interface PyramidResult {
  rows: PyramidRow[];
  rankedCount: number;
  excludedCount: number;
  byLevel: Array<{ level: number; divisionLabel: string; count: number; maxAdjusted: number }>;
}

export class CountryPyramidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CountryPyramidError';
  }
}

/**
 * Constrói as linhas do agregado a partir dos rankings por divisão.
 * Fail-fast: level fora da pirâmide, level duplicado, clube em >1 divisão.
 */
export function buildCountryPyramid(sources: readonly SourceRanking[]): PyramidResult {
  const levels: Record<'men' | 'women', Set<number>> = { men: new Set(), women: new Set() };
  const clubLevel = new Map<string, number>();
  let excludedCount = 0;

  for (const s of sources) {
    if (divisionWeight(s.level) === null)
      throw new CountryPyramidError(`level fora da pirâmide: ${s.level}`);
    // níveis únicos POR GÊNERO (pirâmides masculina e feminina são independentes)
    if (levels[s.gender].has(s.level))
      throw new CountryPyramidError(`level duplicado (${s.gender}): ${s.level}`);
    levels[s.gender].add(s.level);
    for (const e of s.entries) {
      const prev = clubLevel.get(e.clubId);
      if (prev !== undefined && prev !== s.level)
        throw new CountryPyramidError(`clube em >1 divisão: ${e.clubId} (L${prev}/L${s.level})`);
      clubLevel.set(e.clubId, s.level);
      if (e.position === null || e.points === null) excludedCount += 1;
    }
  }

  const rows: PyramidRow[] = [];
  for (const gender of ['men', 'women'] as const) {
    const genderRows: PyramidRow[] = [];
    for (const s of sources) {
      if (s.gender !== gender) continue;
      const w = divisionWeight(s.level)!;
      for (const e of s.entries) {
        if (e.position === null || e.points === null) continue;
        genderRows.push({
          clubId: e.clubId,
          position: 0,
          adjustedPoints: Math.round(e.points * w),
          level: s.level,
          divisionLabel: s.divisionLabel,
          baseMatches: e.baseMatches,
          baseTitles: e.baseTitles,
          dataSourceIds: e.dataSourceIds,
          gender,
          reason: null,
        });
      }
    }
    genderRows.sort(
      (a, b) =>
        b.adjustedPoints - a.adjustedPoints ||
        a.level - b.level ||
        a.clubId.localeCompare(b.clubId),
    );
    genderRows.forEach((r, i) => (r.position = i + 1));
    rows.push(...genderRows);
  }

  const byLevel = sources.map((s) => {
    const w = divisionWeight(s.level)!;
    const ranked = s.entries.filter((e) => e.position !== null && e.points !== null);
    return {
      level: s.level,
      divisionLabel: s.divisionLabel,
      count: ranked.length,
      maxAdjusted: ranked.length
        ? Math.max(...ranked.map((e) => Math.round((e.points as number) * w)))
        : 0,
    };
  });

  return { rows, rankedCount: rows.length, excludedCount, byLevel };
}
