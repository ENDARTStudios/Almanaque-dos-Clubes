import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getApiBase } from '@/lib/api-base';
import { safeJsonLd } from '@/lib/json-ld';
import { getDictionary } from '@/i18n/getDictionary';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';
import FavoriteButton from '@/components/FavoriteButton';
import SocialLinks from '@/components/SocialLinks';

// Mapeamento do portal (Operador, 08/10 — Entrega 2): sub-abas Visão Geral |
// Edições | Clubes | Maiores Campeões sobre o overview WON da API. Honestidade:
// sem edições → "Edições em catalogação"; participantes = clubes com títulos
// catalogados (a aresta PARTICIPATED_IN não existe no grafo).

interface Competition {
  id: string;
  name: string;
  gender?: string | null;
  country?: string | null;
  type?: string | null;
  level?: number | null;
  fansCount?: number | null;
  officialSite?: string | null;
  socialLinks?: Record<string, { handle: string; url: string } | null> | null;
  followersSnapshot?: Record<string, number | null> & { updatedAt?: string } | null;
  qid?: string | null;
  importedFrom?: string | null;
}

interface Overview {
  editions: Array<{ year: number; champion: { id: string; name: string } }>;
  topWinners: Array<{ clubId: string; name: string; titles: number }>;
  participants: Array<{ id: string; name: string; city?: string | null; country?: string | null }>;
  totalEditions: number;
}

async function getCompetition(id: string) {
  try {
    const res = await fetch(`${getApiBase()}/competitions/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return { data: json.data as Competition | null, overview: (json.overview ?? null) as Overview | null };
  } catch {
    return null;
  }
}

const TABS = ['visao', 'edicoes', 'clubes', 'campeoes'] as const;
type Tab = (typeof TABS)[number];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const res = await getCompetition(id);
  if (!res?.data) return { title: 'Competição não encontrada' };
  return { title: res.data.name, description: `${res.data.name} — ${res.data.country ?? 'Internacional'}` };
}

export default async function CompetitionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const res = await getCompetition(id);
  if (!res?.data) notFound();
  const comp = res.data;
  const overview = res.overview;

  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const dict = getDictionary(locale);
  const t = dict.pages.competitionProfile;

  const tab: Tab = (TABS as readonly string[]).includes(tabParam ?? '') ? (tabParam as Tab) : 'visao';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: comp.name,
    location: comp.country ? { '@type': 'Country', name: comp.country } : undefined,
  };

  const currentChampion = overview?.editions?.[0] ?? null;

  const tabList: Array<{ id: Tab; label: string }> = [
    { id: 'visao', label: t.tabs.overview },
    { id: 'edicoes', label: t.tabs.editions },
    { id: 'clubes', label: t.tabs.clubs },
    { id: 'campeoes', label: t.tabs.topWinners },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <Link
        href="/competitions"
        className="text-sm text-primary hover:underline mb-6 inline-block cursor-pointer"
      >
        &larr; {dict.pages.competitions.title}
      </Link>

      {/* Cabeçalho (Visão Geral fica no cabeçalho; demais abas abaixo) */}
      <div className="bg-background rounded-2xl p-8 shadow-md border border-border/50">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-heading font-bold text-2xl shrink-0">
            {comp.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground">
              {comp.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {comp.country ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-foreground/5 text-foreground/70">
                  {comp.country}
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-foreground/5 text-foreground/70">
                  {t.international}
                </span>
              )}
              {comp.gender === 'women' ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {dict.pages.rankings.genderWomen}
                </span>
              ) : null}
              {typeof comp.level === 'number' ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-foreground/5 text-foreground/70">
                  {t.level} {comp.level}
                </span>
              ) : null}
            </div>
            <div className="mt-3">
              <FavoriteButton
                targetType="competition"
                targetId={comp.id}
                initialCount={comp.fansCount ?? undefined}
                countLabel={t.spectators}
              />
            </div>
          </div>
        </div>
        <SocialLinks
          officialSite={comp.officialSite ?? null}
          socialLinks={comp.socialLinks ?? null}
          followersSnapshot={comp.followersSnapshot ?? null}
        />
        {tab === 'visao' ? (
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-6 mt-8 pt-8 border-t border-border/50">
            {comp.country && <Info label={t.country} value={comp.country} />}
            {comp.type && <Info label={t.type} value={comp.type} />}
            {currentChampion ? (
              <Info
                label={t.currentChampion}
                value={
                  <Link
                    href={`/clubs/${currentChampion.champion.id}`}
                    className="text-primary hover:underline"
                  >
                    {currentChampion.champion.name}
                  </Link>
                }
                extra={`${t.yearShort} ${currentChampion.year}`}
              />
            ) : (
              <Info label={t.currentChampion} value={t.emCatalogacao} />
            )}
            {overview ? <Info label={t.totalEditions} value={String(overview.totalEditions)} /> : null}
            {comp.qid && <Info label="Wikidata" value={comp.qid} />}
          </dl>
        ) : null}
      </div>

      {/* Sub-abas (links server-side: ?tab=) */}
      <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label={t.tabsLabel}>
        {tabList.map((tb) => (
          <Link
            key={tb.id}
            href={`/competitions/${id}?tab=${tb.id}`}
            role="tab"
            aria-selected={tab === tb.id}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border ${
              tab === tb.id
                ? 'bg-primary text-on-primary border-primary'
                : 'border-border text-foreground/70 hover:border-primary/40'
            }`}
          >
            {tb.label}
          </Link>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'edicoes' ? (
          overview && overview.editions.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-foreground/5 text-left">
                    <th scope="col" className="px-4 py-3 font-semibold">{t.year}</th>
                    <th scope="col" className="px-4 py-3 font-semibold">{t.champion}</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.editions.map((e) => (
                    <tr key={e.year} className="border-t border-border">
                      <td className="px-4 py-3 font-semibold">{e.year}</td>
                      <td className="px-4 py-3">
                        <Link href={`/clubs/${e.champion.id}`} className="text-primary hover:underline">
                          {e.champion.name}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-foreground/60" data-testid="edicoes-empty">
              {t.editionsEmpty}
            </p>
          )
        ) : null}

        {tab === 'clubes' ? (
          overview && overview.participants.length > 0 ? (
            <>
              <p className="text-xs text-foreground/40 mb-3">{t.participantsNote}</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {overview.participants.map((c) => (
                  <Link
                    key={c.id}
                    href={`/clubs/${c.id}`}
                    className="block bg-background rounded-xl p-4 shadow-sm border border-border/50 hover:border-primary/40 transition-colors"
                  >
                    <p className="font-heading font-semibold text-foreground">{c.name}</p>
                    <p className="text-xs text-foreground/50 mt-1">
                      {[c.city, c.country].filter(Boolean).join(', ') || '—'}
                    </p>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-foreground/60" data-testid="clubes-empty">
              {t.participantsEmpty}
            </p>
          )
        ) : null}

        {tab === 'campeoes' ? (
          overview && overview.topWinners.length > 0 ? (
            <ol className="space-y-2" data-testid="top-winners">
              {overview.topWinners.map((w, i) => (
                <li
                  key={w.clubId}
                  className="flex items-center gap-4 rounded-xl border border-border p-4"
                >
                  <span className="text-lg font-heading font-bold text-primary w-8 text-center">
                    {i + 1}
                  </span>
                  <Link href={`/clubs/${w.clubId}`} className="flex-1 text-foreground hover:text-primary">
                    {w.name}
                  </Link>
                  <span className="text-sm font-semibold text-foreground/70">
                    {w.titles} {t.titles}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-foreground/60">{t.editionsEmpty}</p>
          )
        ) : null}

        {tab === 'visao' ? <p className="text-xs text-foreground/40 mt-6">{t.overviewHint}</p> : null}
      </div>
    </div>
  );
}

function Info({ label, value, extra }: { label: string; value: React.ReactNode; extra?: string }) {
  return (
    <div>
      <p className="text-xs text-foreground/40 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-foreground mt-0.5">
        {value}
        {extra ? <span className="text-foreground/40"> · {extra}</span> : null}
      </p>
    </div>
  );
}
