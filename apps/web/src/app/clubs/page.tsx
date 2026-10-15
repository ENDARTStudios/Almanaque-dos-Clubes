import type { Metadata } from 'next';
import { Suspense } from 'react';
import ClubGrid from '@/components/ClubCard';
import SearchBar from '@/components/SearchBar';
import PageHeading from '@/components/PageHeading';
import CountryIndex from '@/components/CountryIndex';
import CityDrilldown from '@/components/CityDrilldown';
import { getApiBase } from '@/lib/api-base';

export const metadata: Metadata = {
  title: 'Clubes',
  description:
    'Explore milhares de clubes de futebol do mundo inteiro. Pesquise por nome, país, cidade e status.',
  openGraph: { title: 'Clubes de Futebol | Almanaque dos Clubes' },
};

async function getClubs(searchParams: { [key: string]: string | undefined }) {
  const params = new URLSearchParams();
  /* T562 — `hasCoordinates` entrou aqui: a API JÁ aceitava o parâmetro e a página o descartava,
     então a URL `?hasCoordinates=true` era silenciosamente ignorada. O filtro devolve os clubes
     com latitude registrada (6.477 de 12.003, medido) — é a metade do acervo que o mapa
     consegue posicionar, e não havia como pedir por ela na interface. */
  [['country'], ['city'], ['search'], ['status'], ['hasCoordinates']].forEach(([key]) => {
    const v = searchParams[key];
    if (v) params.set(key, v);
  });
  params.set('limit', '50');
  try {
    const base = getApiBase();
    const res = await fetch(base + '/clubs?' + params.toString(), { cache: 'no-store' });
    // T548 — falha de API devolve `total: null` (lacuna declarada), não 0: o subtítulo
    // imprimia "Explore 0 clubes de futebol cadastrados" como se fosse fato.
    if (!res.ok) return { data: [], total: null };
    return await res.json();
  } catch {
    return { data: [], total: null };
  }
}

export default async function ClubsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const sp = await searchParams;
  const { data: clubs, total } = await getClubs(sp);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <PageHeading
        titleKey="pages.clubs.title"
        // T548 — quando a API falha, a linha do subtítulo DECLARA a lacuna; antes ela
        // imprimia "Explore 0 clubes de futebol cadastrados" como se fosse fato.
        subtitleKey={total == null ? 'pages.clubs.loadError' : 'pages.clubs.subtitle'}
        {...(total == null ? {} : { subtitleParams: { n: total } })}
      />
      <div className="mb-8">
        <Suspense fallback={<div className="h-12 bg-neutral-surface rounded-xl animate-pulse" />}>
          <SearchBar placeholderKey="pages.clubs.placeholder" />
        </Suspense>
      </div>
      {/* AGRUPAMENTO POR PAÍS — pedido do Operador para esta sessão.
          É um ÍNDICE, não listas por país na mesma página: são 12.003 clubes, e renderizar tudo
          agrupado não abre. O índice mostra a contagem REAL por país (contada pela mesma coluna
          que o filtro `?country=` usa) e o clique filtra pela API, que já aceita o parâmetro. */}
      <CountryIndex
        basePath="/clubs"
        endpoint="/clubs/countries"
        campo="clubs"
        rotulo="clubes"
        {...(sp.country ? { selecionado: sp.country } : {})}
      />
      {/* SEGUNDO NÍVEL — cidades DENTRO do país escolhido, e só quando o dado sustenta.
          O componente decide pelo número: com cobertura de cidade >= 60% lista as cidades; abaixo
          disso DECLARA quantos clubes não têm cidade em vez de mostrar uma lista curta como se
          fosse o acervo. Medido: 93% na Alemanha contra 26% na Suécia. */}
      {sp.country ? <CityDrilldown key={sp.country} country={sp.country} /> : null}
      <Suspense
        fallback={
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="h-48 bg-neutral-surface rounded-xl animate-pulse" />
            <div className="h-48 bg-neutral-surface rounded-xl animate-pulse" />
            <div className="h-48 bg-neutral-surface rounded-xl animate-pulse" />
          </div>
        }
      >
        <ClubGrid clubs={clubs} />
      </Suspense>
    </div>
  );
}
