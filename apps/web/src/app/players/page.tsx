import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import PageHeading from '@/components/PageHeading';
import CountryIndex from '@/components/CountryIndex';
import SearchBar from '@/components/SearchBar';
import { CountryFlag } from '@/components/CountryFlag';
import { getApiBase } from '@/lib/api-base';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';

export const metadata: Metadata = {
  title: 'Jogadores',
  description: 'Jogadores de futebol de todos os tempos, com posição, país e proveniência.',
};

interface PlayerRow {
  id: string;
  fullName: string;
  country?: string | null;
  position?: string | null;
}

/**
 * T563 — `country` e `position` passaram a ser enviados à API.
 *
 * O DEFEITO: o `CountryIndex` marcava o país selecionado com `aria-current` e o link levava a
 * `?country=GB` — mas esta função só recebia `search`. O país era usado apenas para DECORAR o
 * cartão como ativo, e NUNCA chegava à consulta. Resultado: clicar em "United Kingdom" levava a
 * uma URL correta, com o cartão destacado, e a lista abaixo mostrava os mesmos 60 jogadores de
 * antes, sem relação com o país escolhido. O usuário via a interface confirmar uma seleção que
 * não tinha efeito nenhum.
 *
 * É a pior forma de defeito de filtro: a URL fica certa, o estado visual fica certo, e o dado
 * fica errado. Nada denuncia.
 */
async function getPlayers(filtros: { search?: string; country?: string; position?: string }) {
  try {
    const params = new URLSearchParams({ limit: '60' });
    if (filtros.search) params.set('search', filtros.search);
    // A API já aceitava os dois: `/players?country=GB` devolve 26.020 (medido em produção).
    if (filtros.country) params.set('country', filtros.country);
    if (filtros.position) params.set('position', filtros.position);
    const res = await fetch(getApiBase() + '/players?' + params.toString(), { cache: 'no-store' });
    if (!res.ok) return { data: [], total: 0 };
    return await res.json();
  } catch {
    return { data: [], total: 0 };
  }
}

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const sp = await searchParams;
  const { data: players, total } = await getPlayers({
    ...(sp.search ? { search: sp.search } : {}),
    ...(sp.country ? { country: sp.country } : {}),
    ...(sp.position ? { position: sp.position } : {}),
  });
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <PageHeading titleKey="pages.players.title" subtitleKey="pages.players.subtitle" />
      <div className="mb-6">
        <SearchBar targetPath="/players" searchKey="search" placeholderKey="pages.players.title" />
      </div>
      <p className="text-sm text-ink-2 mt-2 mb-6">Jogadores diferentes no acervo: {total}</p>
      {/* AGRUPAMENTO POR PAÍS — mesmo desenho da sessão Clubes. Aqui o dado é bom: 98% dos
          jogadores têm `country` (ISO2). São 105.211 no acervo, então vale a mesma razão de ser
          índice em vez de listas na mesma página — a página não comporta tudo agrupado. */}
      <CountryIndex
        basePath="/players"
        endpoint="/players/countries"
        campo="players"
        rotulo="jogadores"
        {...(sp.country ? { selecionado: sp.country } : {})}
      />
      {players.length ? (
        <section aria-labelledby="players-list-title">
          {/* Mesmo motivo do grid de clubes: os cards titulam com `<h3>` e a página só tem
              `<h1>`, então falta o nível 2 do CONJUNTO. `sr-only` porque a contagem logo acima
              já anuncia a lista — o título serve à árvore de acessibilidade, não à tela. */}
          <h2 id="players-list-title" className="sr-only">
            Jogadores no acervo
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {players.map((p: PlayerRow) => (
              <Link
                key={p.id}
                href={`/players/${p.id}`}
                className="block bg-background rounded-xl p-5 shadow-md hover:shadow-lg transition duration-200 border border-border/50 hover:border-primary/40 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary-ink font-heading font-bold text-sm mb-3">
                  {p.fullName.slice(0, 2).toUpperCase()}
                </div>
                <h3 className="text-lg font-heading font-semibold text-foreground">{p.fullName}</h3>
                {/* T579 (ITEM 19) — país do jogador com bandeira + nome no idioma do usuário.
                    Não é clique: o cartão todo já é o link do jogador. */}
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-foreground/60">
                  <span>{p.position ?? '—'}</span>
                  {p.country ? <CountryFlag code={p.country} locale={locale} /> : null}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <p className="text-center text-foreground/60 py-12">Nenhum jogador encontrado.</p>
      )}
    </div>
  );
}
