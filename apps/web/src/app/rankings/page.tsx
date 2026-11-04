import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import FichaHead from '@/components/ficha/FichaHead';
import RankingsIndex from '@/components/conceito/rankings/RankingsIndex';
import CriteriaNote from '@/components/conceito/rankings/CriteriaNote';
import SourceNote from '@/components/SourceNote';
import { EmptyState } from '@/components/ficha/States';
import { CountryFlag } from '@/components/CountryFlag';
import { getApiBase } from '@/lib/api-base';
import { formatCount } from '@/lib/format';
import { LOCALE_COOKIE, normalizeLocale, type Locale } from '@/i18n/config';
import { wsConceitoRankings } from '@/i18n/wsConceitoRankings';
import { metadataStrings } from '@/i18n/wsMetadata';
import { fichaStrings } from '@/i18n/wsFicha';

/**
 * /rankings — o quadro é UM ranking em foco, não um índice com filtros.
 *
 * O que mudou nesta revisão: a página abria com a barra de filtros da versão anterior e uma
 * tabela de 7 linhas do recorte default — a composição do quadro (tabela única, 12 linhas,
 * critério aberto embaixo) não aparecia. Agora:
 *   · o SERVIDOR escolhe a edição anual de clubes mais recente publicada;
 *   · a tabela mostra posição, clube, país, pontos, títulos e base auditável;
 *   · "Var." e "Últ. 5" não são inventados: a nota declara que a API não os publica;
 *   · os filtros da versão anterior continuam disponíveis em "Explorar todos os rankings"
 *     (o mesmo Client Component, agora secundário).
 *
 * Âncora e subtítulo continuam vindo de /rankings?published=true, como antes.
 */
export async function generateMetadata(): Promise<Metadata> {
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const t = metadataStrings[locale].rankings;
  return { title: t.title, description: t.description };
}

interface PublishedSummary {
  total: number;
  latestSeason: string | null;
}

interface RankingEntry {
  position: number | null;
  points: number | null;
  baseMatches: number | null;
  baseTitles: number | null;
  clubId: string | null;
  clubName: string | null;
  playerName: string | null;
}

interface FeaturedRanking {
  id: string;
  name: string;
  season: string | null;
  publishedAt: string | null;
  entries: RankingEntry[];
  countries: Record<string, string | null>;
}

async function getJson<T>(path: string, revalidate = 3600): Promise<T | null> {
  try {
    const res = await fetch(`${getApiBase()}${path}`, { next: { revalidate } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function getPublishedSummary(): Promise<PublishedSummary | null> {
  const body = await getJson<{ data?: Array<{ season?: string | null }>; total?: number }>(
    '/rankings?published=true&limit=100',
  );
  if (!body) return null;
  const data = Array.isArray(body.data) ? body.data : [];
  const total = typeof body.total === 'number' ? body.total : data.length;
  const seasons = [
    ...new Set(data.map((r) => r.season).filter((value): value is string => !!value)),
  ].sort((a, b) => b.localeCompare(a));
  return { total, latestSeason: seasons[0] ?? null };
}

async function getFeaturedRanking(): Promise<FeaturedRanking | null> {
  const list = await getJson<{
    data?: Array<{
      id: string;
      name: string;
      season: string | null;
      scope?: string | null;
      type?: string | null;
      competitionId?: string | null;
      publishedAt?: string | null;
    }>;
  }>('/rankings?published=true&limit=100');
  const rankings = list?.data ?? [];
  const annualClubs = rankings
    .filter(
      (r) =>
        (r.type ?? 'club') === 'club' &&
        !r.scope &&
        !r.competitionId &&
        typeof r.season === 'string',
    )
    .sort((a, b) => (b.season ?? '').localeCompare(a.season ?? ''));
  // O quadro mostra uma tabela cheia (12 linhas). A edição anual mais recente pode estar
  // esparsa (a de 2026 tem 4 entradas); então escolhemos a mais recente COM pelo menos 10
  // entradas — nunca completamos a tabela com linha inventada.
  const candidates =
    annualClubs.length > 0 ? annualClubs : rankings.filter((r) => (r.type ?? 'club') === 'club');
  let chosen = candidates[0];
  let entries: RankingEntry[] = [];
  for (const candidate of candidates) {
    const body = await getJson<{ data?: RankingEntry[] }>(`/rankings/${candidate.id}/entries`);
    const rows = (body?.data ?? []).slice(0, 12);
    if (rows.length >= 10) {
      chosen = candidate;
      entries = rows;
      break;
    }
    if (rows.length > entries.length) {
      chosen = candidate;
      entries = rows;
    }
  }
  if (!chosen || entries.length === 0) return null;

  const countries: Record<string, string | null> = {};
  await Promise.all(
    entries.map(async (entry) => {
      if (!entry.clubId) return;
      const club = await getJson<{ data?: { country?: string | null } }>(`/clubs/${entry.clubId}`);
      countries[entry.clubId] = club?.data?.country ?? null;
    }),
  );

  return {
    id: chosen.id,
    name: chosen.name,
    season: chosen.season,
    publishedAt: chosen.publishedAt ?? null,
    entries,
    countries,
  };
}

export default async function RankingsPage() {
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const s = wsConceitoRankings[locale];
  const states = fichaStrings[locale].states;
  const summary = await getPublishedSummary();
  const featured = await getFeaturedRanking();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <FichaHead
        title={s.title}
        subtitle={buildSubtitle(locale, summary)}
        anchor={summary && summary.total > 0 ? formatCount(summary.total, locale) : undefined}
        anchorLabel={s.anchorLabel}
      />

      {featured ? (
        <>
          <div className="mt-8 overflow-x-auto">
            <table
              className="w-full border-collapse text-left text-[13px]"
              data-testid="rankings-featured-table"
            >
              <caption className="sr-only">{s.tableCaption}</caption>
              <thead>
                <tr className="border-b-2 border-foreground text-[10px] tracking-[0.08em] text-ink-3 uppercase">
                  <th scope="col" className="py-2 pr-4 text-right font-semibold">
                    {s.colPosition}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    {s.colClub}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    {s.colCountry}
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-semibold">
                    {s.colPoints}
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-semibold">
                    {s.colTitles}
                  </th>
                  <th scope="col" className="py-2 text-right font-semibold">
                    {s.colBase}
                  </th>
                </tr>
              </thead>
              <tbody>
                {featured.entries.map((entry, i) => {
                  const country = entry.clubId ? featured.countries[entry.clubId] : null;
                  return (
                    <tr
                      key={`${entry.clubId ?? entry.playerName ?? i}`}
                      className={i % 2 === 1 ? 'bg-surface-2' : undefined}
                    >
                      <td className="num border-b border-border py-2.5 pr-4 text-right tabular-nums text-ink-2">
                        {entry.position ?? '—'}
                      </td>
                      <th
                        scope="row"
                        className="border-b border-border py-2.5 pr-4 text-left font-medium text-foreground"
                      >
                        {entry.clubId ? (
                          <a href={`/clubs/${entry.clubId}`} className="hover:text-primary-ink">
                            {entry.clubName ?? entry.playerName ?? '—'}
                          </a>
                        ) : (
                          (entry.playerName ?? entry.clubName ?? '—')
                        )}
                      </th>
                      <td className="border-b border-border py-2.5 pr-4 text-ink-2">
                        {country ? <CountryFlag code={country} locale={locale} /> : '—'}
                      </td>
                      <td className="num border-b border-border py-2.5 pr-4 text-right tabular-nums text-foreground">
                        {entry.points != null ? formatCount(entry.points, locale) : '—'}
                      </td>
                      <td className="num border-b border-border py-2.5 pr-4 text-right tabular-nums text-ink-2">
                        {entry.baseTitles != null ? formatCount(entry.baseTitles, locale) : '—'}
                      </td>
                      <td className="num border-b border-border py-2.5 text-right tabular-nums text-ink-2">
                        {entry.baseMatches != null ? formatCount(entry.baseMatches, locale) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-2 text-[11px] leading-snug text-ink-3">
            {s.rankingEdition.replace('{name}', featured.name)}
            {featured.publishedAt ? ` · ${featured.publishedAt}` : ''}
          </p>
          <p className="mt-1 max-w-[900px] text-[11px] leading-snug text-ink-3">
            {s.missingColumns}
          </p>

          <CriteriaNote s={s} />

          <div className="mt-4">
            <SourceNote label={s.provenanceLead} detail={s.provenanceBody} />
          </div>

          <details className="mt-8 border-t border-border pt-3">
            <summary className="cursor-pointer text-[12.5px] font-semibold text-foreground">
              {s.exploreTitle}
            </summary>
            <p className="mt-1 text-[11px] text-ink-3">{s.exploreHint}</p>
            <div className="mt-4">
              <RankingsIndex />
            </div>
          </details>
        </>
      ) : (
        <div className="mt-8">
          <EmptyState title={states.emptyTitle} body={states.emptyBody} />
        </div>
      )}
    </div>
  );
}

function buildSubtitle(locale: Locale, summary: PublishedSummary | null): string {
  const s = wsConceitoRankings[locale];
  const kicker = summary?.latestSeason
    ? s.kicker.replace('{season}', summary.latestSeason)
    : s.kickerPlain;
  return `${kicker} · ${s.subtitle}`;
}
