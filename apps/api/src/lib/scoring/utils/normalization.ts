/**
 * T449b — Normalização. Funções PURAS.
 */

/**
 * MinMax → 0..100 (maior = 100, menor = 0), arredondado.
 * Todos iguais (ou <2 valores) ⇒ 50 para todos (fallback seguro, sem divisão por zero).
 */
export function minMaxNormalize(scores: number[]): number[] {
  if (scores.length === 0) return [];
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  if (max === min) return scores.map(() => 50);
  return scores.map((s) => Math.round(((s - min) / (max - min)) * 100));
}

/**
 * Percentil (midrank) de um valor dentro de uma distribuição → 0..100.
 * Robusto a outliers (não comprime a escala como o MinMax).
 */
export function percentileRank(score: number, distribution: number[]): number {
  if (distribution.length === 0) return 0;
  const less = distribution.filter((v) => v < score).length;
  const equal = distribution.filter((v) => v === score).length;
  return Math.round(((less + 0.5 * equal) / distribution.length) * 100);
}
