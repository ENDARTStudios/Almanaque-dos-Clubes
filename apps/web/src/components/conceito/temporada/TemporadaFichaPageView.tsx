import Link from 'next/link';

import DataTable from '@/components/ficha/DataTable';
import FichaHead from '@/components/ficha/FichaHead';
import Pillar from '@/components/ficha/Pillar';
import SectionHeading from '@/components/ficha/SectionHeading';
import { EmptyState, ErrorState } from '@/components/ficha/States';
import { Donut, Line } from '@/components/ficha/Charts';
import SourceNote from '@/components/SourceNote';
import type { Locale } from '@/i18n/config';
import { formatCount } from '@/lib/format';
import { rotuloDaSituacao, temporadasStrings } from '@/i18n/wsTemporadas';
import {
  conceitoTemporadaStrings,
  fillTemporada,
  type ConceitoTemporadaStrings,
} from '@/i18n/wsConceitoTemporada';
import type { MilestoneKind, MatchReference, RoundSeries, SeasonMetrics } from './derive';
import {
  GAP,
  buildCompetitionRows,
  computeSeasonMetrics,
  formatAverage,
  formatGoalDifference,
  formatMatchDate,
  formatMonthShort,
  goalsByRound,
  groupCompetitions,
  pickStandingsCompetition,
  resultsDistribution,
  seasonMilestones,
  standingsFor,
  type CompetitionGroup,
} from './derive';
import type { SeasonCompetition, SeasonMatch, SeasonSummary } from './types';

/**
 * FICHA DA TEMPORADA no conceito FICHA — composição do quadro app/temporada.png.
 *
 * ── ORDEM DO QUADRO ─────────────────────────────────────────────────────────────────────────
 * cabeçalho (h1 "Temporada {rótulo}", número-âncora de rodadas e CTA de partidas) · faixa de
 * métricas · competições da temporada · classificação final de uma competição · gráficos ·
 * linha do tempo · procedência no pé.
 *
 * ── ADAPTAÇÃO HONESTA ───────────────────────────────────────────────────────────────────────
 * O quadro desenha 1.842 partidas, 4.988 gols, 12,4 mi de público, 112 placares 0 a 0 e uma
 * goleada de 9 × 0. Nada disso é copiado: as métricas são DERIVADAS das partidas do acervo
 * (computeSeasonMetrics), a tabela vem da fonte quando catalogada e das partidas quando não.
 * Bloco sem dado NÃO é desenhado:
 *
 *   · PÚBLICO — o acervo não publica público por partida; a métrica e o gráfico por mês não
 *     existem, e a procedência declara a lacuna (o quadro tem os dois);
 *   · ÚLTIMOS 5 — a fonte não publica a coluna de forma; a tabela termina em Pts;
 *   · ARTILHEIRO/CAMPEÃO — só entram quando catalogados (ou, para liga, o campeão por pontos
 *     derivado das partidas, com o método declarado na nota);
 *   · competição que não é liga não recebe "classificação final".
 *
 * ── ESTILO ──────────────────────────────────────────────────────────────────────────────────
 * raio 2px, borda 1px, sem sombra; texto de destaque em text-primary-ink; metadado 11px em
 * text-ink-3; número de tabela à direita com tabular-nums; nenhuma transição genérica e nenhuma
 * curva de entrada (régua motion-craft).
 */

export interface TemporadaFichaPageViewProps {
  locale: Locale;
  season: SeasonSummary;
  /** null = a consulta das partidas FALHOU. Diferente de [] (temporada sem partidas). */
  matches: SeasonMatch[] | null;
  /**
   * Total declarado pela consulta. Maior que matches.length significa paginação incompleta —
   * a página declara o corte em vez de apresentar o agregado como completo.
   */
  declaredTotal?: number | null;
  /** Resumo catalogado por competição. Falha em uma não derruba as outras. */
  competitionDetails?: SeasonCompetition[];
  /** Destino das partidas da temporada — CTA preservado de /matches?seasonId=. */
  matchesHref: string;
}

/** Linhas da tabela de classificação exibidas no quadro (o restante fica no link). */
const STANDINGS_ROWS = 5;

/** Cores do dado na mesma ordem do Donut do sistema (viz-1, viz-2, viz-3). */
const LEGEND_COLORS = ['var(--color-viz-1)', 'var(--color-viz-2)', 'var(--color-viz-3)'];

/** "2 competições" / "1 competição" no idioma, com contagem formatada. */
function competitionsLabel(count: number, locale: Locale, t: ConceitoTemporadaStrings): string {
  return fillTemporada(count === 1 ? t.subtitle.competitionsOne : t.subtitle.competitionsMany, {
    n: formatCount(count, locale),
  });
}

function subtitleFor(
  season: SeasonSummary,
  metrics: SeasonMetrics | null,
  competitions: SeasonCompetition[],
  locale: Locale,
  t: ConceitoTemporadaStrings,
): string | undefined {
  const parts: string[] = [rotuloDaSituacao(season.status, locale)];

  const range =
    metrics?.firstMatch && metrics.lastMatch
      ? formatMatchDate(metrics.firstMatch.date, locale) +
        ' — ' +
        formatMatchDate(metrics.lastMatch.date, locale)
      : season.startDate || season.endDate
        ? [season.startDate, season.endDate]
            .filter((date): date is string => Boolean(date))
            .map((date) => formatMatchDate(date, locale))
            .join(' — ')
        : null;
  if (range) parts.push(range);

  if (competitions.length > 0) parts.push(competitionsLabel(competitions.length, locale, t));

  return parts.join(' · ');
}

function milestoneTitle(kind: MilestoneKind, t: ConceitoTemporadaStrings): string {
  switch (kind) {
    case 'opening':
      return t.timeline.opening;
    case 'biggestWin':
      return t.timeline.biggestWin;
    case 'highestScoring':
      return t.timeline.highestScoring;
    case 'closing':
      return t.timeline.closing;
  }
}

function milestoneFact(match: MatchReference, t: ConceitoTemporadaStrings): string {
  const home = match.homeName ?? GAP;
  const away = match.awayName ?? GAP;
  if (match.homeScore == null || match.awayScore == null) {
    return fillTemporada(t.timeline.matchFact, { home, away });
  }
  return fillTemporada(t.timeline.scoreFact, {
    home,
    away,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
  });
}

function MetricsSection({
  metrics,
  locale,
  t,
}: {
  metrics: SeasonMetrics;
  locale: Locale;
  t: ConceitoTemporadaStrings;
}) {
  const items: Array<{
    key: string;
    label: string;
    value: string;
    note?: string;
    accent?: boolean;
  }> = [
    {
      key: 'matches',
      label: t.metrics.matches,
      value: formatCount(metrics.total, locale),
    },
  ];

  if (metrics.scored > 0 && metrics.average != null) {
    items.push({
      key: 'goals',
      label: t.metrics.goals,
      value: formatCount(metrics.goals, locale),
      accent: true,
    });
    items.push({
      key: 'average',
      label: t.metrics.average,
      value: formatAverage(metrics.average, locale),
      note: t.metrics.averageNote,
    });
    items.push({
      key: 'goalless',
      label: t.metrics.goalless,
      value: formatCount(metrics.goalless, locale),
    });
  }

  const biggestWin = metrics.biggestWin;
  if (biggestWin && biggestWin.homeScore != null && biggestWin.awayScore != null) {
    items.push({
      key: 'biggest-win',
      label: t.metrics.biggestWin,
      value: fillTemporada(t.metrics.score, {
        homeScore: biggestWin.homeScore,
        awayScore: biggestWin.awayScore,
      }),
      note: formatMatchDate(biggestWin.date, locale),
    });
  }

  return (
    <section
      data-testid="temporada-pillars"
      aria-label={t.metrics.heading}
      className="mt-8 border-t-2 border-foreground pt-6"
    >
      {/* div, e não dl: o Pillar é um bloco de display (rótulo + número grande), não um par
          dt/dd — dl sem dt/dd é semântica falsa para leitor de tela. */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((item) => (
          <div key={item.key} data-testid={'temporada-pillar-' + item.key}>
            <Pillar label={item.label} value={item.value} note={item.note} accent={item.accent} />
          </div>
        ))}
      </div>
      {metrics.scored === 0 ? <SourceNote label={t.metrics.noScoresNote} /> : null}
    </section>
  );
}

function CompetitionsSection({
  competitions,
  matches,
  seasonName,
  locale,
  t,
}: {
  competitions: SeasonCompetition[];
  matches: SeasonMatch[];
  seasonName: string;
  locale: Locale;
  t: ConceitoTemporadaStrings;
}) {
  const { rows, derivedChampion } = buildCompetitionRows(competitions, matches);
  if (rows.length === 0) return null;

  return (
    <section
      data-testid="temporada-competitions"
      aria-labelledby="temporada-competitions-heading"
      className="mt-10 border-t border-border pt-5"
    >
      <SectionHeading
        id="temporada-competitions-heading"
        aside={competitionsLabel(rows.length, locale, t)}
      >
        {t.competitions.heading}
      </SectionHeading>
      <DataTable
        caption={fillTemporada(t.competitions.caption, { season: seasonName })}
        emphasisRows={rows.length}
        columns={[
          { header: t.competitions.columns.competition, align: 'left' },
          { header: t.competitions.columns.champion, align: 'left' },
          { header: t.competitions.columns.points, align: 'right' },
          { header: t.competitions.columns.played, align: 'right' },
          { header: t.competitions.columns.topScorer, align: 'left' },
        ]}
        rows={rows.map((row) => [
          <Link
            key={'competition-' + row.id}
            href={'/competitions/' + row.id}
            className="inline-flex min-h-6 items-center text-primary-ink hover:underline"
          >
            {row.name}
          </Link>,
          <span key={'champion-' + row.id}>{row.champion ?? GAP}</span>,
          <span key={'points-' + row.id}>
            {row.points != null ? formatCount(row.points, locale) : GAP}
          </span>,
          <span key={'played-' + row.id}>
            {row.played != null ? formatCount(row.played, locale) : GAP}
          </span>,
          <span key={'top-scorer-' + row.id} className="[font-variant-numeric:tabular-nums]">
            {row.topScorer
              ? fillTemporada(t.competitions.topScorer, {
                  name: row.topScorer.name,
                  goals: formatCount(row.topScorer.goals, locale),
                })
              : GAP}
          </span>,
        ])}
      />
      {derivedChampion ? <SourceNote label={t.competitions.derivedChampionNote} /> : null}
    </section>
  );
}

function StandingsSection({
  competition,
  matches,
  seasonName,
  locale,
  t,
  matchesHref,
}: {
  competition: SeasonCompetition;
  matches: SeasonMatch[];
  seasonName: string;
  locale: Locale;
  t: ConceitoTemporadaStrings;
  matchesHref: string;
}) {
  const standings = standingsFor(competition, matches);
  if (!standings) return null;

  const shown = standings.entries.slice(0, STANDINGS_ROWS);
  const fullTableHref = '/competitions/' + competition.id + '?tab=temporadas';
  const fullMatchesHref = matchesHref + '&competitionId=' + encodeURIComponent(competition.id);
  const asideLink =
    standings.source === 'official'
      ? { href: fullTableHref, label: t.standings.viewFullTable }
      : { href: fullMatchesHref, label: t.standings.viewMatches };

  const numberCell = (value: number | null, position: number) => (
    <span key={'num-' + position}>{value != null ? formatCount(value, locale) : GAP}</span>
  );

  return (
    <section
      data-testid="temporada-standings"
      aria-labelledby="temporada-standings-heading"
      className="mt-10 border-t border-border pt-5"
    >
      <SectionHeading
        id="temporada-standings-heading"
        aside={
          <>
            <span>
              {fillTemporada(t.standings.rowsAside, {
                shown: formatCount(shown.length, locale),
                total: formatCount(standings.entries.length, locale),
              })}
            </span>
            <span aria-hidden="true"> · </span>
            <Link
              href={asideLink.href}
              className="inline-flex min-h-6 items-center text-primary-ink underline decoration-dotted underline-offset-2"
            >
              {asideLink.label}
            </Link>
          </>
        }
      >
        {fillTemporada(t.standings.heading, { competition: competition.name })}
      </SectionHeading>
      <DataTable
        caption={fillTemporada(t.standings.caption, {
          competition: competition.name,
          season: seasonName,
        })}
        emphasisRows={1}
        columns={[
          { header: t.standings.columns.position, align: 'right' },
          { header: t.standings.columns.club, align: 'left' },
          { header: t.standings.columns.played, align: 'right' },
          { header: t.standings.columns.won, align: 'right' },
          { header: t.standings.columns.drawn, align: 'right' },
          { header: t.standings.columns.lost, align: 'right' },
          { header: t.standings.columns.goalDifference, align: 'right' },
          { header: t.standings.columns.points, align: 'right' },
        ]}
        rows={shown.map((entry) => [
          <span key={'position-' + entry.position}>{entry.position}</span>,
          entry.clubId ? (
            <Link
              key={'club-' + entry.position}
              href={'/clubs/' + entry.clubId}
              className="inline-flex min-h-6 items-center font-medium text-foreground hover:text-primary-ink hover:underline"
            >
              {entry.clubName ?? GAP}
            </Link>
          ) : (
            <span key={'club-' + entry.position}>{entry.clubName ?? GAP}</span>
          ),
          numberCell(entry.played, entry.position),
          numberCell(entry.won, entry.position),
          numberCell(entry.drawn, entry.position),
          numberCell(entry.lost, entry.position),
          <span key={'goal-difference-' + entry.position}>
            {formatGoalDifference(entry.goalDifference)}
          </span>,
          numberCell(entry.points, entry.position),
        ])}
      />
      <SourceNote
        label={standings.source === 'official' ? t.standings.officialNote : t.standings.derivedNote}
      />
    </section>
  );
}

function ResultsFigure({
  results,
  locale,
  t,
}: {
  results: { homeWins: number; draws: number; awayWins: number; total: number };
  locale: Locale;
  t: ConceitoTemporadaStrings;
}) {
  const data = [
    { label: t.charts.homeWin, value: results.homeWins },
    { label: t.charts.draw, value: results.draws },
    { label: t.charts.awayWin, value: results.awayWins },
  ].filter((slice) => slice.value > 0);

  return (
    <figure data-testid="temporada-chart-results">
      <figcaption className="text-[11px] font-semibold text-ink-2">{t.charts.results}</figcaption>
      <div className="mt-2 flex flex-wrap items-center gap-5">
        <Donut
          data={data}
          size={120}
          thickness={16}
          title={t.charts.results}
          summary={fillTemporada(t.charts.resultsSummary, {
            home: formatCount(results.homeWins, locale),
            draws: formatCount(results.draws, locale),
            away: formatCount(results.awayWins, locale),
            total: formatCount(results.total, locale),
          })}
        />
        <ul className="space-y-1.5">
          {data.map((slice, index) => (
            <li key={slice.label} className="flex items-center gap-2 text-[11px] text-ink-2">
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-[1px]"
                style={{ backgroundColor: LEGEND_COLORS[index] }}
              />
              <span>{slice.label}</span>
              <span className="num ml-1 text-[12px] text-foreground">
                {formatCount(slice.value, locale)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}

function ChartsSection({
  groups,
  matches,
  locale,
  t,
}: {
  groups: CompetitionGroup[];
  matches: SeasonMatch[];
  locale: Locale;
  t: ConceitoTemporadaStrings;
}) {
  const series = groups
    .map((group) => ({ group, series: goalsByRound(matches, group.id) }))
    .filter(
      (item): item is { group: CompetitionGroup; series: RoundSeries } =>
        item.series != null && item.series.points.length >= 2,
    );
  const results = resultsDistribution(matches);

  if (series.length === 0 && !results) return null;

  return (
    <section
      data-testid="temporada-charts"
      aria-labelledby="temporada-charts-heading"
      className="mt-10 border-t border-border pt-5"
    >
      <SectionHeading id="temporada-charts-heading">{t.charts.heading}</SectionHeading>
      <div className="mt-4 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {series.map(({ group, series: roundSeries }) => {
          const title = fillTemporada(t.charts.goalsByRound, { competition: group.name });
          return (
            <figure key={group.id} data-testid={'temporada-chart-rounds-' + group.id}>
              <figcaption className="text-[11px] font-semibold text-ink-2">{title}</figcaption>
              <div className="mt-2">
                <Line
                  data={roundSeries.points}
                  title={title}
                  summary={fillTemporada(t.charts.goalsByRoundSummary, {
                    competition: group.name,
                    goals: formatCount(roundSeries.totalGoals, locale),
                    rounds: roundSeries.rounds,
                    bestRound: roundSeries.best?.label ?? GAP,
                    best: formatCount(roundSeries.best?.value ?? 0, locale),
                  })}
                />
              </div>
              {roundSeries.average != null ? (
                <p className="mt-2 text-[11px] text-ink-3">
                  {fillTemporada(t.charts.averagePerMatch, {
                    average: formatAverage(roundSeries.average, locale),
                  })}
                </p>
              ) : null}
            </figure>
          );
        })}
        {results ? <ResultsFigure results={results} locale={locale} t={t} /> : null}
      </div>
    </section>
  );
}

function TimelineSection({
  metrics,
  locale,
  t,
}: {
  metrics: SeasonMetrics;
  locale: Locale;
  t: ConceitoTemporadaStrings;
}) {
  const milestones = seasonMilestones(metrics);
  if (milestones.length === 0) return null;

  return (
    <section
      data-testid="temporada-timeline"
      aria-labelledby="temporada-timeline-heading"
      className="mt-10 border-t border-border pt-5"
    >
      <SectionHeading id="temporada-timeline-heading">{t.timeline.heading}</SectionHeading>
      <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {milestones.map((milestone) => (
          <li
            key={milestone.kind + '-' + milestone.match.id}
            data-testid={'temporada-milestone-' + milestone.kind}
          >
            <p className="font-heading text-2xl font-bold uppercase leading-none text-primary-ink">
              {formatMonthShort(milestone.match.date, locale)}
            </p>
            <div className="mt-3 h-px w-full bg-border" aria-hidden="true" />
            <p className="mt-3 text-[12px] font-semibold text-foreground">
              {milestoneTitle(milestone.kind, t)}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-ink-2">
              {milestoneFact(milestone.match, t)}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ProvenanceFooter({
  metrics,
  declaredTotal,
  locale,
  t,
}: {
  metrics: SeasonMetrics | null;
  declaredTotal: number | null;
  locale: Locale;
  t: ConceitoTemporadaStrings;
}) {
  const seasonStrings = temporadasStrings[locale];
  const partial = metrics != null && declaredTotal != null && declaredTotal > metrics.total;

  return (
    <footer data-testid="temporada-provenance" className="mt-12 border-t-2 border-foreground pt-4">
      <h2 className="sr-only">{t.provenance.heading}</h2>
      <SourceNote label={t.provenance.season} />
      <SourceNote label={seasonStrings.provenance} />
      {metrics && metrics.scored > 0 ? (
        <SourceNote
          label={fillTemporada(t.provenance.counts, {
            scored: formatCount(metrics.scored, locale),
            total: formatCount(metrics.total, locale),
          })}
        />
      ) : null}
      {partial ? (
        <SourceNote
          label={fillTemporada(t.provenance.partial, {
            fetched: formatCount(metrics.total, locale),
            total: formatCount(declaredTotal, locale),
          })}
        />
      ) : null}
      <SourceNote label={t.provenance.noAttendance} />
      <SourceNote label={t.provenance.gap} />
    </footer>
  );
}

export default function TemporadaFichaPageView({
  locale,
  season,
  matches,
  declaredTotal = null,
  competitionDetails = [],
  matchesHref,
}: TemporadaFichaPageViewProps) {
  const t = conceitoTemporadaStrings[locale];

  const metrics = matches ? computeSeasonMetrics(matches) : null;
  const groups = matches ? groupCompetitions(matches) : [];
  const detailById = new Map(competitionDetails.map((detail) => [detail.id, detail] as const));
  const competitions: SeasonCompetition[] = groups.map((group) => {
    const detail = detailById.get(group.id);
    return {
      id: group.id,
      name: group.name,
      type: detail?.type ?? null,
      country: detail?.country ?? null,
      season: detail?.season ?? null,
    };
  });

  const subtitle = subtitleFor(season, metrics, competitions, locale, t);
  const rounds = metrics?.rounds ?? 0;
  const anchor = rounds > 0 ? String(rounds) : undefined;
  const anchorLabel =
    rounds > 0
      ? [
          rounds === 1 ? t.anchor.roundOne : t.anchor.roundsMany,
          competitions.length > 0 ? competitionsLabel(competitions.length, locale, t) : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : undefined;

  const standingsCompetition =
    matches && competitions.length > 0 ? pickStandingsCompetition(competitions, matches) : null;

  return (
    <div data-testid="temporada-ficha" className="pb-16">
      <FichaHead
        title={fillTemporada(t.title, { season: season.name })}
        subtitle={subtitle}
        anchor={anchor}
        anchorLabel={anchorLabel}
        actions={
          <Link
            href={matchesHref}
            className="inline-flex min-h-9 items-center rounded-[2px] border border-border bg-surface px-4 text-[13px] font-semibold text-foreground transition-colors duration-200 hover:border-primary/60 hover:text-primary-ink"
          >
            {t.actions.viewMatches}
          </Link>
        }
      />

      {matches === null ? (
        <div className="mt-8">
          <ErrorState
            title={t.states.errorTitle}
            body={t.states.errorBody}
            retryLabel={t.states.retry}
            retryHref={'/temporadas/' + season.id}
          />
        </div>
      ) : matches.length === 0 ? (
        <div className="mt-8">
          <EmptyState title={t.states.noMatchesTitle} body={t.states.noMatchesBody} />
        </div>
      ) : (
        <>
          {metrics ? <MetricsSection metrics={metrics} locale={locale} t={t} /> : null}
          <CompetitionsSection
            competitions={competitions}
            matches={matches}
            seasonName={season.name}
            locale={locale}
            t={t}
          />
          {standingsCompetition && matches ? (
            <StandingsSection
              competition={standingsCompetition}
              matches={matches}
              seasonName={season.name}
              locale={locale}
              t={t}
              matchesHref={matchesHref}
            />
          ) : null}
          <ChartsSection groups={groups} matches={matches} locale={locale} t={t} />
          {metrics ? <TimelineSection metrics={metrics} locale={locale} t={t} /> : null}
        </>
      )}

      <ProvenanceFooter metrics={metrics} declaredTotal={declaredTotal} locale={locale} t={t} />
    </div>
  );
}
