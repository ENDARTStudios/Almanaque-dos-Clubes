import Link from 'next/link';
import type { ReactNode } from 'react';

import FichaHead from '@/components/ficha/FichaHead';
import Pillar from '@/components/ficha/Pillar';
import { Trophy } from '@/components/ficha/Metal';
import SectionHeading from '@/components/ficha/SectionHeading';
import { EmptyState } from '@/components/ficha/States';
import SourceNote from '@/components/SourceNote';
import { CountryFlag } from '@/components/CountryFlag';
import SocialLinks from '@/components/SocialLinks';
import { ClubCrestGenericDark } from '@/components/icons';
import { wsC2Strings } from '@/i18n/wsC2';
import type { Locale } from '@/i18n/config';
import { conceitoClubeStrings, fillClube } from '@/i18n/wsConceitoClube';
import { formatCount } from '@/lib/format';
import {
  currentCrest,
  formatYears,
  groupCompetitionStats,
  groupHonours,
  kitShirtColor,
  kitColors,
  squadAge,
  yearsSince,
} from './derive';
import type {
  Anthem,
  ClubProfile,
  ClubStatistics,
  Crest,
  KitEntry,
  Pennant,
  RelatedClub,
  SquadPlayer,
  TimelineData,
} from './types';

/**
 * FICHA DE CLUBE no conceito FICHA — composição do quadro `clube-migrado`.
 *
 * ── ORDEM DO QUADRO ─────────────────────────────────────────────────────────────────────────
 * identidade + escudo com licença · pilares · sobre + fonte · estatística por competição ·
 * maiores rivais · parede de honrarias · elenco · uniformes · flâmulas · hino · procedência no pé.
 *
 * ── ADAPTAÇÃO HONESTA ───────────────────────────────────────────────────────────────────────
 * O quadro desenha números ilustrativos (48 títulos, 426 jogos, 812 gols, 28 jogadores). Nada
 * disso é copiado: cada número sai de `GET /clubs/:id/profile` (títulos), `/statistics`
 * (jogos/gols/por competição/rivais), `/players?clubId=` (elenco, idade derivada de
 * `birthDate`) e do grafo (honrarias). Bloco sem dado NÃO é renderizado — não existe "0"
 * decorativo nem nome inventado. O que a fonte não publica vira lacuna DECLARADA ("—" e nota).
 *
 * ── O QUE O QUADRO TEM E A API NÃO PUBLICA ──────────────────────────────────────────────────
 * duração do hino, letra (licença restrita), "jogos e gols por jogador" e escudo em domínio
 * público por clube. O hino entra sem duração e sem letra; o elenco entra sem as duas colunas
 * de estatística, com a nota do motivo; o escudo entra com a licença REAL do acervo (ou com a
 * declaração de ilustração autoral quando não há escudo oficial).
 *
 * ── ESTILO ──────────────────────────────────────────────────────────────────────────────────
 * raio 2px, borda 1px, sem sombra; fio de 2px no topo e 1px entre linhas; número à direita com
 * `tabular-nums`; metadado em `text-ink-3` 11px; texto de destaque em `text-primary-ink`;
 * nenhuma transição genérica e nenhuma curva de entrada (régua `motion-craft`).
 */
export interface ClubeFichaPageViewProps {
  locale: Locale;
  club: ClubProfile;
  stats: ClubStatistics | null;
  kits: KitEntry[] | null;
  anthem: Anthem | null;
  pennants: Pennant[] | null;
  crests: Crest[];
  squad: SquadPlayer[] | null;
  timeline: TimelineData | null;
  relatedClubs: RelatedClub[] | null;
  /** Ação da página (favoritar) — Client Component passado pelo Server Component. */
  actions?: ReactNode;
  /** Evolução do escudo (Client Component com estado) — opcional. */
  crestsSlot?: ReactNode;
  /** Comunidade/editor (Client Component, funcionalidade que não pode sair). */
  communitySlot?: ReactNode;
}

/** Traço de lacuna declarada. Não é texto traduzível: é o sinal universal de ausência. */
const GAP = '—';

/** Locale interno → chave do texto editorial no acervo (pt/en/es). */
const EDITORIAL_KEY: Record<Locale, 'pt' | 'en' | 'es'> = {
  'pt-br': 'pt',
  'en-us': 'en',
  'es-es': 'es',
};

function editorialEntry(club: ClubProfile, locale: Locale) {
  const editorial = club.editorial ?? null;
  return (
    editorial?.[EDITORIAL_KEY[locale]] ?? editorial?.pt ?? editorial?.en ?? editorial?.es ?? null
  );
}

const HEADER_CELL =
  'border-b-2 border-foreground pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3';
const CELL = 'border-b border-border/70 py-2 align-middle text-[13px] leading-5';
const NUM_CELL = `${CELL} text-right [font-variant-numeric:tabular-nums]`;

function kitTypeLabel(type: string, profile: (typeof wsC2Strings)['pt-br']['profile']): string {
  const key = `kitType${type.charAt(0).toUpperCase()}${type.slice(1)}`;
  const value = (profile as unknown as Record<string, string>)[key];
  return value ?? type;
}

function CrestFrame({
  club,
  crests,
  locale,
}: {
  club: ClubProfile;
  crests: Crest[];
  locale: Locale;
}) {
  const t = conceitoClubeStrings[locale].head;
  const current = currentCrest(crests);
  const imageUrl = current?.imageUrl ?? club.media?.logoUrl ?? null;
  const license = current?.license ?? null;
  const sourceUrl = current?.sourceUrl ?? null;
  const alt = fillClube(t.crestAlt, { name: club.name });

  return (
    <figure className="shrink-0" data-testid="club-crest-frame">
      <div className="flex h-[132px] w-[132px] items-center justify-center rounded-[2px] border border-border bg-surface p-3">
        {imageUrl ? (
          // O host do Commons varia por arquivo; o acervo já usa <img> para escudo pelo
          // mesmo motivo (ver CrestTimeline).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={alt}
            width={108}
            height={108}
            loading="lazy"
            data-testid="club-crest"
            className="h-full w-full object-contain"
          />
        ) : (
          <span data-testid="club-crest-fallback" className="text-ink-3">
            <ClubCrestGenericDark size={56} />
          </span>
        )}
      </div>
      <figcaption className="mt-2 w-[132px] text-center">
        {imageUrl ? (
          license ? (
            <SourceNote href={sourceUrl} label={license} prefixoAcessivel={t.crestLicense + ': '} />
          ) : (
            <span className="text-[11px] text-ink-3">{t.crestUnknownLicense}</span>
          )
        ) : (
          <span className="text-[11px] text-ink-3" data-testid="club-crest-illustration">
            {t.crestIllustration}
          </span>
        )}
      </figcaption>
    </figure>
  );
}

function RankingMini({
  ranking,
  locale,
}: {
  ranking: ClubProfile['rankings']['items'][number];
  locale: Locale;
}) {
  const t = conceitoClubeStrings[locale].head;
  return (
    <aside
      className="w-[184px] shrink-0 rounded-[2px] border border-border bg-surface px-3 py-2"
      data-testid="club-ranking-card"
    >
      <p className="text-[10px] font-semibold tracking-[0.1em] text-ink-3 uppercase">{t.ranking}</p>
      <p className="num mt-1 text-[30px] leading-none font-bold text-primary-ink">
        {ranking.position != null ? `${ranking.position}º` : '—'}
      </p>
      <p className="mt-1 text-[11px] text-ink-3">
        {ranking.points != null
          ? fillClube(t.rankingPoints, { points: formatCount(ranking.points, locale) })
          : '—'}
      </p>
      <p className="mt-1 truncate text-[10px] text-ink-3">{ranking.rankingName}</p>
      <Link
        href={`/rankings/${ranking.rankingId}`}
        className="mt-1 inline-flex min-h-6 items-center text-[10px] text-primary-ink underline decoration-dotted underline-offset-2"
      >
        {t.rankingLink}
      </Link>
    </aside>
  );
}

function TrophyRow({ club, locale }: { club: ClubProfile; locale: Locale }) {
  const t = conceitoClubeStrings[locale];
  const rows = groupHonours(club.titles.items)
    .sort((a, b) => b.titles - a.titles)
    .slice(0, 5);
  if (rows.length === 0) return null;
  const total = club.titles.items.length;
  return (
    <section
      className="mt-8 border-t border-border pt-5"
      data-testid="club-trophies"
      aria-label={t.trophies.heading}
    >
      <SectionHeading
        aside={fillClube(t.trophies.aside, {
          titles: formatCount(total, locale),
          competitions: formatCount(groupHonours(club.titles.items).length, locale),
        })}
      >
        {t.trophies.heading}
      </SectionHeading>
      <ul className="mt-3 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-5">
        {rows.map((row) => (
          <li
            key={row.key}
            className="flex flex-col items-center justify-between gap-2 rounded-[2px] border border-border bg-surface px-3 py-4 text-center"
          >
            <Trophy size={38} color="var(--color-metal-ouro)" />
            <span className="text-[12px] font-semibold leading-tight text-foreground">
              {row.competitionName ?? '—'}
            </span>
            <span className="num text-[22px] leading-none font-bold text-secondary">
              {formatCount(row.titles, locale)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AboutSection({ club, locale }: { club: ClubProfile; locale: Locale }) {
  const t = conceitoClubeStrings[locale];
  const ws = wsC2Strings[locale].profile;
  const editorial = club.editorial ?? null;
  const entry = editorialEntry(club, locale);
  const extract = entry?.extract ?? null;
  const sourceUrl = entry?.sourceUrl ?? null;
  const license = editorial?.license ?? null;

  return (
    <section className="mt-8 border-t border-border pt-5" data-testid="club-about">
      <SectionHeading>{t.about.heading}</SectionHeading>
      {extract ? (
        <>
          <p className="measure-readable text-[14px] leading-[22px] text-ink-2 [text-wrap:pretty]">
            {extract}
          </p>
          <SourceNote
            href={sourceUrl}
            label={t.about.source}
            detail={license ?? undefined}
            prefixoAcessivel={ws.source + ': '}
          />
        </>
      ) : (
        <p className="measure-readable text-[13px] text-ink-2">{t.about.empty}</p>
      )}
    </section>
  );
}

function RivalsSection({ stats, locale }: { stats: ClubStatistics; locale: Locale }) {
  const t = conceitoClubeStrings[locale];
  const rivals = stats.topRivals.slice(0, 3);
  if (rivals.length === 0) return null;

  return (
    <section
      className="mt-8 border-t border-border pt-5"
      data-testid="club-rivals"
      aria-label={t.rivals.caption}
    >
      <SectionHeading>{t.rivals.heading}</SectionHeading>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rivals.map((rival) => (
          <li
            key={rival.opponentId}
            className="rounded-[2px] border border-border bg-surface px-4 py-3"
            data-testid="club-rival-card"
          >
            <Link
              href={`/clubs/${rival.opponentId}`}
              className="inline-flex min-h-6 items-center font-heading text-[17px] font-bold leading-tight text-foreground hover:text-primary-ink hover:underline"
            >
              {rival.opponentName}
            </Link>
            <p className="mt-1 text-[11px] font-semibold text-secondary">
              {fillClube(t.rivals.matches, { count: formatCount(rival.played, locale) })}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-3 [font-variant-numeric:tabular-nums]">
              {fillClube(t.rivals.record, {
                wins: rival.wins,
                draws: rival.draws,
                losses: rival.losses,
              })}
            </p>
            <p className="text-[11px] text-ink-3 [font-variant-numeric:tabular-nums]">
              {fillClube(t.rivals.goals, {
                goalsFor: rival.goalsFor,
                goalsAgainst: rival.goalsAgainst,
              })}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function HonoursSection({ club, locale }: { club: ClubProfile; locale: Locale }) {
  const t = conceitoClubeStrings[locale];
  const ws = wsC2Strings[locale].profile;
  const rows = groupHonours(club.titles.items);
  if (rows.length === 0) return null;
  const titles = club.titles.items.length;

  return (
    <section
      className="mt-8 border-t border-border pt-5"
      data-testid="club-honour-gallery"
      aria-label={t.honours.heading}
    >
      <SectionHeading
        aside={fillClube(t.honours.aside, {
          titles: formatCount(titles, locale),
          competitions: rows.length,
        })}
      >
        {t.honours.heading}
      </SectionHeading>
      <div className="overflow-x-auto" role="region" aria-label={t.honours.caption} tabIndex={0}>
        <table className="w-full min-w-[680px] border-collapse text-[13px]">
          <caption className="sr-only">{t.honours.caption}</caption>
          <thead>
            <tr>
              <th scope="col" className={`${HEADER_CELL} text-left`}>
                {t.honours.columns.competition}
              </th>
              <th scope="col" className={`${HEADER_CELL} text-right`}>
                {t.honours.columns.titles}
              </th>
              <th scope="col" className={`${HEADER_CELL} pl-4 text-left`}>
                {t.honours.columns.years}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.key}
                data-testid="club-honour-title"
                className={index % 2 === 1 ? 'bg-surface-2' : undefined}
              >
                <td className={`${CELL} pr-4`}>
                  {row.competitionId ? (
                    <Link
                      href={`/competitions/${row.competitionId}`}
                      className="inline-flex min-h-6 items-center font-semibold text-foreground hover:text-primary-ink hover:underline"
                    >
                      {row.competitionName ?? GAP}
                    </Link>
                  ) : (
                    <span className="font-semibold text-foreground">
                      {row.competitionName ?? GAP}
                    </span>
                  )}
                  {row.gender === 'women' ? (
                    <span className="ml-1 text-[11px] text-ink-3">({ws.genderWomen})</span>
                  ) : null}
                  {row.sourceUrl ? (
                    <SourceNote href={row.sourceUrl} label={t.honours.source} />
                  ) : null}
                </td>
                <td className={`${NUM_CELL} font-semibold text-foreground`}>{row.titles}</td>
                <td className={`${CELL} pl-4 text-ink-2`}>{formatYears(row) || GAP}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SquadSection({ squad, locale }: { squad: SquadPlayer[]; locale: Locale }) {
  const t = conceitoClubeStrings[locale];
  if (squad.length === 0) return null;

  return (
    <section
      className="mt-8 border-t border-border pt-5"
      data-testid="club-squad"
      aria-label={t.squad.heading}
    >
      <SectionHeading
        aside={fillClube(t.squad.aside, { count: formatCount(squad.length, locale) })}
      >
        {t.squad.heading}
      </SectionHeading>
      <div className="overflow-x-auto" role="region" aria-label={t.squad.caption} tabIndex={0}>
        <table className="w-full min-w-[520px] border-collapse text-[13px]">
          <caption className="sr-only">{t.squad.caption}</caption>
          <thead>
            <tr>
              <th scope="col" className={`${HEADER_CELL} text-left`}>
                {t.squad.columns.player}
              </th>
              <th scope="col" className={`${HEADER_CELL} text-left`}>
                {t.squad.columns.position}
              </th>
              <th scope="col" className={`${HEADER_CELL} text-right`}>
                {t.squad.columns.age}
              </th>
            </tr>
          </thead>
          <tbody>
            {squad.map((player, index) => {
              const age = squadAge(player);
              return (
                <tr
                  key={player.id}
                  data-testid="club-squad-row"
                  className={index % 2 === 1 ? 'bg-surface-2' : undefined}
                >
                  <td className={`${CELL} pr-4`}>
                    <Link
                      href={`/players/${player.id}`}
                      className="inline-flex min-h-6 items-center font-semibold text-foreground hover:text-primary-ink hover:underline"
                    >
                      {player.fullName}
                    </Link>
                  </td>
                  <td className={`${CELL} pr-4 text-ink-2`}>
                    {player.position
                      ? (t.squad.positions[player.position] ?? player.position)
                      : GAP}
                  </td>
                  <td className={`${NUM_CELL} text-ink-2`}>{age ?? GAP}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <SourceNote label={t.squad.statsGap} />
    </section>
  );
}

function KitsSection({ kits, locale }: { kits: KitEntry[]; locale: Locale }) {
  const t = conceitoClubeStrings[locale];
  const ws = wsC2Strings[locale].profile;
  if (kits.length === 0) return null;

  return (
    <section
      className="mt-8 border-t border-border pt-5"
      data-testid="club-kits"
      aria-label={t.kits.heading}
    >
      <SectionHeading>{t.kits.heading}</SectionHeading>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kits.map((kit, index) => {
          const colors = kitColors(kit);
          const shirt = kitShirtColor(kit);
          const typeLabel = kitTypeLabel(kit.type, ws);
          const title = kit.season
            ? fillClube(t.kits.seasonType, { season: kit.season, type: typeLabel })
            : typeLabel;
          return (
            <li
              key={`${kit.season ?? 'x'}-${kit.type}-${index}`}
              className="flex items-start gap-4 rounded-[2px] border border-border bg-surface p-4"
              data-testid="club-kit-card"
            >
              <div
                aria-hidden="true"
                className="flex h-14 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[2px] border border-border bg-surface-2"
                style={shirt ? { backgroundColor: `#${shirt}` } : undefined}
              >
                {!shirt && kit.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- mesma razão do escudo.
                  <img
                    src={kit.image.url}
                    alt=""
                    width={44}
                    height={56}
                    loading="lazy"
                    className="h-full w-full object-contain"
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <p data-testid="kit-label" className="text-[13px] font-semibold text-foreground">
                  {title}
                </p>
                <p className="mt-1 text-[11px] text-ink-3 [font-variant-numeric:tabular-nums]">
                  {colors.length > 0
                    ? colors.map((color) => `#${color}`).join(' · ')
                    : t.kits.noColors}
                </p>
                <SourceNote href={kit.sourceUrl} label={t.kits.source} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PennantsSection({ pennants, locale }: { pennants: Pennant[]; locale: Locale }) {
  const t = conceitoClubeStrings[locale];
  const ws = wsC2Strings[locale].profile;
  if (pennants.length === 0) return null;

  return (
    <section
      className="mt-8 border-t border-border pt-5"
      data-testid="club-pennants"
      aria-label={t.pennants.heading}
    >
      <SectionHeading>{t.pennants.heading}</SectionHeading>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {pennants.map((pennant, index) => (
          <li key={`${pennant.sourceUrl}-${index}`}>
            <figure
              className="flex h-full flex-col rounded-[2px] border border-border bg-surface p-3"
              data-testid="pennant-figure"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- host de origem variável. */}
              <img
                src={pennant.imageUrl}
                alt={pennant.description ?? t.pennants.heading}
                loading="lazy"
                className="mx-auto max-h-40 w-auto object-contain"
              />
              <figcaption className="mt-2 text-[11px] leading-snug text-ink-3">
                {pennant.description ?? GAP}
                {pennant.year ? ` (${pennant.year})` : ''}
                {pennant.curiosities ? (
                  <span className="mt-1 block">
                    {ws.pennantsCuriosities}: {pennant.curiosities}
                  </span>
                ) : null}
                <a
                  href={pennant.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex min-h-6 items-center underline decoration-dotted underline-offset-2 hover:text-primary-ink"
                >
                  {pennant.license}
                </a>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AnthemSection({ anthem, locale }: { anthem: Anthem; locale: Locale }) {
  const t = conceitoClubeStrings[locale];
  const ws = wsC2Strings[locale].profile;

  return (
    <section
      className="mt-8 border-t border-border pt-5"
      data-testid="club-anthem"
      aria-label={t.anthem.heading}
    >
      <SectionHeading>{t.anthem.heading}</SectionHeading>
      <p className="text-[13px] text-foreground" data-testid="anthem-label">
        {anthem.label ?? t.anthem.heading}
        {anthem.official === false ? ` · ${ws.anthemUnofficial}` : null}
      </p>
      {anthem.composer || anthem.lyricist || anthem.year ? (
        <p className="mt-1 text-[13px] text-ink-2">
          {anthem.composer ? `${ws.anthemComposer}: ${anthem.composer}` : ''}
          {anthem.lyricist && anthem.lyricist !== anthem.composer
            ? ` · ${ws.anthemLyricist}: ${anthem.lyricist}`
            : ''}
          {anthem.year ? ` · ${ws.anthemYear}: ${anthem.year}` : ''}
        </p>
      ) : null}
      {anthem.note ? <p className="mt-1 text-[13px] text-ink-2">{anthem.note}</p> : null}
      {anthem.audioUrl ? (
        <div className="mt-3" data-testid="anthem-audio">
          <audio controls preload="none" src={anthem.audioUrl} className="w-full max-w-md">
            <track kind="captions" />
          </audio>
          <SourceNote
            href={anthem.audioSourceUrl}
            label={anthem.audioLicense ?? t.anthem.audioSource}
          />
        </div>
      ) : null}
      {anthem.lyrics === null && anthem.lyricsRestricted ? (
        <p className="mt-2 text-[11px] text-ink-3" data-testid="anthem-lyrics-note">
          {ws.anthemLyricsRestricted}
        </p>
      ) : null}
      <SourceNote href={anthem.sourceUrl} label={anthem.attribution} />
    </section>
  );
}

function Complementos({
  club,
  locale,
  timeline,
  relatedClubs,
  crests,
  crestsSlot,
  gaps,
}: {
  club: ClubProfile;
  locale: Locale;
  timeline: TimelineData | null;
  relatedClubs: RelatedClub[] | null;
  crests: Crest[];
  crestsSlot?: ReactNode;
  gaps: string[];
}) {
  const t = conceitoClubeStrings[locale];
  const ws = wsC2Strings[locale].profile;
  const details = club.infobox ?? {};

  return (
    <>
      {timeline && timeline.timeline.length > 0 ? (
        <section
          className="mt-8 border-t border-border pt-5"
          data-testid="club-timeline"
          aria-label={t.complement.timelineHeading}
        >
          <SectionHeading aside={formatCount(timeline.timeline.length, locale)}>
            {t.complement.timelineHeading}
          </SectionHeading>
          <ol className="divide-y divide-border/70">
            {timeline.timeline.map((item, index) => (
              <li
                key={`${item.competitionId ?? 'x'}-${item.year ?? index}-${index}`}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2"
                data-testid="club-timeline-item"
              >
                <span className="num w-14 shrink-0 text-[18px] text-primary-ink">
                  {item.year ?? GAP}
                </span>
                <span className="min-w-0">
                  {item.competitionId ? (
                    <Link
                      href={`/competitions/${item.competitionId}`}
                      className="inline-flex min-h-6 items-center text-[13px] font-semibold text-foreground hover:text-primary-ink hover:underline"
                    >
                      {item.competitionName ?? GAP}
                    </Link>
                  ) : (
                    <span className="text-[13px] font-semibold text-foreground">
                      {item.competitionName ?? GAP}
                    </span>
                  )}
                  <SourceNote href={item.sourceUrl} label={ws.source} />
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {/* O CrestTimeline já traz a própria seção (título, testid `club-crests` e licenças);
          envolvê-lo num segundo <section> duplicaria o landmarque e o testid. */}
      {crests.length > 0 && crestsSlot ? (
        <div className="mt-8 border-t border-border pt-5">{crestsSlot}</div>
      ) : null}

      {club.rankings.available ? (
        <section
          className="mt-8 border-t border-border pt-5"
          data-testid="club-rankings"
          aria-label={t.complement.rankingsCaption}
        >
          <SectionHeading>{t.complement.rankingsHeading}</SectionHeading>
          <ul className="divide-y divide-border/70">
            {club.rankings.items.map((ranking) => (
              <li
                key={`${ranking.rankingId}-${ranking.position ?? 'x'}`}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2"
              >
                <span className="min-w-0 text-[13px] font-semibold text-foreground">
                  {ranking.rankingName}
                </span>
                <span className="text-[11px] text-ink-3">
                  {ranking.competitionName ?? ranking.scope ?? ''}
                  {ranking.season ? ` · ${t.complement.season} ${ranking.season}` : ''}
                </span>
                <span className="text-[13px] text-ink-2 [font-variant-numeric:tabular-nums]">
                  {ranking.position != null ? `${t.complement.position} ${ranking.position}` : GAP}
                  {ranking.points != null
                    ? ` · ${formatCount(ranking.points, locale)} ${t.complement.points}`
                    : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {club.competitions.available ? (
        <section
          className="mt-8 border-t border-border pt-5"
          data-testid="club-competitions"
          aria-label={t.complement.competitionsCaption}
        >
          <SectionHeading>{t.complement.competitionsHeading}</SectionHeading>
          <ul className="flex flex-wrap gap-2">
            {club.competitions.items.map((competition) => (
              <li key={competition.id}>
                <Link
                  href={`/competitions/${competition.id}`}
                  className="inline-flex min-h-6 items-center rounded-[2px] border border-border px-3 py-1 text-[13px] text-foreground hover:border-primary/60 hover:text-primary-ink"
                >
                  {competition.name ?? GAP}
                  {competition.country ? (
                    <span className="text-ink-3"> · {competition.country}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {relatedClubs && relatedClubs.length > 0 ? (
        <section
          className="mt-8 border-t border-border pt-5"
          data-testid="related-clubs"
          aria-label={t.complement.relatedCaption}
        >
          <SectionHeading>{t.complement.relatedHeading}</SectionHeading>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {relatedClubs.map((related) => (
              <li key={related.clubId}>
                <Link
                  href={`/clubs/${related.clubId}`}
                  data-testid="related-club-card"
                  className="flex min-h-12 flex-col justify-center rounded-[2px] border border-border bg-surface px-4 py-3 hover:border-primary/60"
                >
                  <span className="text-[13px] font-semibold text-foreground">{related.name}</span>
                  <span className="mt-0.5 text-[11px] text-ink-3">
                    {[related.city, related.state, related.country].filter(Boolean).join(' · ') ||
                      GAP}
                  </span>
                  <span className="mt-1 text-[11px] text-primary-ink">
                    {t.complement.relations[related.relationType] ?? related.relationType}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {club.related.available ? (
        <section
          className="mt-8 border-t border-border pt-5"
          data-testid="club-related-edges"
          aria-label={t.complement.graphCaption}
        >
          <SectionHeading>{t.complement.graphHeading}</SectionHeading>
          <ul className="divide-y divide-border/70">
            {club.related.items.map((edge, index) => (
              <li
                key={`${edge.relation}-${edge.otherId}-${index}`}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2 text-[13px]"
              >
                <span className="font-semibold text-foreground">{edge.relation}</span>
                <span className="text-[11px] text-ink-3">
                  {edge.otherType} · <span className="font-mono">{edge.otherId}</span>
                </span>
                <SourceNote href={edge.sourceUrl} label={ws.source} className="mt-0" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8 border-t border-border pt-5" data-testid="club-details">
        <SectionHeading>{t.complement.detailsHeading}</SectionHeading>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          {club.country ? (
            <div>
              <dt className="text-[11px] uppercase tracking-[0.12em] text-ink-3">
                {t.details.country}
              </dt>
              <dd className="mt-0.5 text-[13px] font-medium text-foreground">
                <CountryFlag
                  code={club.country}
                  locale={locale}
                  basePath="/clubs"
                  destination="clubs"
                />
              </dd>
            </div>
          ) : null}
          {club.city ? <DetailItem label={t.details.city} value={club.city} /> : null}
          {club.state ? <DetailItem label={t.details.state} value={club.state} /> : null}
          {club.foundedYear ? (
            <DetailItem label={t.details.founded} value={String(club.foundedYear)} />
          ) : null}
          {club.status ? <DetailItem label={t.details.status} value={club.status} /> : null}
          {details.estadio || club.media?.stadium?.name ? (
            <DetailItem
              label={t.details.stadium}
              value={details.estadio ?? club.media?.stadium?.name ?? GAP}
            />
          ) : null}
          {details.capacidade ||
          (club.media?.stadium?.capacity != null && club.media.stadium.capacity > 0) ? (
            <DetailItem
              label={t.details.capacity}
              value={details.capacidade ?? formatCount(club.media?.stadium?.capacity ?? 0, locale)}
            />
          ) : null}
          {details.presidente ? (
            <DetailItem label={t.details.president} value={details.presidente} />
          ) : null}
          {details.treinador ? (
            <DetailItem label={t.details.coach} value={details.treinador} />
          ) : null}
          {details.alcunhas ? (
            <DetailItem label={t.details.nicknames} value={details.alcunhas} />
          ) : null}
          {details.mascote ? <DetailItem label={t.details.mascot} value={details.mascote} /> : null}
          {details.local ? <DetailItem label={t.details.local} value={details.local} /> : null}
          {club.website ? (
            <div>
              <dt className="text-[11px] uppercase tracking-[0.12em] text-ink-3">
                {t.details.website}
              </dt>
              <dd className="mt-0.5 text-[13px]">
                <a
                  href={club.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-6 items-center text-primary-ink underline decoration-dotted underline-offset-2"
                >
                  {t.details.website}
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
        {club.website || club.socialLinks ? (
          <div className="mt-4">
            <SocialLinks
              officialSite={club.website ?? null}
              socialLinks={club.socialLinks ?? null}
              followersSnapshot={club.followersSnapshot ?? null}
              locale={locale}
            />
          </div>
        ) : null}
        <div className="mt-4 border-t border-border/70 pt-3">
          <h3 className="text-[11px] uppercase tracking-[0.12em] text-ink-3">
            {t.complement.geographyHeading}
          </h3>
          {club.geo.latitude != null && club.geo.longitude != null ? (
            <div className="mt-1 text-[13px] text-ink-2">
              <p className="[font-variant-numeric:tabular-nums]">
                {club.geo.latitude.toFixed(4)}, {club.geo.longitude.toFixed(4)}
                {club.geo.coordPrecision === 'municipality' ||
                club.geo.coordPrecision === 'approximate' ? (
                  <span className="text-ink-3"> · {t.complement.coordApprox}</span>
                ) : null}
              </p>
              {club.geo.attribution ? (
                <p className="mt-1 text-[11px] text-ink-3" data-testid="geo-attribution">
                  {club.geo.attribution.geo}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-1 text-[13px] text-ink-2">{t.complement.noGeo}</p>
          )}
        </div>
      </section>

      {gaps.length > 0 ? (
        <section className="mt-8 border-t border-border pt-5" data-testid="club-gaps">
          <SectionHeading>{t.complement.gapsHeading}</SectionHeading>
          <p className="mb-3 text-[11px] text-ink-3">{t.complement.gapsIntro}</p>
          <ul className="flex flex-wrap gap-2">
            {gaps.map((gap) => (
              <li
                key={gap}
                className="rounded-[2px] border border-dashed border-border px-3 py-1 text-[11px] text-ink-3"
              >
                {ws.gapLabels[gap] ?? gap}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.12em] text-ink-3">{label}</dt>
      <dd className="mt-0.5 text-[13px] font-medium text-foreground">{value}</dd>
    </div>
  );
}

function ProvenanceFooter({
  club,
  locale,
  stats,
  kits,
  pennants,
  anthem,
  crests,
}: {
  club: ClubProfile;
  locale: Locale;
  stats: ClubStatistics | null;
  kits: KitEntry[] | null;
  pennants: Pennant[] | null;
  anthem: Anthem | null;
  crests: Crest[];
}) {
  const t = conceitoClubeStrings[locale];
  const ws = wsC2Strings[locale].profile;
  const current = currentCrest(crests);
  const editorial = club.editorial ?? null;
  const license = editorial?.license ?? null;
  const titles = club.titles.items.length;

  return (
    <footer data-testid="club-provenance" className="mt-12 border-t-2 border-foreground pt-4">
      <h2 className="sr-only">{t.provenance.heading}</h2>
      <SourceNote label={t.provenance.lead} />
      {club.provenance.source ? (
        <SourceNote
          href={club.provenance.sourceUrl}
          label={`${t.provenance.source}: ${club.provenance.source.toUpperCase()}`}
        />
      ) : null}
      {titles > 0 ? (
        <SourceNote
          label={fillClube(t.provenance.titles, { count: formatCount(titles, locale) })}
        />
      ) : null}
      {license ? <SourceNote label={fillClube(t.provenance.about, { license })} /> : null}
      {stats && stats.overall.played > 0 ? <SourceNote label={t.provenance.stats} /> : null}
      {current?.license ? (
        <SourceNote label={fillClube(t.provenance.crest, { license: current.license })} />
      ) : null}
      {kits && kits.length > 0 ? <SourceNote label={t.provenance.kits} /> : null}
      {pennants && pennants.length > 0 ? <SourceNote label={t.provenance.pennants} /> : null}
      {anthem ? <SourceNote label={t.provenance.anthem} /> : null}
      {club.provenance.importedFrom ? (
        <SourceNote label={`${ws.importedFrom}: ${club.provenance.importedFrom}`} />
      ) : null}
      {club.provenance.retrievedAt ? (
        <SourceNote label={`${ws.retrievedAt}: ${club.provenance.retrievedAt}`} />
      ) : null}
      <SourceNote label={t.provenance.gap} />
    </footer>
  );
}

function pillarsFor(
  club: ClubProfile,
  stats: ClubStatistics | null,
  locale: Locale,
): Array<{ key: string; label: string; value: string; note: string }> {
  const t = conceitoClubeStrings[locale];
  const out: Array<{ key: string; label: string; value: string; note: string }> = [];
  const titles = club.titles.items.length;
  if (titles > 0) {
    out.push({
      key: 'titles',
      label: t.pillars.titles,
      value: formatCount(titles, locale),
      note: t.pillars.titlesNote,
    });
  }
  if (stats && stats.overall.played > 0) {
    out.push({
      key: 'matches',
      label: t.pillars.matches,
      value: formatCount(stats.overall.played, locale),
      note: t.pillars.matchesNote,
    });
    out.push({
      key: 'goals',
      label: t.pillars.goals,
      value: formatCount(stats.overall.goalsFor, locale),
      note: t.pillars.goalsNote,
    });
  }
  const age = yearsSince(club.foundedYear);
  if (club.foundedYear != null) {
    out.push({
      key: 'founded',
      label: t.pillars.founded,
      value: String(club.foundedYear),
      note: age != null ? fillClube(t.pillars.foundedNote, { years: age }) : '',
    });
  }
  return out;
}

export default function ClubeFichaPageView({
  locale,
  club,
  stats,
  kits,
  anthem,
  pennants,
  crests,
  squad,
  timeline,
  relatedClubs,
  actions,
  crestsSlot,
  communitySlot,
}: ClubeFichaPageViewProps) {
  const t = conceitoClubeStrings[locale];
  const ws = wsC2Strings[locale].profile;
  const pillars = pillarsFor(club, stats, locale);
  const location = [t.kicker, club.city, club.state ?? club.country].filter(Boolean).join(' · ');
  const subtitleParts: string[] = [];
  if (club.foundedYear != null) {
    subtitleParts.push(fillClube(t.head.founded, { year: club.foundedYear }));
  }
  const stadium = club.media?.stadium?.name ?? club.infobox?.estadio ?? null;
  if (stadium) subtitleParts.push(stadium);
  const fans = club.fansCount ?? 0;
  if (fans > 0) {
    subtitleParts.push(fillClube(t.head.fans, { count: formatCount(fans, locale) }));
  }

  const statsRows = stats ? groupCompetitionStats(stats.byCompetition) : [];
  const hasStats = Boolean(stats && (stats.overall.played > 0 || statsRows.length > 0));

  const editorial = club.editorial ?? null;
  const editorialText =
    editorialEntry(club, locale)?.extract ??
    editorial?.pt?.extract ??
    editorial?.en?.extract ??
    editorial?.es?.extract ??
    null;

  const renderedGaps = club.gaps.filter((gap) => {
    if (gap === 'squad_not_available') return !(squad && squad.length > 0);
    if (gap === 'kits_not_available') return !(kits && kits.length > 0);
    if (gap === 'anthem_not_available') return !anthem;
    if (gap === 'stadium_not_available') return !(stadium != null);
    if (gap === 'history_not_available') return !editorialText;
    if (gap === 'matches_not_available') return !(stats && stats.overall.played > 0);
    return true;
  });

  const actionsNode = (
    <>
      {actions}
      {club.qid ? (
        <a
          href={`https://www.wikidata.org/wiki/${club.qid}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-6 items-center text-[13px] text-primary-ink underline decoration-dotted underline-offset-2"
        >
          {club.qid} · {ws.wikidata}
        </a>
      ) : null}
      {club.gender === 'women' ? (
        <span
          className="inline-flex min-h-6 items-center rounded-[2px] border border-primary/30 bg-primary/10 px-2 text-[11px] text-primary-ink"
          data-testid="club-gender-women"
        >
          {ws.genderWomen}
        </span>
      ) : null}
    </>
  );

  return (
    <div className="pb-16">
      <header>
        <p className="text-[11px] font-semibold uppercase leading-none tracking-[0.2em] text-ink-3">
          {location}
        </p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-[16rem] flex-1">
            <FichaHead
              title={club.name}
              subtitle={subtitleParts.length > 0 ? subtitleParts.join(' · ') : undefined}
              actions={actionsNode}
            />
            {club.fullName || club.shortName ? (
              <p className="mt-1 text-[13px] text-ink-2">
                {club.fullName ?? club.shortName}
                {club.fullName && club.shortName ? ` (${club.shortName})` : null}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-start justify-end gap-4">
            {club.rankings.available && club.rankings.items[0] ? (
              <RankingMini ranking={club.rankings.items[0]} locale={locale} />
            ) : null}
            <CrestFrame club={club} crests={crests} locale={locale} />
          </div>
        </div>
      </header>

      {pillars.length > 0 ? (
        <section
          className="mt-6 border-t-2 border-foreground pt-5"
          data-testid="club-pillars"
          aria-label={t.kicker}
        >
          <dl className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
            {pillars.map((pillar, index) => (
              <div key={pillar.key} data-testid={`club-pillar-${pillar.key}`}>
                <Pillar
                  label={pillar.label}
                  value={pillar.value}
                  note={pillar.note || undefined}
                  accent={index === 0}
                />
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <TrophyRow club={club} locale={locale} />

      <AboutSection club={club} locale={locale} />

      {hasStats && stats ? (
        <section
          className="mt-8 border-t border-border pt-5"
          data-testid="club-statistics"
          aria-label={t.stats.heading}
        >
          <SectionHeading>{t.stats.heading}</SectionHeading>
          {statsRows.length > 0 ? (
            <div
              className="overflow-x-auto"
              role="region"
              aria-label={t.stats.caption}
              tabIndex={0}
            >
              <table
                className="w-full min-w-[720px] border-collapse text-[13px]"
                data-testid="club-stats-by-competition"
              >
                <caption className="sr-only">{t.stats.caption}</caption>
                <thead>
                  <tr>
                    <th scope="col" className={`${HEADER_CELL} text-left`}>
                      {t.stats.columns.competition}
                    </th>
                    {(
                      [
                        'played',
                        'wins',
                        'draws',
                        'losses',
                        'goalsFor',
                        'goalsAgainst',
                        'pct',
                      ] as const
                    ).map((column) => (
                      <th key={column} scope="col" className={`${HEADER_CELL} pl-3 text-right`}>
                        {t.stats.columns[column]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {statsRows.map((row, index) => (
                    <tr key={row.key} className={index % 2 === 1 ? 'bg-surface-2' : undefined}>
                      <td className={`${CELL} pr-4 font-semibold text-foreground`}>
                        {row.name ?? GAP}
                      </td>
                      <td className={`${NUM_CELL} pl-3 text-ink-2`}>{row.played}</td>
                      <td className={`${NUM_CELL} pl-3 text-ink-2`}>{row.wins}</td>
                      <td className={`${NUM_CELL} pl-3 text-ink-2`}>{row.draws}</td>
                      <td className={`${NUM_CELL} pl-3 text-ink-2`}>{row.losses}</td>
                      <td className={`${NUM_CELL} pl-3 text-ink-2`}>{row.goalsFor}</td>
                      <td className={`${NUM_CELL} pl-3 text-ink-2`}>{row.goalsAgainst}</td>
                      <td className={`${NUM_CELL} pl-3 font-semibold text-foreground`}>
                        {row.percentage != null ? `${row.percentage}%` : GAP}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title={t.stats.empty} body={t.stats.emptyBody} />
          )}

          <h3 className="mt-6 text-[11px] uppercase tracking-[0.12em] text-ink-3">
            {t.stats.overallHeading}
          </h3>
          <div className="mt-2 overflow-x-auto">
            <table
              className="w-full min-w-[560px] border-collapse text-[13px]"
              data-testid="club-stats-overall"
            >
              <caption className="sr-only">{t.stats.overallCaption}</caption>
              <thead>
                <tr>
                  <th scope="col" className={`${HEADER_CELL} text-left`}>
                    &nbsp;
                  </th>
                  {(['played', 'wins', 'draws', 'losses', 'goalsFor', 'goalsAgainst'] as const).map(
                    (column) => (
                      <th key={column} scope="col" className={`${HEADER_CELL} pl-3 text-right`}>
                        {t.stats.columns[column]}
                      </th>
                    ),
                  )}
                  <th scope="col" className={`${HEADER_CELL} pl-3 text-right`}>
                    {ws.points}
                  </th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    { label: t.stats.overall, row: stats.overall, points: stats.overall.points },
                    { label: t.stats.home, row: stats.overall.home, points: null },
                    { label: t.stats.away, row: stats.overall.away, points: null },
                  ] as const
                ).map(({ label, row, points }, index) => (
                  <tr key={label} className={index % 2 === 1 ? 'bg-surface-2' : undefined}>
                    <td className={`${CELL} pr-4 font-semibold text-foreground`}>{label}</td>
                    <td className={`${NUM_CELL} pl-3 text-ink-2`}>{row.played}</td>
                    <td className={`${NUM_CELL} pl-3 text-ink-2`}>{row.wins}</td>
                    <td className={`${NUM_CELL} pl-3 text-ink-2`}>{row.draws}</td>
                    <td className={`${NUM_CELL} pl-3 text-ink-2`}>{row.losses}</td>
                    <td className={`${NUM_CELL} pl-3 text-ink-2`}>{row.goalsFor}</td>
                    <td className={`${NUM_CELL} pl-3 text-ink-2`}>{row.goalsAgainst}</td>
                    <td className={`${NUM_CELL} pl-3 text-ink-2`}>
                      {points != null ? formatCount(points, locale) : GAP}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <SourceNote label={t.stats.note} />
        </section>
      ) : stats ? (
        <section
          className="mt-8 border-t border-border pt-5"
          data-testid="club-statistics"
          aria-label={t.stats.heading}
        >
          <SectionHeading>{t.stats.heading}</SectionHeading>
          <EmptyState title={t.stats.empty} body={t.stats.emptyBody} />
        </section>
      ) : null}

      {stats ? <RivalsSection stats={stats} locale={locale} /> : null}
      <HonoursSection club={club} locale={locale} />
      {squad && squad.length > 0 ? <SquadSection squad={squad} locale={locale} /> : null}
      {kits && kits.length > 0 ? <KitsSection kits={kits} locale={locale} /> : null}
      {pennants && pennants.length > 0 ? (
        <PennantsSection pennants={pennants} locale={locale} />
      ) : null}
      {anthem ? <AnthemSection anthem={anthem} locale={locale} /> : null}

      <Complementos
        club={club}
        locale={locale}
        timeline={timeline}
        relatedClubs={relatedClubs}
        crests={crests}
        crestsSlot={crestsSlot}
        gaps={renderedGaps}
      />

      {communitySlot ? (
        <div className="mt-8 border-t border-border pt-5" data-testid="club-community-slot">
          {communitySlot}
        </div>
      ) : null}

      <ProvenanceFooter
        club={club}
        locale={locale}
        stats={stats}
        kits={kits}
        pennants={pennants}
        anthem={anthem}
        crests={crests}
      />
    </div>
  );
}
