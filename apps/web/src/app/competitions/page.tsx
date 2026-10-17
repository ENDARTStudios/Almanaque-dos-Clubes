import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import PageHeading from '@/components/PageHeading';
import SearchBar from '@/components/SearchBar';
import CountryIndex from '@/components/CountryIndex';
import { CountryFlag } from '@/components/CountryFlag';
import { getApiBase } from '@/lib/api-base';
import { getDictionary } from '@/i18n/getDictionary';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';
import { metadataStrings } from '@/i18n/wsMetadata';
import {
  CONTINENTAL_ANCHORS,
  INTERNATIONAL_ANCHORS,
  WOMEN_ANCHORS,
  type AnchorCompetition,
} from '@/lib/competition-anchors';

// T583 — título/descrição por idioma (o locale vem do MESMO cookie lido pela página).
export async function generateMetadata(): Promise<Metadata> {
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const t = metadataStrings[locale].competitions;
  return {
    title: t.title,
    description: t.description,
    openGraph: { title: `${t.title} | Almanaque dos Clubes`, description: t.description },
  };
}

interface Competition {
  id: string;
  name: string;
  country?: string | null;
  type?: string | null;
}

async function getCompetitions(searchParams: { [key: string]: string | undefined }) {
  const params = new URLSearchParams();
  [['country'], ['type'], ['gender'], ['search']].forEach(([key]) => {
    const v = searchParams[key];
    if (v) params.set(key, v);
  });
  const offset = Math.max(parseInt(searchParams.offset ?? '0', 10) || 0, 0);
  params.set('offset', String(offset));
  params.set('limit', '50');
  try {
    const base = getApiBase();
    const res = await fetch(base + '/competitions?' + params.toString(), { cache: 'no-store' });
    if (!res.ok) return { data: [], total: 0, offset: 0 };
    return await res.json();
  } catch {
    return { data: [], total: 0, offset: 0 };
  }
}

// Mapeamento do portal (Operador, 08/10) — hierarquia geográfica com âncoras
// CURADAS do acervo (ids/QIDs confirmados no banco de produção; regra R4).
// T556 — a seção de Seleções/Internacionais deixou de ser vazio-honesto: o acervo TEM
// 165 competições internacionais (Copa do Mundo, Eurocopa, Copa América...) e a âncora
// curada passa a ser a fonte da lista.

function AnchorChip({ c }: { c: AnchorCompetition }) {
  return (
    <Link
      href={`/competitions/${c.id}`}
      className="inline-block px-3 py-1.5 rounded-full border border-border text-sm text-foreground/80 hover:border-primary/50 hover:text-primary-ink transition-colors"
    >
      {c.name}
    </Link>
  );
}

export default async function CompetitionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const sp = await searchParams;
  const { data: competitions, total, offset } = await getCompetitions(sp);
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const dict = getDictionary(locale);
  const s = dict.pages.competitions.sections;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <PageHeading
        titleKey="pages.competitions.title"
        subtitleKey="pages.competitions.subtitle"
        subtitleParams={{ n: total }}
      />

      {/* T577 — REORGANIZAÇÃO. O que havia antes: seis grupos de "âncoras" curadas (continental,
          três blocos nacionais, feminino, seleções) seguidos de um grid com TODAS as 1.932
          competições. Isso não é organização — é uma lista de atalhos em cima de outra lista, sem
          hierarquia, e o Operador descreveu exatamente isso: "mal planejada e confusa".

          A hierarquia nova segue a ORDEM EM QUE SE DECIDE:
            1. filtros       — estreitar por gênero/tipo/país
            2. destaques     — as competições que as pessoas procuram por nome
            3. países        — o eixo que o DADO sustenta (92% de cobertura, 84 países)
            4. resultado     — a lista, com a contagem do recorte atual

          O índice de países substitui os blocos nacionais curados: em vez de TRÊS países escolhidos
          a dedo, os 84 que existem, com contagem real e busca. Os destaques continuam porque
          "Copa do Mundo" e "Libertadores" são procuradas por nome, não por país — mas agora são uma
          faixa rotulada, não seis seções competindo com a lista. */}

      {/* 1. FILTROS — estreitam o recorte */}
      <form
        method="get"
        className="mt-8 flex flex-wrap gap-3 items-end"
        aria-label={dict.pages.competitions.filtersLabel}
      >
        <label className="text-xs text-foreground/60">
          {dict.pages.competitions.filters.gender}
          <select name="gender" defaultValue={sp.gender ?? ''} className="field block mt-1">
            <option value="">{dict.pages.competitions.filters.all}</option>
            <option value="men">{dict.pages.rankings.genderMen}</option>
            <option value="women">{dict.pages.rankings.genderWomen}</option>
          </select>
        </label>
        <label className="text-xs text-foreground/60">
          {dict.pages.competitions.filters.type}
          {/* A opção "todas" é o que a maioria quer por padrão: `type` só existe em 54% do acervo,
              e começar filtrado por um campo incompleto esconderia metade sem dizer. */}
          <select name="type" defaultValue={sp.type ?? ''} className="field block mt-1">
            <option value="">{dict.pages.competitions.filters.all}</option>
            <option value="LEAGUE">{dict.pages.competitions.filters.league}</option>
            <option value="CUP">{dict.pages.competitions.filters.cup}</option>
          </select>
        </label>
        <label className="text-xs text-foreground/60">
          {dict.pages.competitions.filters.country}
          <input
            name="country"
            defaultValue={sp.country ?? ''}
            placeholder="BR"
            maxLength={2}
            className="field block mt-1 w-20"
          />
        </label>
        <button
          type="submit"
          className="h-[38px] px-5 rounded-lg bg-primary text-on-primary text-sm font-semibold"
        >
          {dict.pages.competitions.filters.apply}
        </button>
        {/* Sair do recorte é uma ação explícita. Sem isto, quem filtrou por engano fica preso
            tendo de apagar campo por campo. */}
        {sp.country || sp.type || sp.gender || sp.search ? (
          <Link
            href="/competitions"
            className="h-[38px] inline-flex items-center px-4 rounded-lg border border-border text-sm text-foreground/70 hover:border-primary/50 hover:text-primary-ink transition-colors"
            data-testid="competitions-clear"
          >
            {dict.pages.competitions.filters.clear}
          </Link>
        ) : null}
      </form>

      {/* 2. DESTAQUES — competições procuradas por NOME, não por país. */}
      <section className="mt-8" aria-labelledby="comp-destaques">
        <h2
          id="comp-destaques"
          className="text-sm font-heading font-semibold uppercase tracking-wider text-ink-2 mb-3"
        >
          {s.destaques}
        </h2>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-ink-3 min-w-24">{s.continental}</span>
            {CONTINENTAL_ANCHORS.map((c) => (
              <AnchorChip key={c.id} c={c} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-ink-3 min-w-24">{s.selecoes}</span>
            {INTERNATIONAL_ANCHORS.map((c) => (
              <AnchorChip key={c.id} c={c} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-ink-3 min-w-24">{s.feminino}</span>
            {WOMEN_ANCHORS.map((c) => (
              <AnchorChip key={c.id} c={c} />
            ))}
            <Link
              href="/competitions?gender=women"
              className="inline-flex min-h-6 items-center text-sm text-primary-ink underline decoration-dotted underline-offset-2"
            >
              {s.verTodasFeminino}
            </Link>
          </div>
        </div>
        <p className="mt-3 text-xs text-ink-3">{s.destaquesNota}</p>
      </section>

      {/* 3. PAÍSES — o eixo principal. Só aparece quando o usuário NÃO recortou ainda: filtrando
          por um país, um índice de países ao lado da lista é ruído, não navegação. */}
      {!sp.country && !sp.search && !sp.gender && !sp.type ? (
        <div className="mt-10">
          <CountryIndex
            basePath="/competitions"
            endpoint="/competitions/countries"
            campo="competitions"
            rotulo={dict.pages.competitions.filters.competitionsLabel}
          />
        </div>
      ) : null}

      {/* Busca + lista completa (funcionalidade existente) */}
      <div className="mt-12 mb-6">
        <h2 className="text-lg font-heading font-semibold mb-3">{s.todas}</h2>
        <SearchBar
          targetPath="/competitions"
          searchKey="search"
          placeholderKey="pages.competitions.title"
        />
      </div>
      <Suspense
        fallback={
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="h-48 bg-neutral-surface rounded-xl animate-pulse" />
            <div className="h-48 bg-neutral-surface rounded-xl animate-pulse" />
            <div className="h-48 bg-neutral-surface rounded-xl animate-pulse" />
          </div>
        }
      >
        {competitions.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {competitions.map((c: Competition) => (
              <Link
                key={c.id}
                href={`/competitions/${c.id}`}
                className="block bg-background rounded-xl p-5 shadow-md hover:shadow-lg transition duration-200 border border-border/50 hover:border-primary/40 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary-ink font-heading font-bold text-sm mb-3">
                  {c.name.slice(0, 2).toUpperCase()}
                </div>
                <h3 className="text-lg font-heading font-semibold text-foreground">{c.name}</h3>
                {/* T579 (ITEM 19) — o país da competição com bandeira derivada do ISO2 e o
                    nome por extenso no idioma do usuário. Não é clique aqui: o cartão todo
                    já leva à competição (âncora dentro de âncora é HTML inválido). O caminho
                    clicável para o país é o índice de países e/ou o `?country=` do filtro. */}
                {c.country ? (
                  <p className="mt-1 text-sm text-foreground/60">
                    <CountryFlag code={c.country} locale={locale} />
                  </p>
                ) : (
                  <p className="text-sm text-foreground/60 mt-1">Internacional</p>
                )}
                {c.type ? (
                  <span className="inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary-ink">
                    {c.type === 'LEAGUE'
                      ? 'Liga'
                      : c.type === 'CUP'
                        ? 'Copa'
                        : c.type === 'TOURNAMENT'
                          ? 'Torneio'
                          : c.type}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-center text-foreground/60 py-12">Nenhuma competição encontrada.</p>
        )}
        {total > 50 ? (
          <nav
            className="flex justify-between mt-6"
            aria-label={dict.pages.competitions.paginationLabel}
          >
            {offset > 0 ? (
              <Link
                href={pageHref(sp, Math.max(0, offset - 50))}
                className="px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:border-primary/40"
              >
                {dict.pages.competitions.prev}
              </Link>
            ) : (
              <span />
            )}
            {offset + 50 < total ? (
              <Link
                href={pageHref(sp, offset + 50)}
                className="px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:border-primary/40"
              >
                {dict.pages.competitions.next}
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </Suspense>
    </div>
  );
}

// Paginação (Entrega 4): preserva os filtros ativos na troca de página.
function pageHref(sp: { [key: string]: string | undefined }, offset: number): string {
  const params = new URLSearchParams();
  for (const key of ['gender', 'type', 'country', 'search'] as const) {
    if (sp[key]) params.set(key, sp[key] as string);
  }
  params.set('offset', String(offset));
  return '/competitions?' + params.toString();
}
