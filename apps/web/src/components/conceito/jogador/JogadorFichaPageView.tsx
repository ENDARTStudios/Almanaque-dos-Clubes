import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';

import FichaHead from '@/components/ficha/FichaHead';
import Pillar from '@/components/ficha/Pillar';
import SectionHeading from '@/components/ficha/SectionHeading';
import { EmptyState } from '@/components/ficha/States';
import SourceNote from '@/components/SourceNote';
import { CountryFlag } from '@/components/CountryFlag';
import SocialLinks from '@/components/SocialLinks';
import { PlayerPositionIcon } from '@/components/icons';
import { getDictionary } from '@/i18n/getDictionary';
import type { Locale } from '@/i18n/config';
import { positionLabel, wIconsStrings } from '@/i18n/wsIcons';
import { fichaStrings } from '@/i18n/wsFicha';
import { conceitoJogadorStrings, fillJogador } from '@/i18n/wsConceitoJogador';
import { countryLabel } from '@/lib/country-flag';
import { formatCount, formatDate } from '@/lib/format';
import {
  formatAverage,
  formatYears,
  goalsPerGame,
  groupAchievements,
  groupAwards,
  groupCareerByClub,
  seasonSpanLabel,
  stintsWithGoals,
} from './derive';
import type { JogadorIdentity, JogadorPhoto, JogadorProfile } from './types';

/**
 * FICHA DE JOGADOR no conceito FICHA — composição do quadro `jogador-migrado`.
 *
 * ── ORDEM DO QUADRO ─────────────────────────────────────────────────────────────────────────
 * kicker ("Jogador · posição · país") · nome completo · subtítulo (apelido, nascimento, clube) ·
 * retrato em moldura com licença REAL · faixa de pilares · carreira por clube · gols por
 * passagem · conquistas · prêmios individuais · clubes · ficha técnica · procedência no pé.
 *
 * ── ADAPTAÇÃO HONESTA ───────────────────────────────────────────────────────────────────────
 * O quadro desenha números ilustrativos (1.363 jogos, 1.279 gols, 0,94 de média, 37 títulos e
 * passagens como "Santos 1956–58 · 3 temporadas"). Nada disso é copiado: cada número sai de
 * `GET /players/:id` (identidade, retrato, licença, prêmios) e do `profile` (carreira,
 * conquistas, clubes, métricas). Bloco sem dado NÃO é renderizado — não existe "0" decorativo
 * nem passagem inventada. O que a fonte não publica vira lacuna DECLARADA ("—" e nota).
 *
 * ── O QUE O QUADRO PEDE E A API NÃO PUBLICA ────────────────────────────────────────────────
 * A coluna "Temporadas" do desenho é uma CONTAGEM; o acervo publica o PERÍODO (ano final
 * opcional), então a célula mostra as temporadas reais ("1956–1958") e não um número derivado
 * de uma faixa. Gols/jogo só aparece quando há jogos e gols na mesma passagem.
 *
 * ── ESTILO ──────────────────────────────────────────────────────────────────────────────────
 * raio 2px, borda 1px, sem sombra; número à direita com `tabular-nums`; metadado em
 * `text-ink-3` 11px; texto de destaque em `text-primary-ink`; nenhuma transição genérica e
 * nenhuma curva de entrada (régua `motion-craft`).
 */
export interface JogadorFichaPageViewProps {
  locale: Locale;
  player: JogadorIdentity;
  photo: JogadorPhoto;
  profile: JogadorProfile | null;
  /** Ação da página (favoritar) — Client Component passado pelo Server Component. */
  actions?: ReactNode;
}

/** Traço de lacuna declarada. Não é texto traduzível: é o sinal universal de ausência. */
const GAP = '—';

const SECTION = 'mt-8 border-t border-border pt-5';
const HEADER_CELL =
  'border-b-2 border-foreground pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3';
const CELL = 'border-b border-border/70 py-2 align-middle text-[13px] leading-5';
const NUM_CELL = [CELL, 'text-right [font-variant-numeric:tabular-nums]'].join(' ');
const ROW_TINT = 'bg-surface-2';

/** Junta classes sem dependência — mesma ideia dos componentes do sistema. */
function cls(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.12em] text-ink-3">{label}</dt>
      <dd className="mt-0.5 text-[13px] font-medium text-foreground">{value}</dd>
    </div>
  );
}

function PortraitFrame({
  player,
  photo,
  locale,
}: {
  player: JogadorIdentity;
  photo: JogadorPhoto;
  locale: Locale;
}) {
  const t = conceitoJogadorStrings[locale];
  const ic = wIconsStrings[locale];
  const position = positionLabel(locale, player.position) ?? player.position ?? null;
  const illustration = position
    ? ic.playerPhotoWithPosition.replace('{position}', position)
    : ic.playerPhoto;
  const alt = fillJogador(t.head.photoAlt, { name: player.fullName });
  const words = player.fullName.trim().split(/\s+/).filter(Boolean);
  const initials =
    words.length >= 2
      ? (words[0]?.charAt(0) ?? '') + (words[words.length - 1]?.charAt(0) ?? '')
      : player.fullName.slice(0, 2);

  return (
    <figure className="shrink-0" data-testid="player-photo-frame">
      <div className="flex h-[260px] w-[200px] items-center justify-center overflow-hidden rounded-[2px] border border-border bg-surface p-2">
        {photo.url ? (
          // O host do Commons varia por arquivo; o clube usa <img> pelo mesmo motivo.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.url}
            alt={alt}
            width={200}
            height={260}
            loading="lazy"
            data-testid="player-photo"
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            data-testid="player-photo-fallback"
            aria-hidden="true"
            className="flex flex-col items-center gap-3 text-ink-3"
          >
            <PlayerPositionIcon position={player.position} size={64} />
            <span className="font-heading text-2xl font-bold leading-none tracking-[-0.02em]">
              {initials.toUpperCase()}
            </span>
          </span>
        )}
      </div>
      <figcaption className="mt-2 w-[200px] text-center">
        {photo.url ? (
          photo.license ? (
            <SourceNote
              href={photo.sourceUrl}
              label={photo.license}
              detail={photo.author ?? undefined}
              prefixoAcessivel={t.head.photoSourcePrefix}
            />
          ) : (
            <span
              className="text-[11px] leading-snug text-ink-3"
              data-testid="player-photo-license"
            >
              {t.head.photoLicenseUnknown}
            </span>
          )
        ) : (
          <p
            className="text-[11px] leading-snug text-ink-3"
            data-testid="player-photo-illustration"
          >
            {illustration}
          </p>
        )}
      </figcaption>
    </figure>
  );
}

export default function JogadorFichaPageView({
  locale,
  player,
  photo,
  profile,
  actions,
}: JogadorFichaPageViewProps) {
  const t = conceitoJogadorStrings[locale];
  const pp = getDictionary(locale).pages.playerProfile;
  const states = fichaStrings[locale].states;

  const position = positionLabel(locale, player.position) ?? player.position ?? null;
  const country = countryLabel(player.country, locale);
  const kicker = [t.kicker, position, country].filter(Boolean).join(' · ');

  const birthDate = player.birthDate ? formatDate(player.birthDate, locale) : null;
  const birthValue =
    birthDate && player.age != null
      ? birthDate + ' · ' + pp.ageYears.replace('{age}', String(player.age))
      : birthDate;

  const aka = player.nickname ?? null;
  const shortName = player.shortName ?? null;
  const akaLabel =
    aka && shortName && aka !== shortName ? aka + ' (' + shortName + ')' : (aka ?? shortName);

  const footLabel =
    player.preferredFoot === 'left'
      ? pp.footLeft
      : player.preferredFoot === 'right'
        ? pp.footRight
        : player.preferredFoot === 'both'
          ? pp.footBoth
          : null;

  const subtitleParts: ReactNode[] = [];
  if (akaLabel) subtitleParts.push(akaLabel);
  if (birthValue) subtitleParts.push(birthValue);
  if (profile?.currentClub) {
    subtitleParts.push(
      <Link
        key="subtitle-current-club"
        href={'/clubs/' + profile.currentClub.id}
        className="text-primary-ink underline decoration-dotted underline-offset-2 hover:decoration-solid"
      >
        {profile.currentClub.name}
      </Link>,
    );
  }
  const subtitle =
    subtitleParts.length > 0 ? (
      <>
        {subtitleParts.map((part, index) => (
          <Fragment key={index}>
            {index > 0 ? ' · ' : null}
            {part}
          </Fragment>
        ))}
      </>
    ) : undefined;

  const careerRows = profile ? groupCareerByClub(profile.career) : [];
  const careerSource = profile?.career ?? [];
  const showCareerApps = careerSource.some((row) => row.apps != null);
  const showCareerGoals = careerSource.some((row) => row.goals != null);
  const showCareerAverage = careerRows.some((row) => row.average != null);

  const stintRows = profile ? stintsWithGoals(profile.career) : [];
  const showStints = stintRows.length >= 2;
  const showStintApps = stintRows.some((row) => row.apps != null);

  const achievementRows = profile ? groupAchievements(profile.achievements) : [];
  const awardRows = profile ? groupAwards(profile.individualAwards) : [];
  const hasAchievements = (profile?.achievements.length ?? 0) > 0;
  const hasAwards = (profile?.individualAwards.length ?? 0) > 0;
  const hasClubs = (profile?.clubs.length ?? 0) > 0;
  const clubPeriods = new Map(careerRows.map((row) => [row.clubId, row.periods]));

  const pillars: Array<{ key: string; label: string; value: string; note: string }> = [];
  if (profile) {
    const metrics = profile.metrics;
    if (metrics.totalApps > 0) {
      pillars.push({
        key: 'apps',
        label: pp.apps,
        value: formatCount(metrics.totalApps, locale),
        note: t.pillars.appsNote,
      });
    }
    if (metrics.totalGoals > 0) {
      pillars.push({
        key: 'goals',
        label: pp.goals,
        value: formatCount(metrics.totalGoals, locale),
        note: t.pillars.goalsNote,
      });
    }
    if (metrics.totalApps > 0 && metrics.totalGoals > 0) {
      pillars.push({
        key: 'average',
        label: t.pillars.average,
        value: formatAverage(metrics.totalGoals / metrics.totalApps, locale) ?? GAP,
        note: t.pillars.averageNote,
      });
    }
    if (metrics.titlesCount > 0) {
      pillars.push({
        key: 'titles',
        label: pp.metricTitles,
        value: formatCount(metrics.titlesCount, locale),
        note: t.pillars.titlesNote,
      });
    }
  }

  return (
    <div className="pb-16">
      <p className="text-[11px] font-semibold uppercase leading-none tracking-[0.2em] text-ink-3">
        {kicker}
      </p>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-[16rem] flex-1">
          <FichaHead title={player.fullName} subtitle={subtitle} actions={actions} />
        </div>
        <PortraitFrame player={player} photo={photo} locale={locale} />
      </div>

      {pillars.length > 0 ? (
        <section
          className="mt-6 border-t-2 border-foreground pt-5"
          data-testid="player-pillars"
          aria-label={pp.metricsTitle}
        >
          <dl className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
            {pillars.map((pillar) => (
              <div key={pillar.key} data-testid={'player-pillar-' + pillar.key}>
                <Pillar
                  label={pillar.label}
                  value={pillar.value}
                  note={pillar.note || undefined}
                  accent={pillar.key === 'goals'}
                />
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <section className={SECTION} data-testid="player-career" aria-label={pp.careerTitle}>
        <SectionHeading>{pp.careerTitle}</SectionHeading>
        {careerRows.length > 0 ? (
          <>
            <div
              className="overflow-x-auto"
              role="region"
              aria-label={t.career.caption}
              tabIndex={0}
            >
              <table
                className="w-full min-w-[520px] border-collapse text-[13px]"
                data-testid="player-career-table"
              >
                <caption className="sr-only">{t.career.caption}</caption>
                <thead>
                  <tr>
                    <th scope="col" className={cls(HEADER_CELL, 'text-left')}>
                      {pp.club}
                    </th>
                    <th scope="col" className={cls(HEADER_CELL, 'pl-3 text-left')}>
                      {t.career.period}
                    </th>
                    {showCareerApps ? (
                      <th scope="col" className={cls(HEADER_CELL, 'pl-3 text-right')}>
                        {pp.apps}
                      </th>
                    ) : null}
                    {showCareerGoals ? (
                      <th scope="col" className={cls(HEADER_CELL, 'pl-3 text-right')}>
                        {pp.goals}
                      </th>
                    ) : null}
                    {showCareerAverage ? (
                      <th scope="col" className={cls(HEADER_CELL, 'pl-3 text-right')}>
                        {t.career.average}
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {careerRows.map((row, index) => (
                    <tr
                      key={row.key}
                      data-testid="player-career-row"
                      className={index % 2 === 1 ? ROW_TINT : undefined}
                    >
                      <td className={cls(CELL, 'pr-3')}>
                        <Link
                          href={'/clubs/' + row.clubId}
                          className="inline-flex min-h-6 items-center font-semibold text-foreground hover:text-primary-ink hover:underline"
                        >
                          {row.clubName}
                        </Link>
                      </td>
                      <td
                        className={cls(CELL, 'pl-3 text-ink-2 [font-variant-numeric:tabular-nums]')}
                      >
                        {row.periods.length > 0 ? row.periods.join(' · ') : GAP}
                      </td>
                      {showCareerApps ? (
                        <td className={cls(NUM_CELL, 'pl-3 text-ink-2')}>
                          {row.apps != null ? formatCount(row.apps, locale) : GAP}
                        </td>
                      ) : null}
                      {showCareerGoals ? (
                        <td className={cls(NUM_CELL, 'pl-3 text-ink-2')}>
                          {row.goals != null ? formatCount(row.goals, locale) : GAP}
                        </td>
                      ) : null}
                      {showCareerAverage ? (
                        <td className={cls(NUM_CELL, 'pl-3 text-ink-2')}>
                          {formatAverage(row.average, locale) ?? GAP}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <SourceNote label={t.career.note} />
          </>
        ) : (
          <div data-testid="career-empty">
            <EmptyState title={pp.careerEmpty} body={states.emptyBody} />
          </div>
        )}
      </section>

      {showStints ? (
        <section
          className={SECTION}
          data-testid="player-goals-by-stint"
          aria-label={pp.goalsByStintTitle}
        >
          <SectionHeading
            aside={fillJogador(t.stints.aside, {
              count: formatCount(stintRows.length, locale),
            })}
          >
            {pp.goalsByStintTitle}
          </SectionHeading>
          <div className="overflow-x-auto" role="region" aria-label={t.stints.caption} tabIndex={0}>
            <table
              className="w-full min-w-[560px] border-collapse text-[13px]"
              data-testid="player-stints-table"
            >
              <caption className="sr-only">{t.stints.caption}</caption>
              <thead>
                <tr>
                  <th scope="col" className={cls(HEADER_CELL, 'text-left')}>
                    {t.stints.stint}
                  </th>
                  <th scope="col" className={cls(HEADER_CELL, 'pl-3 text-left')}>
                    {t.stints.seasons}
                  </th>
                  <th scope="col" className={cls(HEADER_CELL, 'pl-3 text-right')}>
                    {pp.goals}
                  </th>
                  {showStintApps ? (
                    <th scope="col" className={cls(HEADER_CELL, 'pl-3 text-right')}>
                      {pp.apps}
                    </th>
                  ) : null}
                  {showStintApps ? (
                    <th scope="col" className={cls(HEADER_CELL, 'pl-3 text-right')}>
                      {t.stints.goalsPerGame}
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {stintRows.map((row, index) => (
                  <tr
                    key={row.clubId + '|' + (row.year ?? 'x') + '|' + index}
                    data-testid="player-stint-row"
                    className={index % 2 === 1 ? ROW_TINT : undefined}
                  >
                    <td className={cls(CELL, 'pr-3')}>
                      <Link
                        href={'/clubs/' + row.clubId}
                        className="inline-flex min-h-6 items-center font-semibold text-foreground hover:text-primary-ink hover:underline"
                      >
                        {row.clubName}
                      </Link>
                    </td>
                    <td
                      className={cls(CELL, 'pl-3 text-ink-2 [font-variant-numeric:tabular-nums]')}
                    >
                      {seasonSpanLabel(row) ?? GAP}
                    </td>
                    <td className={cls(NUM_CELL, 'pl-3 text-ink-2')}>
                      {row.goals != null ? formatCount(row.goals, locale) : GAP}
                    </td>
                    {showStintApps ? (
                      <td className={cls(NUM_CELL, 'pl-3 text-ink-2')}>
                        {row.apps != null ? formatCount(row.apps, locale) : GAP}
                      </td>
                    ) : null}
                    {showStintApps ? (
                      <td className={cls(NUM_CELL, 'pl-3 text-ink-2')}>
                        {formatAverage(goalsPerGame(row.goals, row.apps), locale) ?? GAP}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <SourceNote label={t.stints.note} />
        </section>
      ) : null}

      <section
        className={SECTION}
        data-testid="player-achievements"
        aria-label={pp.achievementsTitle}
      >
        <SectionHeading
          aside={
            hasAchievements
              ? fillJogador(t.achievements.aside, {
                  titles: formatCount(profile?.achievements.length ?? 0, locale),
                })
              : undefined
          }
        >
          {pp.achievementsTitle}
        </SectionHeading>
        {hasAchievements ? (
          <div
            className="overflow-x-auto"
            role="region"
            aria-label={t.achievements.caption}
            tabIndex={0}
          >
            <table
              className="w-full min-w-[520px] border-collapse text-[13px]"
              data-testid="player-achievements-table"
            >
              <caption className="sr-only">{t.achievements.caption}</caption>
              <thead>
                <tr>
                  <th scope="col" className={cls(HEADER_CELL, 'text-left')}>
                    {t.achievements.competition}
                  </th>
                  <th scope="col" className={cls(HEADER_CELL, 'pl-3 text-right')}>
                    {t.achievements.titles}
                  </th>
                  <th scope="col" className={cls(HEADER_CELL, 'pl-3 text-left')}>
                    {t.achievements.years}
                  </th>
                </tr>
              </thead>
              <tbody>
                {achievementRows.map((row, index) => (
                  <tr
                    key={row.key}
                    data-testid="player-achievement-row"
                    className={index % 2 === 1 ? ROW_TINT : undefined}
                  >
                    <td className={cls(CELL, 'pr-3')}>
                      <Link
                        href={'/competitions/' + row.competitionId}
                        className="inline-flex min-h-6 items-center font-semibold text-foreground hover:text-primary-ink hover:underline"
                      >
                        {row.competitionName || GAP}
                      </Link>
                    </td>
                    <td className={cls(NUM_CELL, 'pl-3 font-semibold text-foreground')}>
                      {formatCount(row.titles, locale)}
                    </td>
                    <td
                      className={cls(CELL, 'pl-3 text-ink-2 [font-variant-numeric:tabular-nums]')}
                    >
                      {formatYears(row.years) ?? GAP}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div data-testid="achievements-empty">
            <EmptyState title={pp.achievementsEmpty} body={states.emptyBody} />
          </div>
        )}
      </section>

      <section
        className={SECTION}
        data-testid="player-awards"
        aria-label={pp.individualAwardsTitle}
      >
        <SectionHeading
          aside={
            hasAwards
              ? fillJogador(t.awards.aside, {
                  count: formatCount(profile?.individualAwards.length ?? 0, locale),
                })
              : undefined
          }
        >
          {pp.individualAwardsTitle}
        </SectionHeading>
        {hasAwards ? (
          <div className="overflow-x-auto" role="region" aria-label={t.awards.caption} tabIndex={0}>
            <table
              className="w-full min-w-[520px] border-collapse text-[13px]"
              data-testid="player-awards-table"
            >
              <caption className="sr-only">{t.awards.caption}</caption>
              <thead>
                <tr>
                  <th scope="col" className={cls(HEADER_CELL, 'text-left')}>
                    {t.awards.award}
                  </th>
                  <th scope="col" className={cls(HEADER_CELL, 'pl-3 text-right')}>
                    {t.awards.times}
                  </th>
                  <th scope="col" className={cls(HEADER_CELL, 'pl-3 text-left')}>
                    {t.awards.years}
                  </th>
                </tr>
              </thead>
              <tbody>
                {awardRows.map((row, index) => (
                  <tr
                    key={row.key}
                    data-testid="player-award-row"
                    className={index % 2 === 1 ? ROW_TINT : undefined}
                  >
                    <td className={cls(CELL, 'pr-3')}>
                      {row.sourceUrl ? (
                        <a
                          href={row.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-6 items-center font-semibold text-foreground underline decoration-dotted underline-offset-2 hover:text-primary-ink"
                        >
                          {row.label}
                        </a>
                      ) : (
                        <span className="font-semibold text-foreground">{row.label}</span>
                      )}
                    </td>
                    <td className={cls(NUM_CELL, 'pl-3 font-semibold text-foreground')}>
                      {formatCount(row.times, locale)}
                    </td>
                    <td
                      className={cls(CELL, 'pl-3 text-ink-2 [font-variant-numeric:tabular-nums]')}
                    >
                      {formatYears(row.years) ?? GAP}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div data-testid="individual-awards-empty">
            <EmptyState title={pp.individualAwardsEmpty} body={states.emptyBody} />
          </div>
        )}
      </section>

      <section className={SECTION} data-testid="player-clubs" aria-label={pp.clubsTitle}>
        <SectionHeading>{pp.clubsTitle}</SectionHeading>
        {hasClubs && profile ? (
          <>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {profile.clubs.map((club) => {
                const periods = clubPeriods.get(club.id) ?? [];
                return (
                  <li key={club.id}>
                    <Link
                      href={'/clubs/' + club.id}
                      data-testid="player-club-card"
                      className="flex min-h-12 flex-col justify-center rounded-[2px] border border-border bg-surface px-4 py-3 transition-colors duration-200 hover:border-primary/60"
                    >
                      <span className="font-heading text-[15px] font-bold leading-tight text-foreground">
                        {club.name}
                      </span>
                      <span className="mt-0.5 text-[11px] text-ink-3 [font-variant-numeric:tabular-nums]">
                        {periods.length > 0 ? periods.join(' · ') : GAP}
                      </span>
                      {club.country ? (
                        <span className="mt-1 text-[11px]">
                          <CountryFlag code={club.country} locale={locale} />
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-[11px] leading-snug text-ink-3">{t.clubs.caption}</p>
          </>
        ) : (
          <div data-testid="clubs-empty">
            <EmptyState title={pp.clubsEmpty} body={states.emptyBody} />
          </div>
        )}
      </section>

      <section className={SECTION} data-testid="player-details" aria-label={t.details.heading}>
        <SectionHeading>{t.details.heading}</SectionHeading>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          {player.country ? (
            <div>
              <dt className="text-[11px] uppercase tracking-[0.12em] text-ink-3">
                {t.details.country}
              </dt>
              <dd className="mt-0.5 text-[13px] font-medium text-foreground">
                <CountryFlag
                  code={player.country}
                  locale={locale}
                  basePath="/clubs"
                  destination="clubs"
                />
              </dd>
            </div>
          ) : null}
          {position ? <DetailItem label={pp.position} value={position} /> : null}
          {birthValue ? <DetailItem label={pp.birth} value={birthValue} /> : null}
          {player.heightCm != null ? (
            <DetailItem
              label={pp.height}
              value={pp.heightCmValue.replace('{cm}', String(player.heightCm))}
            />
          ) : null}
          {footLabel ? <DetailItem label={pp.preferredFoot} value={footLabel} /> : null}
          {player.nickname ? <DetailItem label={pp.nickname} value={player.nickname} /> : null}
          {profile?.currentClub ? (
            <DetailItem
              label={pp.currentClub}
              value={
                <Link
                  href={'/clubs/' + profile.currentClub.id}
                  className="text-primary-ink underline decoration-dotted underline-offset-2 hover:decoration-solid"
                >
                  {profile.currentClub.name}
                </Link>
              }
            />
          ) : null}
          {player.qid ? (
            <DetailItem
              label={t.details.qid}
              value={
                <a
                  href={'https://www.wikidata.org/wiki/' + player.qid}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-6 items-center text-primary-ink underline decoration-dotted underline-offset-2 hover:decoration-solid"
                >
                  {player.qid}
                </a>
              }
            />
          ) : null}
          {player.importedFrom ? (
            <DetailItem label={t.details.importedFrom} value={player.importedFrom} />
          ) : null}
          {player.sourceUrl ? (
            <DetailItem
              label={t.details.source}
              value={
                <a
                  href={player.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-6 items-center text-primary-ink underline decoration-dotted underline-offset-2 hover:decoration-solid"
                >
                  {t.details.sourceLink}
                </a>
              }
            />
          ) : null}
        </dl>
        {player.officialSite || player.socialLinks ? (
          <div className="mt-4 border-t border-border/70 pt-3">
            <SocialLinks
              officialSite={player.officialSite ?? null}
              socialLinks={player.socialLinks ?? null}
              followersSnapshot={player.followersSnapshot ?? null}
              locale={locale}
            />
          </div>
        ) : null}
      </section>

      <footer data-testid="player-provenance" className="mt-12 border-t-2 border-foreground pt-4">
        <h2 className="sr-only">{t.provenance.heading}</h2>
        <SourceNote label={t.provenance.lead} />
        {player.sourceUrl ? (
          <SourceNote href={player.sourceUrl} label={t.provenance.source} />
        ) : null}
        {profile ? <SourceNote label={t.provenance.career} /> : null}
        {profile && hasAchievements ? (
          <SourceNote
            label={fillJogador(t.provenance.titles, {
              count: formatCount(profile.achievements.length, locale),
            })}
          />
        ) : null}
        {profile && hasAwards ? (
          <SourceNote
            label={fillJogador(t.provenance.awards, {
              count: formatCount(profile.individualAwards.length, locale),
            })}
          />
        ) : null}
        {photo.url ? (
          photo.license ? (
            <SourceNote
              href={photo.sourceUrl}
              label={fillJogador(t.provenance.photo, { license: photo.license })}
            />
          ) : (
            <SourceNote label={t.provenance.photoUnknown} />
          )
        ) : (
          <SourceNote label={t.provenance.photoIllustration} />
        )}
        {player.importedFrom ? (
          <SourceNote label={t.provenance.importedFrom + ': ' + player.importedFrom} />
        ) : null}
        {profile ? <SourceNote label={t.provenance.metrics} /> : null}
        <SourceNote label={t.provenance.gap} />
      </footer>
    </div>
  );
}
