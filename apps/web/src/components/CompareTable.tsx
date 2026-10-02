import Link from 'next/link';

/**
 * WS-C-7 — tabela lado a lado (mobile-first: colunas empilham via grid).
 * Dado ausente → '—' (honesto). Links para os perfis individuais.
 */

export interface CompareClubView {
  id: string;
  qid: string | null;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  foundedYear: number | null;
}

export interface CompareRankingView {
  rankingName: string;
  position: number | null;
  points: number | null;
  season: string | null;
}

export interface RecentTitleView {
  year: number;
  competitionName: string | null;
  hierarchy: string;
}

function orDash(v: string | number | null | undefined): string {
  return v === null || v === undefined || v === '' ? '—' : String(v);
}

export default function CompareTable({
  clubA,
  clubB,
  rankingA,
  rankingB,
  recentA,
  recentB,
  strings,
}: {
  clubA: CompareClubView;
  clubB: CompareClubView;
  rankingA: CompareRankingView[] | null;
  rankingB: CompareRankingView[] | null;
  recentA: RecentTitleView[];
  recentB: RecentTitleView[];
  strings: {
    founded: string;
    city: string;
    country: string;
    ranking: string;
    totalTitles: string;
    recentTitles: string;
    headToHead: string;
    h2hNone: string;
    h2hWith: string;
    viewProfile: string;
    noRanking: string;
  };
}) {
  const place = (c: CompareClubView): string =>
    [c.city, c.state, c.country].filter(Boolean).join(', ') || '—';
  const latest = (r: CompareRankingView[] | null): string => {
    if (!r || r.length === 0) return strings.noRanking;
    const top = r[0];
    return `${top.position != null ? `${top.position}º` : '—'} · ${top.rankingName}${
      top.season ? ` (${top.season})` : ''
    }`;
  };
  const recents = (list: RecentTitleView[]): string =>
    list.length === 0
      ? '—'
      : list.map((t) => `${t.year} · ${t.competitionName ?? '—'}`).join(' | ');

  const rows: Array<{ label: string; a: string; b: string }> = [
    { label: strings.founded, a: orDash(clubA.foundedYear), b: orDash(clubB.foundedYear) },
    { label: strings.city, a: place(clubA), b: place(clubB) },
    { label: strings.ranking, a: latest(rankingA), b: latest(rankingB) },
  ];

  return (
    <div className="bg-background rounded-2xl p-6 sm:p-8 shadow-md border border-border/50" data-testid="compare-table">
      {/* Cabeçalhos com link para os perfis (empilham no mobile) */}
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(6rem,1fr)_2fr_2fr] gap-3 sm:gap-6">
        <span className="text-xs text-foreground/40 uppercase tracking-wider sm:invisible" aria-hidden="true">
          {strings.viewProfile}
        </span>
        {[clubA, clubB].map((c) => (
          <div key={c.id} className="min-w-0">
            <Link
              href={`/clubs/${c.id}`}
              className="text-lg font-heading font-bold text-foreground hover:text-primary transition-colors"
            >
              {c.name}
            </Link>
            <p className="text-xs text-foreground/40 mt-0.5">
              <Link href={`/clubs/${c.id}`} className="hover:text-primary">
                {strings.viewProfile}
              </Link>
              {c.qid && (
                <>
                  {' · '}
                  <a
                    href={`https://www.wikidata.org/wiki/${c.qid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary"
                  >
                    {c.qid}
                  </a>
                </>
              )}
            </p>
          </div>
        ))}
      </div>

      <dl className="mt-6 divide-y divide-border/50">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-1 sm:grid-cols-[minmax(6rem,1fr)_2fr_2fr] gap-1 sm:gap-6 py-3"
          >
            <dt className="text-xs text-foreground/40 uppercase tracking-wider">{row.label}</dt>
            <dd className="text-sm text-foreground">{row.a}</dd>
            <dd className="text-sm text-foreground">{row.b}</dd>
          </div>
        ))}
        <div className="grid grid-cols-1 sm:grid-cols-[minmax(6rem,1fr)_2fr_2fr] gap-1 sm:gap-6 py-3">
          <dt className="text-xs text-foreground/40 uppercase tracking-wider">{strings.recentTitles}</dt>
          <dd className="text-sm text-foreground" data-testid="compare-recent-a">{recents(recentA)}</dd>
          <dd className="text-sm text-foreground" data-testid="compare-recent-b">{recents(recentB)}</dd>
        </div>
      </dl>
    </div>
  );
}
