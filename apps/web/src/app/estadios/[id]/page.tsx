import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getApiBase } from '@/lib/api-base';
import { safeJsonLd } from '@/lib/json-ld';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';
import { estadiosStrings } from '@/i18n/wsEstadios';
import DetailUnavailable from '@/components/ficha/DetailUnavailable';
import EstadioFichaPageView from '@/components/conceito/estadio/EstadioFichaPageView';
import type { Estadio } from '@/components/conceito/estadio/types';

/**
 * FICHA DO ESTÁDIO — composição do quadro `estadio` do conceito FICHA.
 *
 * ── O QUE A PÁGINA DIZ, E O QUE ELA NÃO DIZ ───────────────────────────────────────────────
 * Diz: nome, cidade, estado, país, capacidade, piso, coordenadas, clube vinculado e a URL da
 * fonte — exatamente o contrato de `GET /stadiums/:id`.
 *
 * NÃO diz: história, inauguração, público recorde, partidas, gols ou média. O modelo `Stadium`
 * não tem essas colunas e a API pública não publica público por partida. Inventar uma seção
 * "História" com texto genérico (ou uma tabela de "Maiores públicos" ilustrativa) seria
 * preencher a página com o que não se sabe — o oposto do que o sistema de proveniência garante.
 * A composição declara cada lacuna com "—" e nota; os blocos que dependem de série inexistente
 * (gráfico por década, tabela de maiores públicos) não são desenhados.
 *
 * ── TRÊS RESULTADOS, NÃO DOIS ──────────────────────────────────────────────────────────────
 * `valor` = existe · `null` = a origem disse 404 · `undefined` = NÃO foi possível perguntar.
 * Fundir os dois últimos fazia a ficha afirmar "não existe" com a API fora do ar.
 */
export const metadata: Metadata = {
  title: 'Estádio · Almanaque dos Clubes',
};

/** Três resultados, não dois — ver o comentário do bloco acima. */
async function getEstadio(id: string): Promise<Estadio | null | undefined> {
  try {
    const base = getApiBase();
    const r = await fetch(`${base}/stadiums/${encodeURIComponent(id)}`, {
      next: { revalidate: 3600 },
    });
    if (r.status === 404) return null;
    if (!r.ok) return undefined;
    const j = (await r.json()) as { data?: Estadio };
    return j.data ?? null;
  } catch {
    return undefined;
  }
}

export default async function EstadioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const s = estadiosStrings[locale];

  const e = await getEstadio(id);
  // NÃO foi possível perguntar ≠ o registro não existe. Só o segundo vira 404.
  if (e === undefined)
    return (
      <DetailUnavailable
        retryHref={`/estadios/${id}`}
        backHref="/estadios"
        backLabel={s.backToList}
      />
    );
  if (e === null) notFound();

  /*
   * JSON-LD com os campos REAIS do registro. Nada de aggregateRating, inauguração ou recorde de
   * público: structured data também é afirmação, e afirmar o que a fonte não diz é o mesmo defeito
   * da tela — só que ilegível para o usuário.
   */
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'StadiumOrArena',
    name: e.name,
    sameAs: e.sourceUrl ?? undefined,
    address:
      e.city || e.state || e.country
        ? {
            '@type': 'PostalAddress',
            addressLocality: e.city ?? undefined,
            addressRegion: e.state ?? undefined,
            addressCountry: e.country ?? undefined,
          }
        : undefined,
    geo:
      e.latitude != null && e.longitude != null
        ? { '@type': 'GeoCoordinates', latitude: e.latitude, longitude: e.longitude }
        : undefined,
    maximumAttendeeCapacity: e.capacity ?? undefined,
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 pt-8 pb-16 sm:px-10 lg:px-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <Link
        href="/estadios"
        className="mb-4 inline-flex min-h-6 items-center text-[13px] text-primary-ink hover:underline"
      >
        &larr; {s.backToList}
      </Link>

      <EstadioFichaPageView locale={locale} estadio={e} />
    </div>
  );
}
