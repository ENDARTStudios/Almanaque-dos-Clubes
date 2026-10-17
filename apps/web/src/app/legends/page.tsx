import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { getApiBase } from '@/lib/api-base';
import { safeJsonLd } from '@/lib/json-ld';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';
import { metadataStrings } from '@/i18n/wsMetadata';
import { wsLegendsStrings } from '@/i18n/wsLegends';
import { formatCount, formatDate } from '@/lib/format';
import LegendsTopChart from '@/components/LegendsTopChart';

/**
 * Legends — hall da fama (server component, fonte única: GET /api/v1/legends).
 * Renderiza SOMENTE o que a API entrega; lacuna vira texto declarado — nunca
 * número estimado, esqueleto infinito ou dado inventado (honestidade do acervo).
 */

interface TopChampionItem {
  clubId: string;
  clubName: string;
  country: string | null;
  titles: number;
  lastTitleYear: number | null;
}

interface CompetitionLeaderItem {
  competitionId: string;
  competitionName: string | null;
  competitionType: string | null;
  leaderClubId: string;
  leaderClubName: string;
  titles: number;
  lastTitleYear: number | null;
}

interface MatchRecord {
  matchId: string;
  homeClubId: string;
  homeClubName: string;
  awayClubId: string;
  awayClubName: string;
  homeScore: number;
  awayScore: number;
  margin: number;
  totalGoals: number;
  date: string;
  competitionId: string | null;
  competitionName: string | null;
  seasonId: string | null;
  seasonName: string | null;
  sourceUrl: string | null;
}

interface LegendsPayload {
  data: {
    topChampions: {
      items: TopChampionItem[];
      provenance: { source: string; titlesCounted: number };
    };
    competitionLeaders: {
      items: CompetitionLeaderItem[];
      provenance: { source: string; competitionsConsidered: number };
    };
    records: {
      biggestWin: MatchRecord | null;
      mostGoalsMatch: MatchRecord | null;
      mostGoalsClubSeason: {
        clubId: string;
        clubName: string;
        seasonId: string | null;
        seasonName: string | null;
        goals: number;
        matches: number;
      } | null;
      longestUnbeatenSeason: {
        clubId: string;
        clubName: string;
        seasonId: string | null;
        seasonName: string | null;
        length: number;
        fromDate: string;
        toDate: string;
      } | null;
      provenance: { source: string; matchesConsidered: number };
    };
  };
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

/** Cartão de recorde: valor em destaque, holder com link, fonte quando existe. */
function RecordCard({
  label,
  value,
  children,
  sourceUrl,
  sourceText,
}: {
  label: string;
  value: string;
  children: ReactNode;
  sourceUrl: string | null;
  sourceText: string;
}) {
  return (
    <article className="rounded-xl border border-border bg-muted p-5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/70">{label}</h3>
      <p className="mb-1 font-heading text-4xl font-bold text-primary-ink">{value}</p>
      <div className="text-sm text-foreground">{children}</div>
      {sourceUrl ? (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-xs text-primary-ink underline underline-offset-2 transition-colors duration-200 hover:opacity-80"
        >
          {sourceText} <span aria-hidden="true">↗</span>
        </a>
      ) : null}
    </article>
  );
}

export default async function LegendsPage() {
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const t = wsLegendsStrings[locale];
  const payload = await getLegends();
  const meta = metadataStrings[locale].legends;

  const top = payload?.data.topChampions;
  const leaders = payload?.data.competitionLeaders;
  const records = payload?.data.records;
  const recordsItems = records
    ? [
        records.biggestWin,
        records.mostGoalsMatch,
        records.mostGoalsClubSeason,
        records.longestUnbeatenSeason,
      ]
    : [];
  const hasRecords = recordsItems.some((r) => r !== null);

  // JSON-LD: CollectionPage com ItemList dos maiores campeões (só nomes reais do
  // acervo — sem inventar posição/dado além do que a API entregou).
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: meta.title,
    description: meta.description,
    inLanguage: locale,
    isPartOf: { '@type': 'WebSite', name: 'Almanaque dos Clubes' },
    ...(top && top.items.length > 0
      ? {
          mainEntity: {
            '@type': 'ItemList',
            itemListElement: top.items.map((item, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: item.clubName,
            })),
          },
        }
      : {}),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />

      <header className="mb-10">
        <h1 className="mb-2 font-heading text-3xl font-bold text-foreground sm:text-4xl">
          {t.hero.title}
        </h1>
        <p className="mb-3 max-w-3xl text-lg text-foreground/60">{t.hero.subtitle}</p>
        <p className="text-xs text-foreground/70">{t.hero.provenance}</p>
      </header>

      {payload === null ? <p className="text-foreground/80">{t.loadError}</p> : null}

      {/* (a) MAIORES CAMPEÕES — barras horizontais com valor visível. */}
      <section aria-labelledby="legends-top-title" className="mb-12">
        <h2 id="legends-top-title" className="mb-1 font-heading text-2xl font-bold sm:text-3xl">
          {t.topChampions.title}
        </h2>
        <p className="mb-2 text-foreground/60">{t.topChampions.subtitle}</p>
        {top ? (
          <p className="mb-6 text-xs text-foreground/70">
            {t.topChampions.source} · {formatCount(top.provenance.titlesCounted, locale)}
          </p>
        ) : null}
        {top && top.items.length > 0 ? (
          <>
            <LegendsTopChart
              items={top.items.map((i) => ({ clubName: i.clubName, titles: i.titles }))}
              barLabel={t.topChampions.barLabel}
              ariaLabel={`${t.topChampions.chartAria} — ${top.items
                .map((i) => `${i.clubName}: ${formatCount(i.titles, locale)}`)
                .join(', ')}`}
            />
            <ul className="sr-only">
              {top.items.map((i) => (
                <li key={i.clubId}>
                  {i.clubName}: {formatCount(i.titles, locale)} {t.topChampions.titlesUnit}
                  {i.lastTitleYear === null
                    ? ` (${t.topChampions.noYear})`
                    : ` — ${i.lastTitleYear}`}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="rounded-xl border border-border bg-muted p-5 text-foreground/80">
            {t.topChampions.empty}
          </p>
        )}
      </section>

      {/* (b) RECORDES — cartões com valor, holder, data/competição e fonte. */}
      <section aria-labelledby="legends-records-title" className="mb-12">
        <h2 id="legends-records-title" className="mb-1 font-heading text-2xl font-bold sm:text-3xl">
          {t.records.title}
        </h2>
        <p className="mb-2 text-foreground/60">{t.records.subtitle}</p>
        {records ? (
          <p className="mb-6 text-xs text-foreground/70">
            {formatCount(records.provenance.matchesConsidered, locale)} {t.records.matchesUnit}
          </p>
        ) : null}
        {records && hasRecords ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {records.biggestWin ? (
              <RecordCard
                label={t.records.biggestWin}
                value={`${records.biggestWin.homeScore} × ${records.biggestWin.awayScore}`}
                sourceUrl={records.biggestWin.sourceUrl}
                sourceText={t.records.source}
              >
                <p className="font-semibold">
                  {records.biggestWin.homeClubName} × {records.biggestWin.awayClubName}
                </p>
                <p className="text-foreground/70">
                  {formatCount(records.biggestWin.margin, locale)} {t.records.goalDiff} ·{' '}
                  {formatDate(records.biggestWin.date, locale)}
                  {records.biggestWin.competitionName
                    ? ` · ${records.biggestWin.competitionName}`
                    : ''}
                  {records.biggestWin.seasonName ? ` · ${records.biggestWin.seasonName}` : ''}
                </p>
              </RecordCard>
            ) : null}
            {records.mostGoalsMatch ? (
              <RecordCard
                label={t.records.mostGoalsMatch}
                value={`${formatCount(records.mostGoalsMatch.totalGoals, locale)} ${t.records.goals}`}
                sourceUrl={records.mostGoalsMatch.sourceUrl}
                sourceText={t.records.source}
              >
                <p className="font-semibold">
                  {records.mostGoalsMatch.homeClubName} {records.mostGoalsMatch.homeScore} ×{' '}
                  {records.mostGoalsMatch.awayScore} {records.mostGoalsMatch.awayClubName}
                </p>
                <p className="text-foreground/70">
                  {formatDate(records.mostGoalsMatch.date, locale)}
                  {records.mostGoalsMatch.competitionName
                    ? ` · ${records.mostGoalsMatch.competitionName}`
                    : ''}
                  {records.mostGoalsMatch.seasonName
                    ? ` · ${records.mostGoalsMatch.seasonName}`
                    : ''}
                </p>
              </RecordCard>
            ) : null}
            {records.mostGoalsClubSeason ? (
              <RecordCard
                label={t.records.mostGoalsClubSeason}
                value={`${formatCount(records.mostGoalsClubSeason.goals, locale)} ${t.records.goals}`}
                sourceUrl={null}
                sourceText={t.records.source}
              >
                <p className="font-semibold">
                  <Link
                    href={`/clubs/${records.mostGoalsClubSeason.clubId}`}
                    className="text-primary-ink transition-colors duration-200 hover:opacity-80"
                  >
                    {records.mostGoalsClubSeason.clubName}
                  </Link>
                </p>
                <p className="text-foreground/70">
                  {t.records.season}: {records.mostGoalsClubSeason.seasonName ?? '—'} ·{' '}
                  {formatCount(records.mostGoalsClubSeason.matches, locale)} {t.records.matchesUnit}
                </p>
              </RecordCard>
            ) : null}
            {records.longestUnbeatenSeason ? (
              <RecordCard
                label={t.records.longestUnbeatenSeason}
                value={`${formatCount(records.longestUnbeatenSeason.length, locale)} ${t.records.matchesUnit}`}
                sourceUrl={null}
                sourceText={t.records.source}
              >
                <p className="font-semibold">
                  <Link
                    href={`/clubs/${records.longestUnbeatenSeason.clubId}`}
                    className="text-primary-ink transition-colors duration-200 hover:opacity-80"
                  >
                    {records.longestUnbeatenSeason.clubName}
                  </Link>
                </p>
                <p className="text-foreground/70">
                  {t.records.season}: {records.longestUnbeatenSeason.seasonName ?? '—'} ·{' '}
                  {formatDate(records.longestUnbeatenSeason.fromDate, locale)} –{' '}
                  {formatDate(records.longestUnbeatenSeason.toDate, locale)}
                </p>
              </RecordCard>
            ) : null}
          </div>
        ) : (
          <p className="rounded-xl border border-border bg-muted p-5 text-foreground/80">
            {t.records.empty}
          </p>
        )}
      </section>

      {/* (c) LÍDERES POR COMPETIÇÃO — tabela semântica. */}
      <section aria-labelledby="legends-leaders-title" className="mb-12">
        <h2 id="legends-leaders-title" className="mb-1 font-heading text-2xl font-bold sm:text-3xl">
          {t.leaders.title}
        </h2>
        <p className="mb-2 text-foreground/60">{t.leaders.subtitle}</p>
        {leaders && leaders.items.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <caption className="bg-muted px-4 py-2 text-left text-xs text-foreground/70">
                {t.leaders.caption} · {t.leaders.source}
              </caption>
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {t.leaders.colCompetition}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {t.leaders.colLeader}
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    {t.leaders.colTitles}
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaders.items.map((l) => (
                  <tr key={l.competitionId} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/competitions/${l.competitionId}`}
                        className="text-primary-ink transition-colors duration-200 hover:opacity-80"
                      >
                        {l.competitionName ?? l.competitionId}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/clubs/${l.leaderClubId}`}
                        className="transition-colors duration-200 hover:text-primary-ink"
                      >
                        {l.leaderClubName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCount(l.titles, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-xl border border-border bg-muted p-5 text-foreground/80">
            {t.leaders.empty}
          </p>
        )}
      </section>
    </div>
  );
}
