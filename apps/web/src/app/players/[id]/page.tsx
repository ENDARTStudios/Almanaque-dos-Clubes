import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getApiBase } from '@/lib/api-base';
import { getDictionary } from '@/i18n/getDictionary';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';
import { safeJsonLd } from '@/lib/json-ld';
import FavoriteButton from '@/components/FavoriteButton';
import SocialLinks from '@/components/SocialLinks';

interface Player {
  id: string;
  fansCount?: number | null;
  officialSite?: string | null;
  socialLinks?: Record<string, { handle: string; url: string } | null> | null;
  followersSnapshot?: Record<string, number | null> & { updatedAt?: string } | null;
  fullName: string;
  shortName?: string | null;
  birthDate?: string | null;
  country?: string | null;
  position?: string | null;
  qid?: string | null;
  importedFrom?: string | null;
  sourceUrl?: string | null;
}

interface ProfileExtras {
  currentClub: { id: string; name: string } | null;
  career: Array<{ year: number | null; clubId: string; clubName: string }>;
  achievements: Array<{ competitionId: string; competitionName: string; year: number | null }>;
  clubs: Array<{ id: string; name: string; country: string | null }>;
}

async function getPlayer(id: string): Promise<{ data: Player; profile: ProfileExtras | null } | null> {
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

  const birthYear = p.birthDate ? String(p.birthDate).slice(0, 4) : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <Link
        href="/players"
        className="text-sm text-primary hover:underline mb-6 inline-block cursor-pointer"
      >
        &larr; Voltar para Jogadores
      </Link>
      <div className="bg-background rounded-2xl p-8 shadow-md border border-border/50">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-heading font-bold text-2xl shrink-0">
            {p.fullName.slice(0, 2).toUpperCase()}
          </div>
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
            {p.shortName && <p className="text-sm text-foreground/40">({p.shortName})</p>}
            {profile?.currentClub ? (
              <p className="text-sm text-foreground/70 mt-2">
                {t.currentClub}:{' '}
                <Link href={`/clubs/${profile.currentClub.id}`} className="text-primary hover:underline">
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
          {p.country && <InfoItem label="País" value={p.country} />}
          {p.position && <InfoItem label="Posição" value={p.position} />}
          {birthYear && <InfoItem label="Nascimento" value={birthYear} />}
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
                  className="text-sm text-primary hover:underline"
                >
                  Ver no Wikidata
                </a>
              }
            />
          )}
        </div>

        {/* Carreira */}
        <section aria-labelledby="player-career" className="mt-8 pt-8 border-t border-border/50">
          <h2 id="player-career" className="text-lg font-heading font-semibold mb-3">{t.careerTitle}</h2>
          {profile && profile.career.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-foreground/5 text-left">
                    <th scope="col" className="px-4 py-3 font-semibold">{t.year}</th>
                    <th scope="col" className="px-4 py-3 font-semibold">{t.club}</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.career.map((row, i) => (
                    <tr key={`${row.clubId}-${row.year}-${i}`} className="border-t border-border">
                      <td className="px-4 py-3 font-semibold">{row.year}</td>
                      <td className="px-4 py-3">
                        <Link href={`/clubs/${row.clubId}`} className="text-primary hover:underline">
                          {row.clubName}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-foreground/60" data-testid="career-empty">{t.careerEmpty}</p>
          )}
        </section>

        {/* Conquistas */}
        <section aria-labelledby="player-achievements" className="mt-8">
          <h2 id="player-achievements" className="text-lg font-heading font-semibold mb-3">{t.achievementsTitle}</h2>
          {profile && profile.achievements.length > 0 ? (
            <ul className="space-y-2">
              {profile.achievements.map((a, i) => (
                <li key={`${a.competitionId}-${a.year}-${i}`} className="rounded-xl border border-border p-4 text-sm">
                  <Link href={`/competitions/${a.competitionId}`} className="text-primary hover:underline font-semibold">
                    {a.competitionName}
                  </Link>
                  {a.year != null ? <span className="text-foreground/50"> · {a.year}</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-foreground/60" data-testid="achievements-empty">{t.achievementsEmpty}</p>
          )}
        </section>

        {/* Clubes */}
        <section aria-labelledby="player-clubs" className="mt-8">
          <h2 id="player-clubs" className="text-lg font-heading font-semibold mb-3">{t.clubsTitle}</h2>
          {profile && profile.clubs.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {profile.clubs.map((c) => (
                <Link
                  key={c.id}
                  href={`/clubs/${c.id}`}
                  className="block bg-background rounded-xl p-4 shadow-sm border border-border/50 hover:border-primary/40 transition-colors"
                >
                  <p className="font-heading font-semibold text-foreground">{c.name}</p>
                  {c.country ? <p className="text-xs text-foreground/50 mt-1">{c.country}</p> : null}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-foreground/60" data-testid="clubs-empty">{t.clubsEmpty}</p>
          )}
        </section>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-foreground/40 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
    </div>
  );
}
