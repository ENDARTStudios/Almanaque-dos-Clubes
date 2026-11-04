import type { GeoFilters } from './types';

/**
 * Regras PURAS da tela /map no conceito FICHA. Sem React, sem rede — o teste unitário roda
 * direto, e a UI não guarda cópia de número.
 */

/** Código ISO 3166-2 → UF legível ("BR-SP" → "SP"); sem hífen, devolve o próprio código. */
export function ufFromCode(code: string | null | undefined): string {
  if (typeof code !== 'string') return '—';
  const trimmed = code.trim();
  if (trimmed === '') return '—';
  const tail = trimmed.split('-').pop() ?? trimmed;
  return (tail.trim() || trimmed).toUpperCase();
}

/**
 * Largura da barra de intensidade: proporcional à contagem, com um piso de 3% para que a
 * existência de uma barra não desapareça — o NÚMERO ao lado é o dado; a barra é comparação.
 * O máximo é o maior valor da LISTA (não do acervo): a barra compara dentro do recorte exibido.
 */
export function barWidth(count: number, max: number): number {
  if (!Number.isFinite(count) || !Number.isFinite(max) || count <= 0 || max <= 0) return 0;
  return Math.min(100, Math.max(3, Math.round((count / max) * 100)));
}

/**
 * Filtra as features do /geo/points pelo recorte de estado/cidade.
 *
 * Casa por stateCode (código ISO 3166-2 vindo da FK do State) e por city (texto exato da coluna
 * que o índice de cidades conta). Quando o recorte está vazio, devolve a lista original — um
 * mapa sem clube seria a leitura errada de "filtro não aplicado".
 */
export function filterGeoFeatures<T extends { stateCode?: string | null; city?: string | null }>(
  features: T[],
  filters: GeoFilters,
): T[] {
  const stateCode = filters.stateCode?.toUpperCase() ?? null;
  const city = filters.city?.trim() ?? null;
  if (!stateCode && !city) return features;
  return features.filter((feature) => {
    if (stateCode) {
      const own = typeof feature.stateCode === 'string' ? feature.stateCode.toUpperCase() : null;
      if (own !== stateCode) return false;
    }
    if (city && feature.city !== city) return false;
    return true;
  });
}

/** Países do seletor: o selecionado SEMPRE aparece, mesmo sem acervo no índice (lacuna). */
export function withSelectedCountry(
  options: Array<{ code: string; clubs: number | null }>,
  selected: string,
): Array<{ code: string; clubs: number | null }> {
  const iso = selected.toUpperCase();
  if (options.some((o) => o.code === iso)) return options;
  return [{ code: iso, clubs: null }, ...options];
}
