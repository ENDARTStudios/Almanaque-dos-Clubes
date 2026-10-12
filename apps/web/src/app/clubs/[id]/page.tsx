import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getApiBase } from '@/lib/api-base';
import { safeJsonLd } from '@/lib/json-ld';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';
import { wsC2Strings } from '@/i18n/wsC2';
import FavoriteButton from '@/components/FavoriteButton';
import KitDiagram from '@/components/KitDiagram';
import SocialLinks from '@/components/SocialLinks';
import { ClubCrest } from '@/components/MediaAssets';
import ClubTimeline from '@/components/ClubTimeline';
import RelatedClubs from '@/components/RelatedClubs';
import ClubCommunity from '@/components/ClubCommunity';

// WS-C-2 — perfil público consolidado. Fonte única: GET /api/v1/clubs/:id/profile.
// Renderiza SOMENTE o que a API entrega; lacunas declaradas como lacunas (nunca inventadas).

interface GeoAttribution {
  geo: string;
  source: string;
  license: string;
}
interface ClubProfile {
  id: string;
  qid: string | null;
  name: string;
  fansCount?: number | null;
  website?: string | null;
  infobox?: Record<string, string> | null;
  /** T507 — texto editorial por idioma (Wikipedia, CC-BY-SA). */
  editorial?: Record<string, { extract?: string; sourceUrl?: string } | null> | null;
  socialLinks?: Record<string, { handle: string; url: string } | null> | null;
  followersSnapshot?: (Record<string, number | null> & { updatedAt?: string }) | null;
  fullName: string | null;
  shortName: string | null;
  status: string;
  /** T450 — 'men' | 'women' | 'mixed' (default 'men' para o acervo existente). */
  gender?: 'men' | 'women' | 'mixed';
  country: string | null;
  state: string | null;
  city: string | null;
  foundedYear: number | null;
  geo: {
    latitude: number | null;
    longitude: number | null;
    coordSource: string | null;
    coordPrecision: string | null;
    attribution: GeoAttribution | null;
  };
  provenance: {
    source: 'wikidata' | 'rsssf' | 'seed' | null;
    sourceUrl: string | null;
    importedFrom: string | null;
    retrievedAt: string | null;
  };
  titles: {
    available: boolean;
    items: Array<{
      year: number | null;
      season: string | null;
      competition: { id: string; name: string | null } | null;
      hierarchy: string;
      gender: 'men' | 'women';
      sourceUrl: string | null;
    }>;
    limitations: string[];
  };
  rankings: {
    available: boolean;
    items: Array<{
      rankingId: string;
      rankingName: string;
      scope: string | null;
      season: string | null;
      competitionId: string | null;
      competitionName: string | null;
      position: number | null;
      points: number | null;
      publishedAt: string | null;
    }>;
    limitations: string[];
  };
  competitions: {
    available: boolean;
    items: Array<{
      id: string;
      qid: string | null;
      name: string | null;
      type: string | null;
      country: string | null;
    }>;
    limitations: string[];
  };
  related: {
    available: boolean;
    items: Array<{
      relation: string;
      direction: 'source' | 'target';
      otherId: string;
      otherType: string;
      sourceUrl: string | null;
    }>;
    limitations: string[];
  };
  gaps: string[];
}

interface ClubStatisticsPayload {
  overall: {
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDiff: number;
    points: number;
    home: {
      played: number;
      wins: number;
      draws: number;
      losses: number;
      goalsFor: number;
      goalsAgainst: number;
    };
    away: {
      played: number;
      wins: number;
      draws: number;
      losses: number;
      goalsFor: number;
      goalsAgainst: number;
    };
  };
  byCompetition: Array<{
    competitionName: string | null;
    season: string | null;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    points: number;
  }>;
  topRivals: Array<{
    opponentId: string;
    opponentName: string;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
  }>;
  opponents: number;
}

interface KitEntryPayload {
  season: string | null;
  type: string;
  label: string;
  parts?: Record<
    string,
    {
      pattern: string | null;
      color: string | null;
      file: string | null;
      fileUrl: string | null;
      license: string | null;
    }
  >;
  image?: { url: string; sourceUrl: string; license: string };
  sourceUrl: string;
}

interface AnthemPayload {
  composer: string | null;
  lyricist: string | null;
  year: number | null;
  official: boolean | null;
  label: string | null;
  note: string | null;
  audioUrl: string | null;
  audioLicense: string | null;
  audioSourceUrl: string | null;
  lyrics: null;
  lyricsRestricted: boolean;
  sourceUrl: string;
  attribution: string;
}

async function getAnthem(id: string): Promise<AnthemPayload | null> {
  try {
    const res = await fetch(`${getApiBase()}/clubs/${id}/anthem`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data as { anthem: AnthemPayload | null }).anthem ?? null;
  } catch {
    return null;
  }
}

async function getKits(id: string): Promise<KitEntryPayload[] | null> {
  try {
    const res = await fetch(`${getApiBase()}/clubs/${id}/kits`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data as { kits: KitEntryPayload[] }).kits ?? null;
  } catch {
    return null;
  }
}

async function getStatistics(id: string): Promise<ClubStatisticsPayload | null> {
  try {
    const res = await fetch(`${getApiBase()}/clubs/${id}/statistics`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data as ClubStatisticsPayload;
  } catch {
    return null;
  }
}

async function getProfile(id: string): Promise<ClubProfile | null> {
  try {
    const res = await fetch(`${getApiBase()}/clubs/${id}/profile`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data as ClubProfile;
  } catch {
    return null;
  }
}

async function getLocale() {
  const store = await cookies();
  return normalizeLocale(store.get(LOCALE_COOKIE)?.value);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const club = await getProfile(id);
  if (!club) return { title: 'Clube não encontrado', robots: { index: false } };
  const place = [club.city, club.state, club.country].filter(Boolean).join(', ');
  return {
    title: `{name}${place ? ` — ${place}` : ''}`.replace('{name}', club.name),
    description: `${club.name}${club.fullName ? ` (${club.fullName})` : ''}${place ? ` — ${place}` : ''}. Perfil auditável com proveniência (Wikidata/RSSSF).`,
    alternates: { canonical: `/clubs/${club.id}` },
    openGraph: {
      title: club.name,
      description: place ? `${club.name} — ${place}` : club.name,
      type: 'profile',
    },
  };
}

export default async function ClubDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const club = await getProfile(id);
  if (!club) notFound();
  const [stats, kits, anthem] = await Promise.all([getStatistics(id), getKits(id), getAnthem(id)]);
  const locale = await getLocale();
  const s = wsC2Strings[locale].profile;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsTeam',
    name: club.name,
    alternateName: club.fullName ?? undefined,
    sameAs: club.provenance.sourceUrl ?? undefined,
    location: club.city ? { '@type': 'City', name: club.city } : undefined,
    country: club.country ?? undefined,
    foundingDate: club.foundedYear ? `${club.foundedYear}` : undefined,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <Link
        href="/clubs"
        className="text-sm text-primary hover:underline mb-6 inline-block cursor-pointer"
      >
        &larr; {s.backToClubs}
      </Link>

      <header className="bg-background rounded-2xl p-6 sm:p-8 shadow-md border border-border/50">
        <div className="flex items-start gap-6">
          <ClubCrest
            logoUrl={(club as { media?: { logoUrl?: string | null } }).media?.logoUrl}
            name={club.name}
            size={80}
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground">
              {club.name}
            </h1>
            {club.fullName && <p className="text-foreground/60 mt-1">{club.fullName}</p>}
            {club.shortName && <p className="text-sm text-foreground/40">({club.shortName})</p>}
            {club.gender === 'women' && (
              <span
                className="inline-block mt-1 text-xs bg-primary/10 text-primary border border-primary/30 rounded-full px-2 py-0.5"
                data-testid="club-gender-women"
              >
                ♀ Feminino
              </span>
            )}
            <div className="flex flex-wrap gap-3 mt-3 text-sm">
              {club.qid && (
                <a
                  href={`https://www.wikidata.org/wiki/${club.qid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {club.qid} · {s.wikidata}
                </a>
              )}
            </div>
          </div>
          <div className="shrink-0">
            <FavoriteButton
              clubId={club.id}
              initialCount={club.fansCount ?? undefined}
              countLabel="torcedores"
            />
          </div>
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-6 mt-8 pt-8 border-t border-border/50">
          {club.country && <InfoItem label={s.country} value={club.country} />}
          {club.city && <InfoItem label={s.city} value={club.city} />}
          {club.state && <InfoItem label={s.state} value={club.state} />}
          {club.foundedYear && <InfoItem label={s.founded} value={String(club.foundedYear)} />}
          {club.status && <InfoItem label={s.status} value={club.status} />}
        </dl>
        <div className="mt-6">
          <SocialLinks
            officialSite={club.website ?? null}
            socialLinks={club.socialLinks ?? null}
            followersSnapshot={club.followersSnapshot ?? null}
          />
        </div>
        {club.infobox && (
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-6 mt-8">
            {club.infobox.estadio && <InfoItem label="Estádio" value={club.infobox.estadio} />}
            {club.infobox.capacidade && (
              <InfoItem label="Capacidade" value={club.infobox.capacidade} />
            )}
            {club.infobox.presidente && (
              <InfoItem label="Presidente" value={club.infobox.presidente} />
            )}
            {club.infobox.treinador && (
              <InfoItem label="Treinador" value={club.infobox.treinador} />
            )}
            {club.infobox.alcunhas && <InfoItem label="Alcunhas" value={club.infobox.alcunhas} />}
            {club.infobox.mascote && <InfoItem label="Mascote" value={club.infobox.mascote} />}
            {club.infobox.local && <InfoItem label="Local" value={club.infobox.local} />}
          </dl>
        )}
      </header>

      {/* WS-C-9 Modo Clube — seção Comunidade (client): descrição da comunidade
          (aditiva aos dados oficiais), editores e botão "Sou editor". */}
      <ClubCommunity clubId={club.id} />

      <Section title={s.provenance}>
        <ul className="text-sm space-y-1">
          {club.provenance.source && (
            <li>
              {s.source}: <span className="font-medium uppercase">{club.provenance.source}</span>
              {club.provenance.sourceUrl && (
                <>
                  {' · '}
                  <a
                    href={club.provenance.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {club.provenance.sourceUrl}
                  </a>
                </>
              )}
            </li>
          )}
          {club.provenance.importedFrom && (
            <li className="text-foreground/60">
              {s.importedFrom}: {club.provenance.importedFrom}
            </li>
          )}
          {club.provenance.retrievedAt && (
            <li className="text-foreground/60">
              {s.retrievedAt}: {club.provenance.retrievedAt}
            </li>
          )}
          {!club.provenance.source && !club.provenance.sourceUrl && (
            <li className="text-foreground/50">{s.notAvailable}</li>
          )}
        </ul>
      </Section>

      <Section title={s.geography}>
        {club.geo.latitude != null && club.geo.longitude != null ? (
          <div className="text-sm space-y-2">
            <p>
              {s.coordinates}:{' '}
              <span className="font-mono tabular-nums">
                {club.geo.latitude.toFixed(4)}, {club.geo.longitude.toFixed(4)}
              </span>
              {club.geo.coordPrecision === 'municipality' ||
              club.geo.coordPrecision === 'approximate' ? (
                <span className="text-foreground/50"> · {s.coordApprox}</span>
              ) : null}
            </p>
            {club.geo.attribution && (
              <p
                data-testid="geo-attribution"
                className="text-xs text-foreground/60 border border-border/60 rounded-lg px-3 py-2 inline-block"
              >
                {club.geo.attribution.geo}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-foreground/50">{s.noGeo}</p>
        )}
      </Section>

      <Section title={s.titles} testid="club-honour-gallery">
        {club.titles.available ? (
          <ul className="divide-y divide-border/50">
            {club.titles.items.map((tl, i) => (
              <li
                key={`${tl.competition?.id ?? 'x'}-${tl.year ?? i}`}
                data-testid="club-honour-title"
                className="flex items-center justify-between gap-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {tl.competition?.id ? (
                      <Link
                        href={`/competitions/${tl.competition.id}`}
                        className="hover:text-primary transition-colors"
                      >
                        {tl.competition.name ?? '—'}
                      </Link>
                    ) : (
                      (tl.competition?.name ?? '—')
                    )}
                  </p>
                  <p className="text-xs text-foreground/40 mt-0.5">
                    {tl.hierarchy}
                    {tl.gender === 'women' ? ` · ${s.genderWomen}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-heading font-semibold text-primary tabular-nums">
                    {tl.year ?? '—'}
                  </span>
                  {tl.sourceUrl && (
                    <a
                      href={tl.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-foreground/40 hover:text-primary underline decoration-dotted underline-offset-2"
                    >
                      {s.source}
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-foreground/50">{s.notAvailable}</p>
        )}
      </Section>

      <Section title={s.rankings}>
        {club.rankings.available ? (
          <ul className="divide-y divide-border/50">
            {club.rankings.items.map((r) => (
              <li
                key={`${r.rankingId}-${r.position ?? ''}`}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{r.rankingName}</p>
                  <p className="text-xs text-foreground/40 mt-0.5">
                    {r.competitionName ?? r.scope ?? ''}
                    {r.season ? ` · ${s.season} ${r.season}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0 text-sm tabular-nums">
                  {r.position != null && (
                    <span className="font-heading font-semibold text-primary">
                      {s.position} {r.position}
                    </span>
                  )}
                  {r.points != null && (
                    <span className="text-foreground/50 block text-xs">
                      {r.points} {s.points}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-foreground/50">{s.notAvailable}</p>
        )}
      </Section>

      {/* WS-C-5 — timeline cronológica (ARESTAS WON ordenadas por ano, proveniência por aresta). */}
      {/* T507 (W5) — Sobre: texto editorial (Wikipedia CC-BY-SA), fallback honesto. */}
      {(() => {
        const ed = club.editorial ?? null;
        const entry = ed?.[locale] ?? ed?.pt ?? ed?.en ?? ed?.es ?? null;
        const extract = entry?.extract ?? null;
        const sourceUrl = entry?.sourceUrl ?? null;
        return (
          <section aria-labelledby="club-about" className="mt-10" data-testid="club-about">
            <h2 id="club-about" className="text-xl font-heading font-semibold mb-3">
              {s.aboutTitle}
            </h2>
            {extract ? (
              <>
                <p className="text-sm leading-relaxed text-foreground/80">{extract}</p>
                {sourceUrl ? (
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-xs text-foreground/50 hover:text-primary underline decoration-dotted underline-offset-2"
                  >
                    {s.aboutSource}
                  </a>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-foreground/50">{s.aboutCataloging}</p>
            )}
          </section>
        );
      })()}

      <ClubTimeline clubId={club.id} locale={locale} />

      {kits && kits.length > 0 ? (
        <Section title={s.kits} testid="club-kits">
          <div className="flex flex-wrap gap-6">
            {kits.map((k, idx) => (
              <div key={`${k.season}-${k.type}-${idx}`} className="text-center">
                <KitDiagram
                  kit={{
                    season: k.season,
                    type: k.type,
                    label: k.label,
                    parts: k.parts as never,
                    image: k.image,
                    sourceUrl: k.sourceUrl,
                  }}
                />
                <p className="mt-1 text-xs text-foreground/70" data-testid="kit-label">
                  {k.season ? `${s.kitSeason}: ${k.season} · ` : ''}
                  {String(
                    s[
                      `kitType${k.type.charAt(0).toUpperCase()}${k.type.slice(1)}` as keyof typeof s
                    ] ?? k.type,
                  )}
                </p>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {anthem ? (
        <Section title={s.anthem} testid="club-anthem">
          <p className="text-sm text-foreground" data-testid="anthem-label">
            {anthem.label}
            {anthem.official === false ? ` · ${s.anthemUnofficial}` : ''}
          </p>
          {anthem.composer || anthem.lyricist || anthem.year ? (
            <p className="text-sm text-foreground/70 mt-1">
              {anthem.composer ? `${s.anthemComposer}: ${anthem.composer}` : ''}
              {anthem.lyricist && anthem.lyricist !== anthem.composer
                ? ` · ${s.anthemLyricist}: ${anthem.lyricist}`
                : ''}
              {anthem.year ? ` · ${s.anthemYear}: ${anthem.year}` : ''}
            </p>
          ) : null}
          {anthem.note ? <p className="text-sm text-foreground/50 mt-1">{anthem.note}</p> : null}
          {anthem.audioUrl ? (
            <div className="mt-3" data-testid="anthem-audio">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio controls preload="none" src={anthem.audioUrl} className="w-full max-w-md">
                <track kind="captions" />
              </audio>
              <p className="text-xs text-foreground/50 mt-1">
                <a
                  href={anthem.audioSourceUrl ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {anthem.audioLicense}
                </a>
              </p>
            </div>
          ) : null}
          {anthem.lyrics === null && anthem.lyricsRestricted ? (
            <p className="text-xs text-foreground/50 mt-2" data-testid="anthem-lyrics-note">
              {s.anthemLyricsRestricted}
            </p>
          ) : null}
          <p className="text-xs text-foreground/40 mt-2">
            <a
              href={anthem.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {anthem.attribution}
            </a>
          </p>
        </Section>
      ) : null}

      {stats && stats.overall.played > 0 ? (
        <Section title={s.statistics} testid="club-statistics">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse" data-testid="club-stats-overall">
              <thead>
                <tr className="text-left text-xs text-foreground/50 uppercase tracking-wider">
                  <th className="py-2 pr-4 font-semibold">&nbsp;</th>
                  <th className="py-2 px-2 font-semibold">{s.statsPlayed}</th>
                  <th className="py-2 px-2 font-semibold">{s.statsWins}</th>
                  <th className="py-2 px-2 font-semibold">{s.statsDraws}</th>
                  <th className="py-2 px-2 font-semibold">{s.statsLosses}</th>
                  <th className="py-2 px-2 font-semibold">{s.statsGoalsFor}</th>
                  <th className="py-2 px-2 font-semibold">{s.statsGoalsAgainst}</th>
                  <th className="py-2 px-2 font-semibold">{s.statsGoalDiff}</th>
                  <th className="py-2 px-2 font-semibold">{s.statsPoints}</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    [s.statsOverall, stats.overall],
                    [s.statsHome, { ...stats.overall.home, goalDiff: 0, points: 0 }],
                    [s.statsAway, { ...stats.overall.away, goalDiff: 0, points: 0 }],
                  ] as const
                ).map(([label, row]) => (
                  <tr key={label} className="border-t border-border/50">
                    <td className="py-2 pr-4 font-medium">{label}</td>
                    <td className="py-2 px-2">{row.played}</td>
                    <td className="py-2 px-2">{row.wins}</td>
                    <td className="py-2 px-2">{row.draws}</td>
                    <td className="py-2 px-2">{row.losses}</td>
                    <td className="py-2 px-2">{row.goalsFor}</td>
                    <td className="py-2 px-2">{row.goalsAgainst}</td>
                    <td className="py-2 px-2">{row.goalDiff}</td>
                    <td className="py-2 px-2 font-semibold">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {stats.byCompetition.length > 0 ? (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-foreground/70 mb-2">
                {s.statsByCompetition}
              </h3>
              <div className="overflow-x-auto">
                <table
                  className="w-full text-sm border-collapse"
                  data-testid="club-stats-by-competition"
                >
                  <tbody>
                    {stats.byCompetition.map((c) => (
                      <tr
                        key={`${c.competitionName ?? '-'}-${c.season ?? '-'}`}
                        className="border-t border-border/50"
                      >
                        <td className="py-2 pr-4 font-medium">
                          {c.competitionName ?? '—'}
                          {c.season ? (
                            <span className="text-foreground/50"> · {c.season}</span>
                          ) : null}
                        </td>
                        <td className="py-2 px-2 text-foreground/70">
                          {c.played} {s.statsPlayed.toLowerCase()} · {c.wins}V {c.draws}E {c.losses}
                          D · {c.goalsFor}:{c.goalsAgainst} · {c.points}{' '}
                          {s.statsPoints.toLowerCase()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {stats.topRivals.length > 0 ? (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-foreground/70 mb-2">{s.statsTopRivals}</h3>
              <ul className="text-sm space-y-1">
                {stats.topRivals.slice(0, 5).map((r) => (
                  <li key={r.opponentId} className="border-t border-border/50 py-1.5">
                    <Link href={`/clubs/${r.opponentId}`} className="text-primary hover:underline">
                      {r.opponentName}
                    </Link>{' '}
                    <span className="text-foreground/70">
                      — {r.played} {s.statsPlayed.toLowerCase()}: {r.wins}V {r.draws}E {r.losses}D ·{' '}
                      {r.goalsFor}:{r.goalsAgainst}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Section>
      ) : stats ? (
        <Section title={s.statistics} testid="club-statistics">
          <p className="text-sm text-foreground/50">{s.statsEmpty}</p>
        </Section>
      ) : null}

      <Section title={s.competitions}>
        {club.competitions.available ? (
          <ul className="flex flex-wrap gap-2">
            {club.competitions.items.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/competitions/${c.id}`}
                  className="inline-block text-sm rounded-lg border border-border px-3 py-1.5 hover:border-primary/50 hover:text-primary transition-colors"
                >
                  {c.name ?? '—'}
                  {c.country ? <span className="text-foreground/40"> · {c.country}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-foreground/50">{s.notAvailable}</p>
        )}
      </Section>

      {/* WS-C-5 — clubes relacionados (same_city/same_state/same_competition/rival explícito). */}
      <RelatedClubs clubId={club.id} locale={locale} />

      <Section title={s.related}>
        {club.related.available ? (
          <ul className="text-sm space-y-1">
            {club.related.items.slice(0, 50).map((e, i) => (
              <li key={`${e.relation}-${e.otherId}-${i}`} className="text-foreground/70">
                <span className="font-medium">{e.relation}</span> · {e.otherType} ·{' '}
                <span className="font-mono text-xs">{e.otherId}</span>
                {e.sourceUrl && (
                  <>
                    {' '}
                    <a
                      href={e.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {s.source}
                    </a>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-foreground/50">{s.notAvailable}</p>
        )}
      </Section>

      {club.gaps.length > 0 && (
        <Section title={s.gaps} testid="club-gaps">
          <p className="text-sm text-foreground/60 mb-3">{s.gapsIntro}</p>
          <ul className="flex flex-wrap gap-2">
            {club.gaps.map((g) => (
              <li
                key={g}
                className="text-xs rounded-full border border-dashed border-border px-3 py-1 text-foreground/50"
              >
                {s.gapLabels[g] ?? g}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  children,
  testid,
}: {
  title: string;
  children: React.ReactNode;
  testid?: string;
}) {
  return (
    <section
      className="mt-8 bg-background rounded-2xl p-6 sm:p-8 shadow-md border border-border/50"
      data-testid={testid}
    >
      <h2 className="text-xl font-heading font-bold text-foreground mb-4">{title}</h2>
      {children}
    </section>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-foreground/40 uppercase tracking-wider">{label}</dt>
      <dd className="text-sm font-medium text-foreground mt-0.5">{value}</dd>
    </div>
  );
}
