import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import PageHeading from '@/components/PageHeading';
import { getApiBase } from '@/lib/api-base';

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

export default async function CompetitionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const sp = await searchParams;
  const { data: competitions, total } = await getCompetitions(sp);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <PageHeading
        titleKey="pages.competitions.title"
        subtitleKey="pages.competitions.subtitle"
        subtitleParams={{ n: total }}
      />
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
