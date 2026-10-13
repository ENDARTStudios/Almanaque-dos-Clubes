import HeroSection, {
  HomeFeatures,
  HomeClosing,
  type HeroChampion,
  type HeroTotals,
} from '@/components/HeroSection';
import ChampionsCarousel from '@/components/ChampionsCarousel';
import { getApiBase } from '@/lib/api-base';
import type { CarouselScope } from '@/lib/carousel';

// T435-D — totals buscados no servidor (número real no HTML, como no /map).
// revalidate 1h; falha -> nulls -> lacuna declarada (nunca inventar).
async function getTotals(): Promise<HeroTotals> {
  const out: HeroTotals = { clubs: null, competitions: null, rankings: null };
  try {
    const base = getApiBase();
    const [c, k, r] = await Promise.all([
      fetch(`${base}/clubs?limit=1`, { next: { revalidate: 3600 } }).then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch(`${base}/competitions?limit=1`, { next: { revalidate: 3600 } }).then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch(`${base}/rankings?limit=1`, { next: { revalidate: 3600 } }).then((r) =>
        r.ok ? r.json() : null,
      ),
    ]);
    if (typeof c?.total === 'number') out.clubs = c.total;
    if (typeof k?.total === 'number') out.competitions = k.total;
    if (typeof r?.total === 'number') out.rankings = r.total;
  } catch {
    // Fallback silencioso: a hero declara a lacuna em vez de estimar.
  }
  return out;
}

/**
 * WS-C-12 — a "Prova" da hero: um campeão real e auditável do acervo.
 *
 * Reaproveita `GET /champions/carousel` (mesma fonte do carrossel, com proveniência
 * obrigatória) e descarta o que não tem fonte — a hero nunca exibe prova sem origem.
 * O carrossel continua sendo o dono da lista completa; aqui só o primeiro item serve.
 */
async function getHeroChampion(): Promise<HeroChampion | null> {
  try {
    const res = await fetch(`${getApiBase()}/champions/carousel`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data: { scopes?: CarouselScope[] } = await res.json();
    const scopes = Array.isArray(data.scopes) ? data.scopes : [];
    const pick = scopes.find((s) => s.source?.sourceUrl) ?? scopes[0];
    if (!pick?.champion?.name) return null;
    return {
      name: pick.champion.name,
      clubId: pick.champion.id ?? null,
      competitionName: pick.competition?.name ?? null,
      competitionId: pick.competition?.id ?? null,
      season: pick.season ?? null,
      sourceType: pick.source?.type ?? null,
      sourceUrl: pick.source?.sourceUrl ?? null,
    };
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const [totals, champion] = await Promise.all([getTotals(), getHeroChampion()]);
  return (
    <>
      <HeroSection initialTotals={totals} champion={champion} />
      <HomeFeatures />
      {/* T441 — campeões vigentes por hierarquia (dados auditáveis do KnowledgeGraph).
          Na mesma camada escura da dobra: a home não pode alternar escuro → claro →
          escuro, que era o defeito apontado na crítica de design (WS-C-12). */}
      <div className="bg-background text-foreground">
        <ChampionsCarousel />
      </div>
      <HomeClosing />
    </>
  );
}
