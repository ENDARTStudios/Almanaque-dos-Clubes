import HeroSection, {
  HomeFeatures,
  HomeClosing,
  type HeroChampion,
  type HeroTotals,
} from '@/components/HeroSection';
import HomeExplore from '@/components/HomeExplore';
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
async function getHeroChampions(): Promise<HeroChampion[]> {
  try {
    const res = await fetch(`${getApiBase()}/champions/carousel`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data: { scopes?: CarouselScope[] } = await res.json();
    const scopes = Array.isArray(data.scopes) ? data.scopes : [];

    /* T568 — o MUNDIAL primeiro, e depois os CONTINENTAIS.
     *
     * O pedido do Operador foi "destacar os campeões mundiais vigentes e os campeões
     * continentais". A ordem importa porque é a hierarquia: abrir com o continental e chegar no
     * mundial depois inverteria a leitura de patamar.
     *
     * Só entra quem tem FONTE (`sourceUrl`): a hero nunca exibe prova sem origem, e essa regra
     * valia para o campeão único — continua valendo para cada slide. O limite de 1 mundial + 3
     * continentais é para o carrossel não virar uma lista longa dentro da dobra; a lista completa
     * segue no `ChampionsCarousel`, mais abaixo na página. */
    const paraSlide = (s: CarouselScope): HeroChampion => ({
      name: s.champion?.name ?? '',
      clubId: s.champion?.id ?? null,
      competitionName: s.competition?.name ?? null,
      competitionId: s.competition?.id ?? null,
      season: s.season ?? null,
      hierarchy: s.hierarchy,
      sourceUrl: s.source?.sourceUrl ?? null,
    });

    const comFonte = scopes.filter((s) => s.source?.sourceUrl && s.champion?.name);
    const mundial = comFonte.filter((s) => s.hierarchy === 'mundial').slice(0, 1);
    const continental = comFonte.filter((s) => s.hierarchy === 'continental').slice(0, 3);
    return [...mundial, ...continental].map(paraSlide);
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [totals, champions] = await Promise.all([getTotals(), getHeroChampions()]);
  return (
    <>
      <HeroSection initialTotals={totals} champions={champions} />
      {/* Conceito visual — a camada de exploração: o acervo é a interface. Vem logo depois
          da dobra porque responde à pergunta que a dobra levanta ("12.003 clubes… e daí?").
          Recebe o MESMO `totals` do servidor: nenhuma prancha carrega dado próprio. */}
      <HomeExplore totals={totals} />
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
