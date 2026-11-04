import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getApiBase } from '@/lib/api-base';
import { safeJsonLd } from '@/lib/json-ld';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';
import { wsC2Strings } from '@/i18n/wsC2';
import FavoriteButton from '@/components/FavoriteButton';
import { CrestTimeline } from '@/components/CrestTimeline';
import DetailUnavailable from '@/components/ficha/DetailUnavailable';
import ClubCommunity from '@/components/ClubCommunity';
import ClubeFichaPageView from '@/components/conceito/clube/ClubeFichaPageView';
import { conceitoClubeStrings } from '@/i18n/wsConceitoClube';
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
} from '@/components/conceito/clube/types';

// WS-C-2 · conceito FICHA — perfil público consolidado.
// Fonte única: GET /api/v1/clubs/:id/profile (+ /statistics, /kits, /anthem, /pennants,
// /crests, /timeline, /related e /players?clubId=). Renderiza SOMENTE o que a API entrega;
// lacunas declaradas como lacunas (nunca inventadas). O Lead integra e roda os portões.

async function getPennants(id: string): Promise<Pennant[] | null> {
  try {
    const res = await fetch(`${getApiBase()}/clubs/${id}/pennants`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data as { pennants: Pennant[] }).pennants ?? null;
  } catch {
    return null;
  }
}

async function getAnthem(id: string): Promise<Anthem | null> {
  try {
    const res = await fetch(`${getApiBase()}/clubs/${id}/anthem`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data as { anthem: Anthem | null }).anthem ?? null;
  } catch {
    return null;
  }
}

/** T32 — escudos ao longo do tempo. Falha de rede devolve [] (a seção não aparece). */
async function getCrests(id: string): Promise<Crest[]> {
  try {
    const res = await fetch(`${getApiBase()}/clubs/${id}/crests`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data?.crests ?? []) as Crest[];
  } catch {
    return [];
  }
}

async function getKits(id: string): Promise<KitEntry[] | null> {
  try {
    const res = await fetch(`${getApiBase()}/clubs/${id}/kits`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data as { kits: KitEntry[] }).kits ?? null;
  } catch {
    return null;
  }
}

async function getStatistics(id: string): Promise<ClubStatistics | null> {
  try {
    const res = await fetch(`${getApiBase()}/clubs/${id}/statistics`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data as ClubStatistics;
  } catch {
    return null;
  }
}

/** Elenco real: GET /players?clubId= (T551 vinculou jogador→clube atual). Falha = null. */
async function getSquad(id: string): Promise<SquadPlayer[] | null> {
  try {
    const res = await fetch(`${getApiBase()}/players?clubId=${encodeURIComponent(id)}&limit=100`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data as SquadPlayer[]) ?? null;
  } catch {
    return null;
  }
}

async function getTimeline(id: string): Promise<TimelineData | null> {
  try {
    const res = await fetch(`${getApiBase()}/clubs/${id}/timeline`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data as TimelineData) ?? null;
  } catch {
    return null;
  }
}

async function getRelatedClubs(id: string): Promise<RelatedClub[] | null> {
  try {
    const res = await fetch(`${getApiBase()}/clubs/${id}/related`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data as { related: RelatedClub[] }).related ?? null;
  } catch {
    return null;
  }
}

/**
 * `valor` = existe · `null` = a origem disse 404 · `undefined` = não foi possível perguntar.
 * Fundir os dois últimos fazia a ficha afirmar "não existe" com a API fora do ar.
 */
async function getProfile(id: string): Promise<ClubProfile | null | undefined> {
  try {
    const res = await fetch(`${getApiBase()}/clubs/${id}/profile`, { next: { revalidate: 300 } });
    if (res.status === 404) return null;
    if (!res.ok) return undefined;
    const json = await res.json();
    return (json.data as ClubProfile) ?? null;
  } catch {
    return undefined;
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
  // sem resposta da origem não sabemos se o clube existe: não afirmamos nem indexamos
  if (club === undefined)
    return { title: 'Clube — Almanaque dos Clubes', robots: { index: false } };
  if (!club) return { title: 'Clube não encontrado', robots: { index: false } };
  const place = [club.city, club.state, club.country].filter(Boolean).join(', ');
  return {
    title: `${club.name}${place ? ` — ${place}` : ''}`,
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
  // `undefined` = não conseguimos perguntar; `null` = a origem disse que não existe.
  if (club === undefined)
    return <DetailUnavailable retryHref={`/clubs/${id}`} backHref="/clubs" backLabel="Clubes" />;
  if (!club) notFound();

  const [stats, kits, anthem, pennants, crests, squad, timeline, relatedClubs] = await Promise.all([
    getStatistics(id),
    getKits(id),
    getAnthem(id),
    getPennants(id),
    getCrests(id),
    getSquad(id),
    getTimeline(id),
    getRelatedClubs(id),
  ]);
  const locale = await getLocale();
  const s = wsC2Strings[locale].profile;
  const t = conceitoClubeStrings[locale];

  /* T32 — strings dos escudos. `imageAlt` é TEMPLATE com `{period}`, não função: props de
     Server Component para Client Component precisam ser serializáveis. */
  const crestStrings = {
    title: s.crestsTitle,
    current: s.crestCurrent,
    unknownPeriod: s.crestUnknownPeriod,
    licenseLabel: s.crestLicense,
    sourceLabel: s.crestSource,
    attributionLabel: s.crestAttribution,
    singleNote: s.crestSingleNote,
    imageAlt: s.crestImageAlt,
  };

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

  const crestsSlot =
    crests.length > 0 ? <CrestTimeline crests={crests} strings={crestStrings} /> : null;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 pt-8 pb-16 sm:px-10 lg:px-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <Link
        href="/clubs"
        className="mb-4 inline-flex min-h-6 items-center text-[13px] text-primary-ink hover:underline"
      >
        &larr; {s.backToClubs}
      </Link>

      <ClubeFichaPageView
        locale={locale}
        club={club}
        stats={stats}
        kits={kits}
        anthem={anthem}
        pennants={pennants}
        crests={crests}
        squad={squad}
        timeline={timeline}
        relatedClubs={relatedClubs}
        actions={
          <FavoriteButton
            clubId={club.id}
            initialCount={club.fansCount ?? undefined}
            countLabel={t.head.favoriteCount}
          />
        }
        crestsSlot={crestsSlot}
        communitySlot={<ClubCommunity clubId={club.id} />}
      />
    </div>
  );
}
