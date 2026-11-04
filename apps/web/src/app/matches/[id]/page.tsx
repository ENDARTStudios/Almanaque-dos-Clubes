import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getApiBase } from '@/lib/api-base';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';
import { wsConceitoPartida } from '@/i18n/wsConceitoPartida';
import { ClubCrest } from '@/components/MediaAssets';
import SourceNote from '@/components/SourceNote';
import DetailUnavailable from '@/components/ficha/DetailUnavailable';

/**
 * PARTIDA — o quadro \`partida\` do conceito FICHA.
 *
 * O placar é a manchete: dois números enormes entre os dois clubes, com os escudos reais e a
 * data/estádio embaixo. Depois, três colunas:
 *   · GOLS — autores quando a fonte os publica (\`scorers\`); sem eles, LACUNA declarada;
 *   · ESCALAÇÕES — a API não publica escalação; a coluna não existe e a ficha declara o motivo;
 *   · FICHA — data, estádio/local, competição, rodada, status, fonte e licença reais.
 *
 * O endpoint \`GET /matches/:id\` devolve só os IDs das relações. A página resolve os nomes em
 * chamadas paralelas (clubes, competição, temporada, estádio), cacheadas por 1h — nenhum nome é
 * inventado e nenhum campo que a API não tem é preenchido.
 */
export const metadata: Metadata = {
  title: 'Partida · Almanaque dos Clubes',
};

interface MatchDto {
  id: string;
  date: string;
  competitionId: string | null;
  seasonId: string | null;
  homeClubId: string;
  awayClubId: string;
  homeScore: number | null;
  awayScore: number | null;
  scorers: {
    raw?: string | null;
    home?: string[] | null;
    away?: string[] | null;
    sidesVerified?: boolean;
  } | null;
  sourceNote: string | null;
  round: string | null;
  venue: string | null;
  stadiumId: string | null;
  status: string;
  sourceUrl: string | null;
  license: string | null;
}

interface ClubDto {
  id: string;
  name: string;
  city?: string | null;
  country?: string | null;
  logoUrl?: string | null;
}

async function getJson<T>(path: string, revalidate = 3600): Promise<T | null> {
  try {
    const r = await fetch(`${getApiBase()}${path}`, { next: { revalidate } });
    if (!r.ok) return null;
    const j = (await r.json()) as { data?: T } | T;
    return (j as { data?: T }).data ?? (j as T) ?? null;
  } catch {
    return null;
  }
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const s = wsConceitoPartida[locale];

  const partida = await getJson<MatchDto>(`/matches/${encodeURIComponent(id)}`);
  if (!partida) {
    // null pode ser 404 ou falha. A página distingue: 404 real usa notFound; falha usa
    // DetailUnavailable com retry. O notFound() lança — não pode ficar dentro de um catch.
    const status = await fetch(`${getApiBase()}/matches/${encodeURIComponent(id)}`, {
      next: { revalidate: 0 },
    })
      .then((r) => r.status)
      .catch(() => 0);
    if (status === 404) notFound();
    return (
      <DetailUnavailable
        retryHref={`/matches/${id}`}
        backHref="/matches"
        backLabel={s.backToMatches}
      />
    );
  }

  const [home, away, competition, season, stadium] = await Promise.all([
    getJson<ClubDto>(`/clubs/${partida.homeClubId}`),
    getJson<ClubDto>(`/clubs/${partida.awayClubId}`),
    partida.competitionId
      ? getJson<{ name: string }>(`/competitions/${partida.competitionId}`)
      : Promise.resolve(null),
    partida.seasonId
      ? getJson<{ name: string }>(`/seasons/${partida.seasonId}`)
      : Promise.resolve(null),
    partida.stadiumId
      ? getJson<{ name: string; city?: string | null }>(`/stadiums/${partida.stadiumId}`)
      : Promise.resolve(null),
  ]);

  const temPlacar = partida.homeScore != null && partida.awayScore != null;
  const local = stadium?.name ?? partida.venue ?? null;
  const kicker = [
    competition?.name,
    season?.name,
    partida.round ? `${s.round} ${partida.round}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const golsCasa = partida.scorers?.home ?? [];
  const golsFora = partida.scorers?.away ?? [];
  const temGols = golsCasa.length > 0 || golsFora.length > 0;

  const nomeA = home?.name ?? s.homeFallback;
  const nomeB = away?.name ?? s.awayFallback;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <h1 className="sr-only">
        {nomeA} {temPlacar ? `${partida.homeScore} × ${partida.awayScore}` : ''} {nomeB}
      </h1>

      <Link
        href="/matches"
        className="inline-block text-sm text-primary-ink underline decoration-dotted underline-offset-2"
      >
        &larr; {s.backToMatches}
      </Link>

      {kicker ? (
        <p className="mt-6 text-[11px] font-semibold tracking-[0.14em] text-ink-3 uppercase">
          {kicker}
        </p>
      ) : null}

      {/* MARCADOR — o maior elemento da página. */}
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-8">
        <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-end sm:text-right">
          <span className="order-2 font-heading text-xl font-bold leading-tight sm:order-1 sm:text-3xl">
            {home ? (
              <Link href={`/clubs/${home.id}`} className="hover:text-primary-ink">
                {nomeA}
              </Link>
            ) : (
              nomeA
            )}
          </span>
          {home ? (
            <span className="order-1 sm:order-2">
              <ClubCrest logoUrl={home?.logoUrl ?? null} name={nomeA} size={56} />
            </span>
          ) : null}
        </div>
        <div className="flex items-baseline gap-2 font-heading font-bold tabular-nums sm:gap-4">
          <span className="text-[44px] leading-none sm:text-[96px]">
            {partida.homeScore ?? '—'}
          </span>
          <span aria-hidden="true" className="text-2xl text-ink-3 sm:text-4xl">
            ×
          </span>
          <span className="text-[44px] leading-none text-primary sm:text-[96px]">
            {partida.awayScore ?? '—'}
          </span>
        </div>
        <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-start sm:text-left">
          {away ? (
            <span className="order-1">
              <ClubCrest logoUrl={away?.logoUrl ?? null} name={nomeB} size={56} />
            </span>
          ) : null}
          <span className="order-2 font-heading text-xl font-bold leading-tight sm:text-3xl">
            {away ? (
              <Link href={`/clubs/${away.id}`} className="hover:text-primary-ink">
                {nomeB}
              </Link>
            ) : (
              nomeB
            )}
          </span>
        </div>
      </div>

      <p className="mt-4 text-[12px] text-ink-2">
        {formatDateUtc(partida.date, locale)}
        {local ? ` · ${local}` : ''}
        {partida.sourceNote ? ` · ${partida.sourceNote}` : ''}
      </p>

      <hr className="mt-5 border-t-2 border-foreground" />

      <div className="mt-6 grid gap-10 lg:grid-cols-3">
        {/* GOLS */}
        <section aria-labelledby="partida-gols">
          <h2 id="partida-gols" className="text-[12.5px] font-semibold text-foreground">
            {s.goalsTitle}
          </h2>
          {temGols ? (
            <ol className="mt-3 list-none space-y-1 p-0">
              {[
                ...golsCasa.map((g) => ({ g, lado: home?.name ?? '—' })),
                ...golsFora.map((g) => ({ g, lado: away?.name ?? '—' })),
              ].map((g, i) => (
                <li
                  key={`${g.lado}-${i}`}
                  className="flex gap-4 border-b border-border py-1.5 text-[12px]"
                >
                  <span className="w-16 shrink-0 text-ink-3">{g.lado}</span>
                  <span className="text-foreground">{g.g}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-[11px] leading-snug text-ink-3">{s.goalsGap}</p>
          )}
        </section>

        {/* ESCALAÇÕES — a API não publica; a coluna declara a lacuna. */}
        <section aria-labelledby="partida-escalacoes">
          <h2 id="partida-escalacoes" className="text-[12.5px] font-semibold text-foreground">
            {s.lineupsTitle}
          </h2>
          <p className="mt-3 text-[11px] leading-snug text-ink-3">{s.lineupsGap}</p>
        </section>

        {/* FICHA */}
        <section aria-labelledby="partida-ficha">
          <h2 id="partida-ficha" className="text-[12.5px] font-semibold text-foreground">
            {s.sheetTitle}
          </h2>
          <dl className="mt-3 space-y-3">
            <FichaItem label={s.sheetCompetition} value={competition?.name ?? '—'} />
            <FichaItem label={s.sheetRound} value={partida.round ?? '—'} />
            <FichaItem label={s.sheetVenue} value={local ?? '—'} />
            <FichaItem label={s.sheetStatus} value={partida.status} />
            <FichaItem
              label={s.sheetSource}
              value={partida.sourceUrl ? partida.sourceUrl : (partida.license ?? '—')}
              href={partida.sourceUrl ?? undefined}
            />
          </dl>
        </section>
      </div>

      <div className="mt-10 border-t border-border pt-3">
        <SourceNote label={s.provenance} />
        <p className="mt-1 text-[11px] leading-snug text-ink-3">{s.noShotStats}</p>
      </div>
    </div>
  );
}

function FichaItem({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[10px] font-semibold leading-none text-ink-3">{label}</dt>
      <dd className="text-[12px] leading-snug text-foreground">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-ink underline decoration-dotted underline-offset-2"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

/** Data da partida em UTC: o acervo grava a data à meia-noite UTC; o fuso local recuaria um dia. */
function formatDateUtc(iso: string, locale: ReturnType<typeof normalizeLocale>): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const tag = locale === 'en-us' ? 'en-GB' : locale === 'es-es' ? 'es-ES' : 'pt-BR';
  return new Intl.DateTimeFormat(tag, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
