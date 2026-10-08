import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import PageHeading from '@/components/PageHeading';
import SearchBar from '@/components/SearchBar';
import { getApiBase } from '@/lib/api-base';
import { getDictionary } from '@/i18n/getDictionary';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';
import {
  CONTINENTAL_ANCHORS,
  NATIONAL_ANCHOR_GROUPS,
  WOMEN_ANCHORS,
  countryLabel,
  type AnchorCompetition,
} from '@/lib/competition-anchors';

export const metadata: Metadata = {
  title: 'Competições',
  description: 'Explore competições de futebol de todo o mundo. Pesquise por nome, país e tipo de competição.',
  openGraph: { title: 'Competições de Futebol | Almanaque dos Clubes' },
};

interface Competition {
  id: string;
  name: string;
  country?: string | null;
  type?: string | null;
}

async function getCompetitions(searchParams: { [key: string]: string | undefined }) {
  const params = new URLSearchParams();
  [['country'], ['type'], ['search']].forEach(([key]) => {
    const v = searchParams[key];
    if (v) params.set(key, v);
  });
  params.set('limit', '50');
  try {
    const base = getApiBase();
    const res = await fetch(base + '/competitions?' + params.toString(), { cache: 'no-store' });
    if (!res.ok) return { data: [], total: 0 };
    return await res.json();
  } catch {
    return { data: [], total: 0 };
  }
}

// Mapeamento do portal (Operador, 08/10) — hierarquia geográfica com âncoras
// CURADAS do acervo (ids/QIDs confirmados no banco de produção; regra R4).
// Seções sem dado no acervo (Seleções/Internacionais) ficam vazio-honestas.

function AnchorChip({ c }: { c: AnchorCompetition }) {
  return (
    <Link
      href={`/competitions/${c.id}`}
      className="inline-block px-3 py-1.5 rounded-full border border-border text-sm text-foreground/80 hover:border-primary/50 hover:text-primary transition-colors"
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
  const { data: competitions, total } = await getCompetitions(sp);
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

      {/* Hierarquia curada (mapeamento do portal) */}
      <div className="mt-8 space-y-8">
        {/* Continentais */}
        <section aria-labelledby="comp-continental">
          <h2 id="comp-continental" className="text-lg font-heading font-semibold mb-3">
            {`🏆 ${s.continental}`}
          </h2>
          <div className="flex flex-wrap gap-2">
            {CONTINENTAL_ANCHORS.map((c) => (
              <AnchorChip key={c.id} c={c} />
            ))}
          </div>
        </section>

        {/* Nacionais por país */}
        <section aria-labelledby="comp-nacionais">
          <h2 id="comp-nacionais" className="text-lg font-heading font-semibold mb-3">
            {`⚽ ${s.nacionais}`}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {NATIONAL_ANCHOR_GROUPS.map((g) => (
              <div key={g.country} className="rounded-xl border border-border p-4">
                <h3 className="text-sm font-semibold text-foreground/80 mb-2">
                  {countryLabel(g.country, locale)}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {g.items.map((c) => (
                    <AnchorChip key={c.id} c={c} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Feminino */}
        <section aria-labelledby="comp-feminino">
          <h2 id="comp-feminino" className="text-lg font-heading font-semibold mb-3">
            {`♀ ${s.feminino}`}
          </h2>
          <div className="flex flex-wrap gap-2">
            {WOMEN_ANCHORS.map((c) => (
              <AnchorChip key={c.id} c={c} />
            ))}
            <Link
              href="/competitions?search=feminino"
              className="inline-block px-3 py-1.5 rounded-full text-sm text-primary hover:underline"
            >
              {`${s.verTodasFeminino} →`}
            </Link>
          </div>
          <p className="mt-2 text-xs text-foreground/40">{s.femininoNota}</p>
        </section>

        {/* Seleções / Internacionais — vazio honesto */}
        <section aria-labelledby="comp-selecoes">
          <h2 id="comp-selecoes" className="text-lg font-heading font-semibold mb-3">
            {`🌍 ${s.selecoes}`}
          </h2>
          <p className="text-sm text-foreground/50" data-testid="selecoes-empty">
            {s.selecoesVazio}
          </p>
        </section>
      </div>

      {/* Busca + lista completa (funcionalidade existente) */}
      <div className="mt-12 mb-6">
        <h2 className="text-lg font-heading font-semibold mb-3">{s.todas}</h2>
        <SearchBar targetPath="/competitions" searchKey="search" placeholderKey="pages.competitions.title" />
      </div>
      <Suspense
        fallback={
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
            <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
            <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
          </div>
        }
      >
        {competitions.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {competitions.map((c: Competition) => (
              <Link
                key={c.id}
                href={`/competitions/${c.id}`}
                className="block bg-background rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-200 border border-border/50 hover:border-primary/40 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-heading font-bold text-sm mb-3">
                  {c.name.slice(0, 2).toUpperCase()}
                </div>
                <h3 className="text-lg font-heading font-semibold text-foreground">{c.name}</h3>
                {c.country ? (
                  <p className="text-sm text-foreground/60 mt-1">{c.country}</p>
                ) : (
                  <p className="text-sm text-foreground/60 mt-1">Internacional</p>
                )}
                {c.type ? (
                  <span className="inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
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
      </Suspense>
    </div>
  );
}
