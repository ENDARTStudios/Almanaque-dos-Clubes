import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getApiBase } from '@/lib/api-base';
import { formatCount } from '@/lib/format';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';
import { wt541Strings } from '@/i18n/wsT541';
import { wt579Strings } from '@/i18n/wsT579';
import { wsConceitoPartidas } from '@/i18n/wsConceitoPartidas';
import FichaHead from '@/components/ficha/FichaHead';
import { EmptyState, ErrorState } from '@/components/ficha/States';
import { fichaStrings } from '@/i18n/wsFicha';
import MatchList from '@/components/conceito/partidas/MatchList';
import PageStats from '@/components/conceito/partidas/PageStats';
import type { MatchRowData } from '@/components/conceito/partidas/types';

/**
 * /matches — o quadro `partidas` do conceito FICHA.
 *
 * O que muda em relação à versão anterior (tabela de quatro colunas com moldura e sombra):
 *   · FichaHead com o total REAL de partidas e o rótulo "partidas catalogadas";
 *   · filtros em caixas do conceito (rótulo dentro da caixa, borda de 1px, raio 2px) e os
 *     filtros ativos como CHIPS removíveis — o estado está na URL, funciona sem JS;
 *   · resultados como LINHAS de confronto (data/rodada · clubes e placar · ação), com a mesma
 *     ordem de leitura do T579 (escudo · casa · placar · × · placar · visitante · escudo);
 *   · caixa "Estatística desta página" calculada SÓ com os placares carregados — o recorte é
 *     declarado no texto, não vendido como o acervo inteiro.
 *
 * O QUE O DESENHO TEM E A API NÃO PUBLICA: posse, finalizações e escanteios por partida. As
 * colunas não existem; a nota do pé declara o motivo. Placar ausente não vira 0×0.
 */

interface Facet {
  id: string;
  name: string;
  count: number;
}

interface SearchParams {
  competitionId?: string;
  seasonId?: string;
  dateFrom?: string;
  dateTo?: string;
  offset?: string;
}

const PAGE_SIZE = 50;

export const metadata: Metadata = {
  title: 'Partidas — Almanaque dos Clubes',
  description:
    'Resultados rodada a rodada das competições do acervo: data, competição, temporada, placar e proveniência por partida.',
  alternates: { canonical: '/matches' },
};

async function getLocale() {
  const store = await cookies();
  return normalizeLocale(store.get(LOCALE_COOKIE)?.value);
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Remove UM filtro da URL, preservando os outros e voltando à primeira página. */
function hrefSem(sp: SearchParams, key: keyof SearchParams): string {
  const q = new URLSearchParams();
  for (const k of ['competitionId', 'seasonId', 'dateFrom', 'dateTo'] as const) {
    if (k === key) continue;
    if (sp[k]) q.set(k, sp[k] as string);
  }
  return '/matches' + (q.toString() ? `?${q.toString()}` : '');
}

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const locale = await getLocale();
  const t = wt541Strings[locale];
  const t579 = wt579Strings[locale];
  const s = wsConceitoPartidas[locale];
  const base = getApiBase();

  const offset = Math.max(parseInt(sp.offset ?? '0', 10) || 0, 0);
  const query = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
  if (sp.competitionId) query.set('competitionId', sp.competitionId);
  if (sp.seasonId) query.set('seasonId', sp.seasonId);
  if (sp.dateFrom) query.set('dateFrom', sp.dateFrom);
  if (sp.dateTo) query.set('dateTo', sp.dateTo);

  const [facets, list] = await Promise.all([
    fetchJson<{ competitions: Facet[]; seasons: Facet[] }>(`${base}/matches/facets`),
    fetchJson<{ data: MatchRowData[]; total: number }>(`${base}/matches?${query.toString()}`),
  ]);

  const falhou = list === null;
  const rows = list?.data ?? [];
  const total = list?.total ?? 0;
  const hasPrev = offset > 0;
  const hasNext = offset + PAGE_SIZE < total;

  const pageQuery = (nextOffset: number) => {
    const q = new URLSearchParams();
    if (sp.competitionId) q.set('competitionId', sp.competitionId);
    if (sp.seasonId) q.set('seasonId', sp.seasonId);
    if (sp.dateFrom) q.set('dateFrom', sp.dateFrom);
    if (sp.dateTo) q.set('dateTo', sp.dateTo);
    q.set('offset', String(nextOffset));
    return `/matches?${q.toString()}`;
  };

  const compSelecionada = facets?.competitions?.find((c) => c.id === sp.competitionId);
  const seasonSelecionada = facets?.seasons?.find((x) => x.id === sp.seasonId);
  const filtrosAtivos: Array<{ key: keyof SearchParams; label: string }> = [];
  if (compSelecionada) {
    filtrosAtivos.push({
      key: 'competitionId',
      label: `${t.filters.competition}: ${compSelecionada.name}`,
    });
  }
  if (seasonSelecionada) {
    filtrosAtivos.push({
      key: 'seasonId',
      label: `${t.filters.season}: ${seasonSelecionada.name}`,
    });
  }
  if (sp.dateFrom)
    filtrosAtivos.push({ key: 'dateFrom', label: `${t.filters.from}: ${sp.dateFrom}` });
  if (sp.dateTo) filtrosAtivos.push({ key: 'dateTo', label: `${t.filters.to}: ${sp.dateTo}` });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <FichaHead
        title={t.title}
        subtitle={`${s.kicker} · ${s.subtitle}`}
        anchor={falhou || total === 0 ? undefined : formatCount(total, locale)}
        anchorLabel={s.anchorLabel}
      />

      {/* 1. FILTROS — caixas do conceito; o estado mora na URL. */}
      <form
        method="get"
        className="mt-8"
        aria-label={t.filters.legend}
        data-testid="conceito-partidas-filters"
      >
        <fieldset className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <legend className="sr-only">{t.filters.legend}</legend>
          <label className="flex min-w-0 flex-col rounded-[2px] border border-border bg-surface px-3 py-2">
            <span className="text-[10px] font-semibold leading-none text-ink-3">
              {t.filters.competition}
            </span>
            <select
              name="competitionId"
              defaultValue={sp.competitionId ?? ''}
              className="mt-1 w-full border-0 bg-transparent p-0 text-[14px] text-foreground focus:outline-none"
            >
              <option value="">{t.filters.allCompetitions}</option>
              {(facets?.competitions ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.count})
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-w-0 flex-col rounded-[2px] border border-border bg-surface px-3 py-2">
            <span className="text-[10px] font-semibold leading-none text-ink-3">
              {t.filters.season}
            </span>
            <select
              name="seasonId"
              defaultValue={sp.seasonId ?? ''}
              className="mt-1 w-full border-0 bg-transparent p-0 text-[14px] text-foreground focus:outline-none"
            >
              <option value="">{t.filters.allSeasons}</option>
              {(facets?.seasons ?? []).map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} ({x.count})
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-w-0 flex-col rounded-[2px] border border-border bg-surface px-3 py-2">
            <span className="text-[10px] font-semibold leading-none text-ink-3">
              {t.filters.from}
            </span>
            <input
              type="date"
              name="dateFrom"
              defaultValue={sp.dateFrom ?? ''}
              className="mt-1 w-full border-0 bg-transparent p-0 text-[14px] text-foreground focus:outline-none"
            />
          </label>

          <label className="flex min-w-0 flex-col rounded-[2px] border border-border bg-surface px-3 py-2">
            <span className="text-[10px] font-semibold leading-none text-ink-3">
              {t.filters.to}
            </span>
            <input
              type="date"
              name="dateTo"
              defaultValue={sp.dateTo ?? ''}
              className="mt-1 w-full border-0 bg-transparent p-0 text-[14px] text-foreground focus:outline-none"
            />
          </label>
        </fieldset>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="inline-flex min-h-9 items-center rounded-[2px] bg-foreground px-4 text-[13px] font-semibold text-background transition-colors duration-200 hover:bg-foreground/90"
          >
            {t.filters.apply}
          </button>
          {filtrosAtivos.length > 0 ? (
            <Link
              href="/matches"
              className="inline-flex min-h-9 items-center text-[11px] font-medium text-primary-ink underline decoration-dotted underline-offset-2"
            >
              {s.clearAll}
            </Link>
          ) : null}
        </div>

        {filtrosAtivos.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold leading-none text-ink-3">
              {s.activeLabel}
            </span>
            {filtrosAtivos.map((f) => (
              <Link
                key={f.key}
                href={hrefSem(sp, f.key)}
                className="inline-flex min-h-7 items-center gap-2 rounded-full border border-border px-3 text-[11px] text-ink-2 transition-colors duration-200 hover:border-foreground hover:text-foreground"
              >
                {f.label}
                <span aria-hidden="true">×</span>
              </Link>
            ))}
          </div>
        ) : null}
      </form>

      {falhou ? (
        <div className="mt-8">
          <ErrorState
            title={fichaStrings[locale].states.errorTitle}
            body={fichaStrings[locale].states.errorBody}
            retryLabel={fichaStrings[locale].states.retry}
            retryHref="/matches"
          />
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-8">
          <EmptyState title={t.filters.noResults} body={t.filters.noResultsHint} />
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[12.5px] font-semibold text-foreground">{s.resultsTitle}</h2>
            <p className="text-[11px] text-ink-3">
              {formatCount(total, locale)} {t.filters.results}
            </p>
          </div>

          <MatchList
            rows={rows}
            locale={locale}
            openLabel={s.open}
            scoreJoiner={t579.matches.scoreJoiner}
            noScore={t579.matches.noScore}
            dataLabel={t.title}
          />

          <PageStats rows={rows} s={s} />

          {(hasPrev || hasNext) && (
            <nav className="mt-6 flex items-center justify-between" aria-label={t.title}>
              {hasPrev ? (
                <Link
                  href={pageQuery(Math.max(offset - PAGE_SIZE, 0))}
                  className="inline-flex min-h-10 items-center rounded-[2px] border border-border px-4 text-sm font-semibold hover:border-foreground"
                >
                  ← {t.pagination.previous}
                </Link>
              ) : (
                <span />
              )}
              <span className="text-[11px] text-ink-3">
                {t.pagination.page} {Math.floor(offset / PAGE_SIZE) + 1}
              </span>
              {hasNext ? (
                <Link
                  href={pageQuery(offset + PAGE_SIZE)}
                  className="inline-flex min-h-10 items-center rounded-[2px] border border-border px-4 text-sm font-semibold hover:border-foreground"
                >
                  {t.pagination.next} →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}

      <div className="mt-10 space-y-1 border-t border-border pt-3">
        <p className="max-w-[900px] text-[11px] leading-snug text-ink-3">{s.provenance}</p>
        <p className="max-w-[900px] text-[11px] leading-snug text-ink-3">{s.noShotStats}</p>
        <p className="max-w-[900px] text-[11px] leading-snug text-ink-3">{t.source}</p>
      </div>
    </div>
  );
}
