import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getApiBase } from '@/lib/api-base';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';
import { wsC7Strings } from '@/i18n/wsC7';
import { wsC5Strings } from '@/i18n/wsC5';
import TitleBars from '@/components/TitleBars';
import CompareTable from '@/components/CompareTable';

// WS-C-7 — comparação server-rendered entre clubes (fonte: GET /clubs/compare).
// Seletor interativo: reusa a página /compare existente (T440) — fonte-única.

interface SearchParams {
  a?: string;
  b?: string;
}

interface CompareResponse {
  clubA: {
    id: string;
    qid: string | null;
    name: string;
    city: string | null;
    state: string | null;
    country: string | null;
    foundedYear: number | null;
  };
  clubB: CompareResponse['clubA'];
  titles: {
    clubA: {
      municipal: number;
      estadual: number;
      nacional: number;
      continental: number;
      mundial: number;
      total: number;
    };
    clubB: CompareResponse['titles']['clubA'];
  };
  rankings: {
    clubA: Array<{ rankingName: string; position: number | null; points: number | null; season: string | null }> | null;
    clubB: CompareResponse['rankings']['clubA'];
  };
  recentTitles: {
    clubA: Array<{ year: number; competitionName: string | null; hierarchy: string }>;
    clubB: CompareResponse['recentTitles']['clubA'];
  };
  headToHead: { exists: boolean; relations: string[]; matches: unknown[] };
}

async function getComparison(a: string, b: string): Promise<CompareResponse | 'same' | null> {
  if (a === b) return 'same';
  try {
    const res = await fetch(
      `${getApiBase()}/clubs/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`,
      { next: { revalidate: 300 } },
    );
    if (res.status === 400) return 'same';
    if (!res.ok) return null;
    const json = await res.json();
    return json.data as CompareResponse;
  } catch {
    return null;
  }
}

async function getLocale() {
  const store = await cookies();
  return normalizeLocale(store.get(LOCALE_COOKIE)?.value);
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const { a, b } = await searchParams;
  return {
    title: 'Comparar clubes — Almanaque dos Clubes',
    description: 'Títulos, ranking e confronto entre dois clubes, lado a lado e com proveniência.',
    ...(a && b ? { alternates: { canonical: `/clubs/compare?a=${a}&b=${b}` } } : {}),
  };
}

export default async function ClubComparePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { a, b } = await searchParams;
  const locale = await getLocale();
  const s = wsC7Strings[locale].compare;
  const hierarchyLabels = wsC5Strings[locale].timeline.hierarchies;

  const result = a && b ? await getComparison(a, b) : null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground">{s.title}</h1>
      <p className="text-foreground/60 mt-1 mb-8">{s.subtitle}</p>

      <div className="mb-8 text-sm text-foreground/60">
        {s.missingParams}{' '}
        <Link href="/compare" className="text-primary hover:underline">
          /compare
        </Link>
      </div>

      {result === 'same' && (
        <p className="text-sm text-red-600" role="alert" data-testid="compare-same-club">
          {s.sameClub}
        </p>
      )}

      {result && result !== 'same' ? (
        <div className="space-y-8" data-testid="compare-content">
          <CompareTable
            clubA={result.clubA}
            clubB={result.clubB}
            rankingA={result.rankings.clubA}
            rankingB={result.rankings.clubB}
            recentA={result.recentTitles.clubA}
            recentB={result.recentTitles.clubB}
            strings={{
              founded: s.founded,
              city: s.city,
              country: s.country,
              ranking: s.ranking,
              totalTitles: s.totalTitles,
              recentTitles: s.recentTitles,
              headToHead: s.headToHead,
              h2hNone: s.h2hNone,
              h2hWith: s.h2hWith,
              viewProfile: s.viewProfile,
              noRanking: s.noRanking,
            }}
          />

          <section className="bg-background rounded-2xl p-6 sm:p-8 shadow-md border border-border/50">
            <h2 className="text-xl font-heading font-bold text-foreground mb-4">
              {s.totalTitles}
            </h2>
            <TitleBars
              nameA={result.clubA.name}
              nameB={result.clubB.name}
              countsA={result.titles.clubA}
              countsB={result.titles.clubB}
              hierarchyLabels={hierarchyLabels}
            />
          </section>

          <section className="bg-background rounded-2xl p-6 sm:p-8 shadow-md border border-border/50" data-testid="compare-h2h">
            <h2 className="text-xl font-heading font-bold text-foreground mb-3">
              {s.headToHead}
            </h2>
            {result.headToHead.exists ? (
              <p className="text-sm text-foreground">
                {s.h2hWith}:{' '}
                <span className="font-medium">{result.headToHead.relations.join(', ')}</span>
              </p>
            ) : (
              <p className="text-sm text-foreground/50">{s.h2hNone}</p>
            )}
          </section>
        </div>
      ) : (
        !result && (a && b) ? (
          <p className="text-sm text-foreground/50" role="alert" data-testid="compare-error">
            {s.error}
          </p>
        ) : null
      )}
    </div>
  );
}
