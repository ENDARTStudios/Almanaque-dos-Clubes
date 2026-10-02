/**
 * WS-C-2 — seleção determinística do subconjunto do carrossel.
 * PURO (sem React/Next) para teste; consumido por `components/ChampionsCarousel`.
 * Não renderiza os ~418 scopes de uma vez: prioriza mundial → continental → nacional →
 * estadual → municipal, temporada desc, nome asc, id asc (total).
 */
export interface CarouselScope {
  hierarchy: string;
  season: number;
  gender: 'men' | 'women';
  competition: { id: string; qid: string | null; name: string | null };
  champion: { id: string; qid: string | null; name: string };
  source: {
    type: string;
    sourceUrl: string | null;
    authorCredit: string | null;
    license: string | null;
    retrievedAt: string | null;
  };
  confidence: string;
}

export const HIERARCHY_PRIORITY = ['mundial', 'continental', 'nacional', 'estadual', 'municipal'];
export const MAX_CARDS = 16;

export function selectCarouselSubset(scopes: CarouselScope[], max = MAX_CARDS): CarouselScope[] {
  return [...scopes]
    .sort(
      (a, b) =>
        HIERARCHY_PRIORITY.indexOf(a.hierarchy) - HIERARCHY_PRIORITY.indexOf(b.hierarchy) ||
        b.season - a.season ||
        (a.champion.name ?? '').localeCompare(b.champion.name ?? '') ||
        a.champion.id.localeCompare(b.champion.id),
    )
    .slice(0, max);
}
