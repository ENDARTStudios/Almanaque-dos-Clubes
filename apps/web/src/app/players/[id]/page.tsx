import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getApiBase } from '@/lib/api-base';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';
import { safeJsonLd } from '@/lib/json-ld';
import FavoriteButton from '@/components/FavoriteButton';
import DetailUnavailable from '@/components/ficha/DetailUnavailable';
import JogadorFichaPageView from '@/components/conceito/jogador/JogadorFichaPageView';
import { photoProvenance } from '@/components/conceito/jogador/derive';
import type {
  JogadorIdentity,
  JogadorMediaEnrichment,
  JogadorProfile,
} from '@/components/conceito/jogador/types';
import { conceitoJogadorStrings } from '@/i18n/wsConceitoJogador';

// WS-C · conceito FICHA — ficha de jogador.
// Fonte única: GET /api/v1/players/:id (data + profile). Renderiza SOMENTE o que a API entrega;
// lacunas declaradas como lacunas (nunca inventadas). O Lead integra e roda os portões.

interface Player extends JogadorIdentity {
  /** T502 — P18 do Wikidata (Wikimedia Commons). */
  photoUrl?: string | null;
  /** JSONB com a proveniência da mídia (licença/autor/fonte do retrato). */
  mediaEnrichment?: JogadorMediaEnrichment | null;
}

/**
 * `valor` = existe · `null` = a origem disse 404 · `undefined` = não foi possível perguntar.
 */
async function getPlayer(
  id: string,
): Promise<{ data: Player; profile: JogadorProfile | null } | null | undefined> {
  try {
    const res = await fetch(getApiBase() + '/players/' + id, { cache: 'no-store' });
    if (res.status === 404) return null;
    if (!res.ok) return undefined;
    const json = await res.json();
    if (!json.data) return null;
    return {
      data: json.data as Player,
      profile: (json.profile ?? null) as JogadorProfile | null,
    };
  } catch {
    return undefined;
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
  return { title: p.fullName, description: p.fullName + ' — ' + (p.country ?? '') };
}

export default async function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await getPlayer(id);
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const t = conceitoJogadorStrings[locale];
  // `undefined` = não conseguimos perguntar; `null` = a origem disse que não existe.
  if (res === undefined)
    return (
      <DetailUnavailable
        retryHref={'/players/' + id}
        backHref="/players"
        backLabel={t.backToPlayers}
      />
    );
  if (!res) notFound();
  const p = res.data;
  const profile = res.profile;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: p.fullName,
    birthDate: p.birthDate ? String(p.birthDate).slice(0, 10) : undefined,
    nationality: p.country ?? undefined,
  };

  // Retrato + licença REAL: a URL vem de `photoUrl` e a licença/autor/fonte de
  // `mediaEnrichment.commonsPhoto` (gravado pelo coletor do Commons). Sem licença catalogada
  // a moldura DECLARA a lacuna; nunca presume CC.
  const photo = photoProvenance(p.photoUrl ?? null, p.mediaEnrichment ?? null);

  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 pt-8 pb-16 sm:px-10 lg:px-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <Link
        href="/players"
        className="mb-4 inline-flex min-h-6 items-center text-[13px] text-primary-ink hover:underline"
      >
        &larr; {t.backToPlayers}
      </Link>

      <JogadorFichaPageView
        locale={locale}
        player={p}
        photo={photo}
        profile={profile}
        actions={
          <FavoriteButton
            targetType="player"
            targetId={p.id}
            initialCount={p.fansCount ?? undefined}
            countLabel={t.head.fans}
          />
        }
      />
    </div>
  );
}
