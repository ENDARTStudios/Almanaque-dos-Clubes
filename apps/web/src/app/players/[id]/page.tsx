import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getApiBase } from '@/lib/api-base';
import { getDictionary } from '@/i18n/getDictionary';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';
import { safeJsonLd } from '@/lib/json-ld';
import { formatCount, formatDate } from '@/lib/format';
import FavoriteButton from '@/components/FavoriteButton';
import SocialLinks from '@/components/SocialLinks';
import { PlayerPhoto } from '@/components/MediaAssets';
import { CountryFlag } from '@/components/CountryFlag';
import PlayerGoalsByStintChart from '@/components/PlayerGoalsByStintChart';
import { wIconsStrings, positionLabel } from '@/i18n/wsIcons';
import { wt579Strings } from '@/i18n/wsT579';

interface Player {
  id: string;
  fansCount?: number | null;
  officialSite?: string | null;
  socialLinks?: Record<string, { handle: string; url: string } | null> | null;
  followersSnapshot?: (Record<string, number | null> & { updatedAt?: string }) | null;
  fullName: string;
  shortName?: string | null;
  birthDate?: string | null;
  country?: string | null;
  position?: string | null;
  qid?: string | null;
  importedFrom?: string | null;
  sourceUrl?: string | null;
  // T-22.3 — perfil enriquecido via Wikidata (bot enrich-player-profiles).
  nickname?: string | null;
  heightCm?: number | null;
  preferredFoot?: string | null; // 'left' | 'right' | 'both'
  individualAwards?: Array<{
    qid: string;
    label: string;
    year: number | null;
    sourceUrl: string | null;
  }> | null;
  // DERIVADO na API de birthDate (nunca armazenado); null quando não há data.
  age?: number | null;
}

interface ProfileExtras {
  currentClub: { id: string; name: string } | null;
  career: Array<{
    year: number | null;
    endYear: number | null;
    apps: number | null;
    goals: number | null;
    clubId: string;
    clubName: string;
  }>;
  achievements: Array<{ competitionId: string; competitionName: string; year: number | null }>;
  clubs: Array<{ id: string; name: string; country: string | null }>;
  metrics: { totalApps: number; totalGoals: number; titlesCount: number; awardsCount: number };
  individualAwards: Array<{
    qid: string;
    label: string;
    year: number | null;
    sourceUrl: string | null;
  }>;
}

async function getPlayer(
  id: string,
): Promise<{ data: Player; profile: ProfileExtras | null } | null> {
  try {
    const res = await fetch(`${getApiBase()}/players/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.data) return null;
    return { data: json.data as Player, profile: (json.profile ?? null) as ProfileExtras | null };
  } catch {
    return null;
  }
}

/** Temporada honesta: "1956–1974" fechada; "1956–" em aberto (sem inventar fim). */
function seasonLabel(row: { year: number | null; endYear: number | null }): string {
  if (row.year == null) return '—';
  return row.endYear != null ? `${row.year}–${row.endYear}` : `${row.year}–`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const res = await getPlayer(id);
  if (!res) return { title: 'Jogador não encontrado' };
  const p = res.data;
  return { title: p.fullName, description: `${p.fullName} — ${p.country ?? ''}` };
}

export default async function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await getPlayer(id);
  if (!res) notFound();
  const p = res.data;
  const profile = res.profile;
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const dict = getDictionary(locale);
  const t = dict.pages.playerProfile;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: p.fullName,
    birthDate: p.birthDate ? String(p.birthDate).slice(0, 10) : undefined,
    nationality: p.country ?? undefined,
  };

  // T-22.3 — identidade: data completa formatada + idade derivada (a API manda
  // `age`; ausente = não renderiza — nunca "—: null").
  const birth = p.birthDate != null ? `${formatDate(p.birthDate, locale)}` : null;
  const birthValue =
    birth != null && p.age != null
      ? `${birth} · ${t.ageYears.replace('{age}', String(p.age))}`
      : birth;
  const footLabel =
    p.preferredFoot === 'left'
      ? t.footLeft
      : p.preferredFoot === 'right'
        ? t.footRight
        : p.preferredFoot === 'both'
          ? t.footBoth
          : null;

  // T576 — sem foto oficial no acervo, o cabeçalho usa o OBJETO autoral da posição (a luva
  // do goleiro, a caneleira do zagueiro, a bola, a chuteira) e DECLARA que é ilustração
  // genérica — nunca uma figura humana nem um retrato de pessoa real.
  const photoUrl = (p as { photoUrl?: string | null }).photoUrl ?? null;
  const ic = wIconsStrings[locale];
  const positionName = positionLabel(locale, p.position);
  const photoIllustration = positionName
    ? ic.playerPhotoWithPosition.replace('{position}', positionName)
    : ic.playerPhoto;

  // Colunas de jogos/gols só existem quando HÁ dado (honesto: sem coluna vazia).
  const hasAppsColumn = (profile?.career ?? []).some((r) => r.apps != null);
  const hasGoalsColumn = (profile?.career ?? []).some((r) => r.goals != null);

  // Gráfico de gols por passagem: só com ≥2 passagens com gols (1 ponto não é tendência).
  const stintsWithGoals = (profile?.career ?? []).filter((r) => r.goals != null && r.goals > 0);
  const metricsCards = profile
    ? [
        { value: profile.metrics.totalApps, label: t.apps },
        { value: profile.metrics.totalGoals, label: t.goals },
        { value: profile.metrics.titlesCount, label: t.metricTitles },
        { value: profile.metrics.awardsCount, label: t.metricAwards },
      ]
    : [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <Link
        href="/players"
        className="text-sm text-primary-ink hover:underline mb-6 inline-block cursor-pointer"
      >
        &larr; Voltar para Jogadores
      </Link>
      <div className="bg-background rounded-2xl p-8 shadow-md border border-border/50">
        <div className="flex items-start gap-6">
          <PlayerPhoto photoUrl={photoUrl} name={p.fullName} position={p.position} size={80} />
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground">
              {p.fullName}
            </h1>
            <div className="mt-3">
              <FavoriteButton
                targetType="player"
                targetId={p.id}
                initialCount={p.fansCount ?? undefined}
                countLabel="fãs"
              />
            </div>
            {p.shortName && <p className="text-sm text-foreground/70">({p.shortName})</p>}
            {p.nickname && (
              <p className="text-sm text-foreground/70">
                {t.nickname}: {p.nickname}
              </p>
            )}
            {!photoUrl && (
              <p
                className="text-xs text-foreground/70 mt-2"
                data-testid="player-photo-illustration"
              >
                {photoIllustration}
              </p>
            )}
            {profile?.currentClub ? (
              <p className="text-sm text-foreground/70 mt-2">
                {t.currentClub}:{' '}
                <Link
                  href={`/clubs/${profile.currentClub.id}`}
                  className="text-primary-ink hover:underline"
                >
                  {profile.currentClub.name}
                </Link>
              </p>
            ) : null}
          </div>
        </div>
        <SocialLinks
          officialSite={p.officialSite ?? null}
          socialLinks={p.socialLinks ?? null}
          followersSnapshot={p.followersSnapshot ?? null}
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mt-8 pt-8 border-t border-border/50">
          {/* T579 (ITEM 19) — o país do jogador vira bandeira CLICÁVEL para os clubes
              daquele país (`/clubs?country=BR`, filtro existente) com o país por extenso no
              nome acessível; antes era a sigla ISO2 crua, sem nome e sem destino. */}
          {p.country && (
            <InfoItem
              label={wt579Strings[locale].labels.country}
              value={
                <CountryFlag
                  code={p.country}
                  locale={locale}
                  basePath="/clubs"
                  destination="clubs"
                />
              }
            />
          )}
          {/* T-22.3 — campo ausente NÃO renderiza (sem "—: null"). */}
          {(positionName || p.position) && (
            <InfoItem label={t.position} value={positionName ?? p.position} />
          )}
          {birthValue && <InfoItem label={t.birth} value={birthValue} />}
          {p.heightCm != null && (
            <InfoItem
              label={t.height}
              value={t.heightCmValue.replace('{cm}', String(p.heightCm))}
            />
          )}
          {footLabel && <InfoItem label={t.preferredFoot} value={footLabel} />}
          {p.qid && <InfoItem label="Wikidata" value={p.qid} />}
          {p.importedFrom && <InfoItem label="Origem" value={p.importedFrom} />}
          {p.sourceUrl && (
            <InfoItem
              label="Fonte (Wikidata)"
              value={
                <a
                  href={p.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary-ink hover:underline"
                >
                  Ver no Wikidata
                </a>
              }
            />
          )}
        </div>

        {/* Métricas (T-22.3) — 4 totais; zero continua zero (dado honesto), o cartão
            só desaparece quando a API nem devolveu metrics. */}
        {profile && (
          <section aria-labelledby="player-metrics" className="mt-8 pt-8 border-t border-border/50">
            <h2 id="player-metrics" className="text-lg font-heading font-semibold mb-3">
              {t.metricsTitle}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {metricsCards.map((card) => (
                <div key={card.label} className="rounded-xl border border-border bg-muted p-5">
                  <p className="font-heading text-2xl font-bold text-foreground">
                    {formatCount(card.value, locale)}
                  </p>
                  <p className="text-xs text-foreground/70 uppercase tracking-wider mt-1">
                    {card.label}
                  </p>
                </div>
              ))}
            </div>
            {stintsWithGoals.length >= 2 && (
              <div className="mt-6">
                <h3 className="text-sm font-heading font-semibold mb-2 text-foreground">
                  {t.goalsByStintTitle}
                </h3>
                <PlayerGoalsByStintChart
                  items={stintsWithGoals.map((r) => ({
                    label: `${r.clubName} ${seasonLabel(r)}`,
                    goals: r.goals as number,
                  }))}
                  barLabel={t.goals}
                  ariaLabel={t.goalsByStintAria}
                />
              </div>
            )}
          </section>
        )}

        {/* Carreira */}
        <section aria-labelledby="player-career" className="mt-8 pt-8 border-t border-border/50">
          <h2 id="player-career" className="text-lg font-heading font-semibold mb-3">
            {t.careerTitle}
          </h2>
          {profile && profile.career.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-foreground/5 text-left">
                    <th scope="col" className="px-4 py-3 font-semibold">
                      {t.season}
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      {t.club}
                    </th>
                    {hasAppsColumn && (
                      <th scope="col" className="px-4 py-3 font-semibold">
                        {t.apps}
                      </th>
                    )}
                    {hasGoalsColumn && (
                      <th scope="col" className="px-4 py-3 font-semibold">
                        {t.goals}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {profile.career.map((row, i) => (
                    <tr key={`${row.clubId}-${row.year}-${i}`} className="border-t border-border">
                      <td className="px-4 py-3 font-semibold">{seasonLabel(row)}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/clubs/${row.clubId}`}
                          className="text-primary-ink hover:underline"
                        >
                          {row.clubName}
                        </Link>
                      </td>
                      {hasAppsColumn && <td className="px-4 py-3">{row.apps ?? '—'}</td>}
                      {hasGoalsColumn && <td className="px-4 py-3">{row.goals ?? '—'}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-foreground/60" data-testid="career-empty">
              {t.careerEmpty}
            </p>
          )}
        </section>

        {/* Conquistas */}
        <section aria-labelledby="player-achievements" className="mt-8">
          <h2 id="player-achievements" className="text-lg font-heading font-semibold mb-3">
            {t.achievementsTitle}
          </h2>
          {profile && profile.achievements.length > 0 ? (
            <ul className="space-y-2">
              {profile.achievements.map((a, i) => (
                <li
                  key={`${a.competitionId}-${a.year}-${i}`}
                  className="rounded-xl border border-border p-4 text-sm"
                >
                  <Link
                    href={`/competitions/${a.competitionId}`}
                    className="text-primary-ink hover:underline font-semibold"
                  >
                    {a.competitionName}
                  </Link>
                  {a.year != null ? <span className="text-foreground/70"> · {a.year}</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-foreground/60" data-testid="achievements-empty">
              {t.achievementsEmpty}
            </p>
          )}
        </section>

        {/* Prêmios individuais (T-22.3 — P166 Wikidata, proveniência por item) */}
        <section aria-labelledby="player-individual-awards" className="mt-8">
          <h2 id="player-individual-awards" className="text-lg font-heading font-semibold mb-3">
            {t.individualAwardsTitle}
          </h2>
          {profile && profile.individualAwards.length > 0 ? (
            <ul className="space-y-2">
              {profile.individualAwards.map((a, i) => (
                <li
                  key={`${a.qid}-${a.year}-${i}`}
                  className="rounded-xl border border-border p-4 text-sm"
                >
                  {a.sourceUrl ? (
                    <a
                      href={a.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-ink hover:underline font-semibold"
                    >
                      {a.label}
                    </a>
                  ) : (
                    <span className="font-semibold">{a.label}</span>
                  )}
                  {a.year != null ? <span className="text-foreground/70"> · {a.year}</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-foreground/60" data-testid="individual-awards-empty">
              {t.individualAwardsEmpty}
            </p>
          )}
        </section>

        {/* Clubes */}
        <section aria-labelledby="player-clubs" className="mt-8">
          <h2 id="player-clubs" className="text-lg font-heading font-semibold mb-3">
            {t.clubsTitle}
          </h2>
          {profile && profile.clubs.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {profile.clubs.map((c) => (
                <Link
                  key={c.id}
                  href={`/clubs/${c.id}`}
                  className="block bg-background rounded-xl p-4 shadow-sm border border-border/50 hover:border-primary/40 transition-colors"
                >
                  <p className="font-heading font-semibold text-foreground">{c.name}</p>
                  {c.country ? (
                    <CountryFlag code={c.country} locale={locale} className="mt-1" />
                  ) : null}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-foreground/60" data-testid="clubs-empty">
              {t.clubsEmpty}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-foreground/70 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
    </div>
  );
}
