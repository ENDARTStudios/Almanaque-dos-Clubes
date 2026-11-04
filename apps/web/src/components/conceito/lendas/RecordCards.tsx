import Link from 'next/link';
import type { ReactNode } from 'react';
import SourceNote from '@/components/SourceNote';
import type { Locale } from '@/i18n/config';
import type { ConceitoLendasStrings } from '@/i18n/wsConceitoLendas';
import { formatCount, formatDate } from '@/lib/format';
import LendasSectionHeading from './SectionHeading';
import type { LegendsSummary } from './types';

/**
 * CARTÕES DE RECORDES — o bloco "Recordes" do quadro (borda de 1 px, número grande).
 *
 * Só renderiza o recorde que o payload traz. Cada número é o VALOR que a API apurou:
 * saldo da maior goleada, total de gols da partida, gols do clube na temporada e jogos de
 * invencibilidade. A partida/competição/temporada de onde o número saiu vem logo abaixo, e
 * o link da fonte só aparece quando `sourceUrl` existe — sem link inventado para "fonte".
 */
function RecordCard({
  testId,
  label,
  value,
  unit,
  children,
  sourceUrl,
  sourceLabel,
}: {
  testId: string;
  label: string;
  value: string;
  unit?: string;
  children: ReactNode;
  sourceUrl?: string | null;
  sourceLabel: string;
}) {
  return (
    <article
      role="listitem"
      data-testid={testId}
      className="flex min-h-[92px] flex-col rounded-[2px] border border-border bg-surface p-3.5"
    >
      <h3 className="text-[11px] leading-snug font-semibold text-ink-3">{label}</h3>
      <p className="num mt-2 text-[28px] leading-none text-foreground">
        {value}
        {unit ? (
          <span className="ml-1.5 font-body text-[11px] font-normal tracking-normal text-ink-2">
            {unit}
          </span>
        ) : null}
      </p>
      <div className="mt-2 text-[11px] leading-snug text-ink-2">{children}</div>
      {sourceUrl ? (
        <SourceNote
          href={sourceUrl}
          label={sourceLabel}
          data-testid={`${testId}-source`}
          ariaLabel={sourceLabel}
        />
      ) : null}
    </article>
  );
}

export default function RecordCards({
  records,
  locale,
  t,
}: {
  records: LegendsSummary['records'];
  locale: Locale;
  t: ConceitoLendasStrings;
}) {
  const { biggestWin, mostGoalsMatch, mostGoalsClubSeason, longestUnbeatenSeason } = records;
  const cards: ReactNode[] = [];

  if (biggestWin) {
    cards.push(
      <RecordCard
        key="biggest-win"
        testId="lendas-record-biggest-win"
        label={t.records.biggestWin}
        value={formatCount(biggestWin.margin, locale)}
        unit={t.records.marginUnit}
        sourceUrl={biggestWin.sourceUrl}
        sourceLabel={t.records.sourceLabel}
      >
        <p className="font-semibold text-foreground">
          {biggestWin.homeClubName} {biggestWin.homeScore} × {biggestWin.awayScore}{' '}
          {biggestWin.awayClubName}
        </p>
        <p className="mt-1 text-ink-3">
          {formatDate(biggestWin.date, locale)}
          {biggestWin.competitionName ? ` · ${biggestWin.competitionName}` : ''}
          {biggestWin.seasonName ? ` · ${biggestWin.seasonName}` : ''}
        </p>
      </RecordCard>,
    );
  }

  if (mostGoalsMatch) {
    cards.push(
      <RecordCard
        key="most-goals-match"
        testId="lendas-record-most-goals-match"
        label={t.records.mostGoalsMatch}
        value={formatCount(mostGoalsMatch.totalGoals, locale)}
        unit={t.records.goalsUnit}
        sourceUrl={mostGoalsMatch.sourceUrl}
        sourceLabel={t.records.sourceLabel}
      >
        <p className="font-semibold text-foreground">
          {mostGoalsMatch.homeClubName} {mostGoalsMatch.homeScore} × {mostGoalsMatch.awayScore}{' '}
          {mostGoalsMatch.awayClubName}
        </p>
        <p className="mt-1 text-ink-3">
          {formatDate(mostGoalsMatch.date, locale)}
          {mostGoalsMatch.competitionName ? ` · ${mostGoalsMatch.competitionName}` : ''}
          {mostGoalsMatch.seasonName ? ` · ${mostGoalsMatch.seasonName}` : ''}
        </p>
      </RecordCard>,
    );
  }

  if (mostGoalsClubSeason) {
    cards.push(
      <RecordCard
        key="most-goals-club-season"
        testId="lendas-record-most-goals-club-season"
        label={t.records.mostGoalsClubSeason}
        value={formatCount(mostGoalsClubSeason.goals, locale)}
        unit={t.records.goalsUnit}
        sourceLabel={t.records.sourceLabel}
      >
        <p className="font-semibold">
          <Link
            href={`/clubs/${mostGoalsClubSeason.clubId}`}
            className="inline-flex min-h-6 items-center text-foreground underline decoration-border decoration-dotted underline-offset-2 transition-colors duration-200 hover:text-primary-ink"
          >
            {mostGoalsClubSeason.clubName}
          </Link>
        </p>
        <p className="mt-1 text-ink-3">
          {mostGoalsClubSeason.seasonName
            ? `${t.records.seasonLabel}: ${mostGoalsClubSeason.seasonName}`
            : `${t.records.seasonLabel}: —`}
          {' · '}
          {formatCount(mostGoalsClubSeason.matches, locale)} {t.records.matchesUnit}
        </p>
      </RecordCard>,
    );
  }

  if (longestUnbeatenSeason) {
    cards.push(
      <RecordCard
        key="longest-unbeaten-season"
        testId="lendas-record-longest-unbeaten-season"
        label={t.records.longestUnbeatenSeason}
        value={formatCount(longestUnbeatenSeason.length, locale)}
        unit={t.records.matchesUnit}
        sourceLabel={t.records.sourceLabel}
      >
        <p className="font-semibold">
          <Link
            href={`/clubs/${longestUnbeatenSeason.clubId}`}
            className="inline-flex min-h-6 items-center text-foreground underline decoration-border decoration-dotted underline-offset-2 transition-colors duration-200 hover:text-primary-ink"
          >
            {longestUnbeatenSeason.clubName}
          </Link>
        </p>
        <p className="mt-1 text-ink-3">
          {longestUnbeatenSeason.seasonName
            ? `${t.records.seasonLabel}: ${longestUnbeatenSeason.seasonName}`
            : `${t.records.seasonLabel}: —`}
          {' · '}
          {formatDate(longestUnbeatenSeason.fromDate, locale)} –{' '}
          {formatDate(longestUnbeatenSeason.toDate, locale)}
        </p>
      </RecordCard>,
    );
  }

  if (cards.length === 0) return null;

  return (
    <section aria-labelledby="lendas-recordes-title" className="mt-12">
      <LendasSectionHeading id="lendas-recordes-title" tone="crimson">
        {t.records.heading}
      </LendasSectionHeading>
      <div
        role="list"
        data-testid="lendas-records"
        aria-label={t.records.listLabel}
        className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4"
      >
        {cards}
      </div>
    </section>
  );
}
