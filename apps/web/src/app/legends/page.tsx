import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getApiBase } from '@/lib/api-base';
import { safeJsonLd } from '@/lib/json-ld';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';
import { metadataStrings } from '@/i18n/wsMetadata';
import LendasPageView from '@/components/conceito/lendas/LendasPageView';
import type { LegendsSummary } from '@/components/conceito/lendas/types';

/**
 * /legends — o panteão, no conceito FICHA.
 *
 * A página continua buscando `GET /api/v1/legends` no servidor (fonte única, sem client
 * fetch) e preserva a distinção que já existia: falha de rede NÃO é lista vazia — a view
 * recebe `data: null` e renderiza `ErrorState`; um resumo com todos os blocos vazios vira
 * `EmptyState`. Nenhum número é estimado.
 *
 * As métricas de jogadores/clubes/países vêm das mesmas contagens reais que a home usa
 * (`total` da paginação e `totals.countries`), porque o resumo de /legends publica apenas
 * títulos, competições e partidas. Cada contagem que falha vira `null` → "—" na tela.
 */

interface LegendsPayload {
  data: LegendsSummary;
  generatedAt: string;
}

async function getLegends(): Promise<LegendsPayload | null> {
  try {
    const res = await fetch(getApiBase() + '/legends', { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as LegendsPayload;
  } catch {
    return null;
  }
}

/** `GET /<recurso>?limit=1` e lê o `total` da paginação. Falha vira `null`, nunca 0. */
async function totalOf(resource: 'clubs' | 'players'): Promise<number | null> {
  try {
    const res = await fetch(`${getApiBase()}/${resource}?limit=1`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data: { total?: unknown } = await res.json();
    return typeof data.total === 'number' ? data.total : null;
  } catch {
    return null;
  }
}

/** Países com clube no acervo — o mesmo recorte que a home usa. Falha vira `null`. */
async function totalCountries(): Promise<number | null> {
  try {
    const res = await fetch(getApiBase() + '/clubs/countries', { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data: { data?: { totals?: { countries?: unknown } } } = await res.json();
    const n = data.data?.totals?.countries;
    return typeof n === 'number' ? n : null;
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const t = metadataStrings[locale].legends;
  return {
    title: t.title,
    description: t.description,
    openGraph: { title: `${t.title} | Almanaque dos Clubes`, description: t.description },
  };
}

export default async function LegendsPage() {
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const meta = metadataStrings[locale].legends;

  const [payload, players, clubs, countries] = await Promise.all([
    getLegends(),
    totalOf('players'),
    totalOf('clubs'),
    totalCountries(),
  ]);

  const topChampions = payload?.data.topChampions.items ?? [];

  // JSON-LD: CollectionPage com ItemList dos maiores campeões — só nomes/posições que a API
  // entregou. Sem panteão inventado.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: meta.title,
    description: meta.description,
    inLanguage: locale,
    isPartOf: { '@type': 'WebSite', name: 'Almanaque dos Clubes' },
    ...(topChampions.length > 0
      ? {
          mainEntity: {
            '@type': 'ItemList',
            itemListElement: topChampions.map((item, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: item.clubName,
            })),
          },
        }
      : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <LendasPageView
        locale={locale}
        data={payload?.data ?? null}
        generatedAt={payload?.generatedAt ?? null}
        counts={{ players, clubs, countries }}
      />
    </>
  );
}
