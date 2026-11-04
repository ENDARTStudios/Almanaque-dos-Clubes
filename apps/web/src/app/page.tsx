import HomeFicha, { type HomeTotals } from '@/components/HomeFicha';
import { getApiBase } from '@/lib/api-base';

/**
 * A home agora é a abertura do conceito FICHA.
 *
 * O diagnóstico que motivou a troca está no componente `HomeFicha`: a home era a única
 * superfície grande fora do sistema. Os totais continuam vindo do servidor (número real no
 * HTML, como em /map) e continuam sendo **lacuna declarada** quando a API não responde —
 * nenhum contador é estimado.
 */

/** GET /<recurso>?limit=1 e lê o `total` da paginação. Falha vira `null`, nunca 0. */
async function totalDe(recurso: string): Promise<number | null> {
  try {
    const res = await fetch(`${getApiBase()}/${recurso}?limit=1`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data: { total?: unknown } = await res.json();
    return typeof data.total === 'number' ? data.total : null;
  } catch {
    return null;
  }
}

/** Países com clube no acervo — o número da porta "Mapa-múndi" (falha vira null). */
async function totalDePaises(): Promise<number | null> {
  try {
    const res = await fetch(`${getApiBase()}/clubs/countries`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data: { data?: { totals?: { countries?: unknown } } } = await res.json();
    const n = data.data?.totals?.countries;
    return typeof n === 'number' ? n : null;
  } catch {
    return null;
  }
}

async function getTotals(): Promise<HomeTotals> {
  const [clubs, players, competitions, matches, rankings, countries] = await Promise.all([
    totalDe('clubs'),
    totalDe('players'),
    totalDe('competitions'),
    totalDe('matches'),
    totalDe('rankings'),
    totalDePaises(),
  ]);
  return { clubs, players, competitions, matches, rankings, countries };
}

export default async function HomePage() {
  const totals = await getTotals();
  return <HomeFicha totals={totals} />;
}
