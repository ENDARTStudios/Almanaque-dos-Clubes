import HeroSection, { type HeroTotals } from '@/components/HeroSection';
import { getApiBase } from '@/lib/api-base';

// T435-D — totals buscados no servidor (número real no HTML, como no /map).
// revalidate 1h; falha -> nulls -> fallback "em crescimento" (nunca inventar).
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
    // Fallback silencioso: HeroSection mostra "em crescimento".
  }
  return out;
}

export default async function HomePage() {
  const totals = await getTotals();
  return <HeroSection initialTotals={totals} />;
}
