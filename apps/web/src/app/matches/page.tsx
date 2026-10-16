import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getApiBase } from '@/lib/api-base';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';
import { wt541Strings } from '@/i18n/wsT541';
import { wt579Strings } from '@/i18n/wsT579';
import { ClubCrest } from '@/components/MediaAssets';

/**
 * T541 — página pública de PARTIDAS.
 *
 * Por que existia um gap: o PLANO_MESTRE prometia `/matches` como página pública, mas
 * a rota não existia (404) enquanto `GET /api/v1/matches` já servia 17.265 partidas.
 *
 * Decisões de implementação:
 * - **Server Component com filtros em `<form method="get">`**: funciona sem JS, é
 *   acessível por teclado e não precisa de estado no cliente. O filtro é a URL.
 * - **Facets da própria API** (`/matches/facets`): os seletores só oferecem competição
 *   e temporada que TÊM partidas — nada de lista hardcoded nem filtro que devolve vazio.
 * - **i18n em módulo aditivo** (`i18n/wsT541.ts`), sem tocar dicionários globais.
 * - Empty-honesto: sem resultado, diz que não há — não preenche com nada.
 *
 * T579 (ITEM 20) — a linha da partida passou a ser um CONFRONTO legível:
 * `escudo · casa · placar casa · × · placar visitante · visitante · escudo`. Os escudos vêm
 * do `logoUrl` do próprio clube, incluído no select do repositório de partidas
 * (`modules/matches/repository.ts`) — sem ele, cada linha exigiria uma segunda chamada só
 * para buscar um campo que já existe na tabela.
 */

interface Facet {
  id: string;
  name: string;
  count: number;
}

interface MatchRow {
  id: string;
  date: string;
  round: string | null;
  homeScore: number | null;
  awayScore: number | null;
  // T579 (ITEM 20) — `logoUrl` é devolvido pela API de partidas (aditivo no select do
  // repositório): o escudo é o mesmo asset já auditado do acervo (`Club.logoUrl`).
  homeClub: { id: string; name: string; logoUrl?: string | null } | null;
  awayClub: { id: string; name: string; logoUrl?: string | null } | null;
  competition: { id: string; name: string } | null;
  season: { id: string; name: string } | null;
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

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const locale = await getLocale();
  const t = wt541Strings[locale];
  const t579 = wt579Strings[locale];
  const base = getApiBase();

  const offset = Math.max(parseInt(sp.offset ?? '0', 10) || 0, 0);
  const query = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
  if (sp.competitionId) query.set('competitionId', sp.competitionId);
  if (sp.seasonId) query.set('seasonId', sp.seasonId);
  if (sp.dateFrom) query.set('dateFrom', sp.dateFrom);
  if (sp.dateTo) query.set('dateTo', sp.dateTo);

  const [facets, list] = await Promise.all([
    fetchJson<{ competitions: Facet[]; seasons: Facet[] }>(`${base}/matches/facets`),
    fetchJson<{ data: MatchRow[]; total: number }>(`${base}/matches?${query.toString()}`),
  ]);

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

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? '—'
      : d.toLocaleDateString(
          locale === 'en-us' ? 'en-GB' : locale === 'es-es' ? 'es-ES' : 'pt-BR',
          {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'UTC',
          },
        );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <header className="mb-6">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-foreground">{t.title}</h1>
        <p className="mt-2 measure-readable text-foreground/60">{t.subtitle}</p>
      </header>

      {/* Filtros em formulário GET: sem JS, navegável por teclado, estado na URL. */}
      <form method="get" className="rounded-xl border border-border bg-background p-5 shadow-sm">
        <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <legend className="sr-only">{t.filters.legend}</legend>
          <label className="flex min-w-0 flex-col gap-1 text-sm">
            <span className="text-foreground/60">{t.filters.competition}</span>
            <select
              name="competitionId"
              defaultValue={sp.competitionId ?? ''}
              className="rounded-lg border border-border bg-background px-3 py-2 text-foreground"
            >
              <option value="">{t.filters.allCompetitions}</option>
              {(facets?.competitions ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.count})
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-sm">
            <span className="text-foreground/60">{t.filters.season}</span>
            <select
              name="seasonId"
              defaultValue={sp.seasonId ?? ''}
              className="rounded-lg border border-border bg-background px-3 py-2 text-foreground"
            >
              <option value="">{t.filters.allSeasons}</option>
              {(facets?.seasons ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.count})
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-sm">
            <span className="text-foreground/60">{t.filters.from}</span>
            <input
              type="date"
              name="dateFrom"
              defaultValue={sp.dateFrom ?? ''}
              className="rounded-lg border border-border bg-background px-3 py-2 text-foreground"
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-sm">
            <span className="text-foreground/60">{t.filters.to}</span>
            <input
              type="date"
              name="dateTo"
              defaultValue={sp.dateTo ?? ''}
              className="rounded-lg border border-border bg-background px-3 py-2 text-foreground"
            />
          </label>
        </fieldset>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 font-medium text-on-primary"
          >
            {t.filters.apply}
          </button>
          <Link href="/matches" className="text-sm text-primary-ink underline">
            {t.filters.clear}
          </Link>
          <span className="text-sm text-foreground/60">
            {total.toLocaleString(locale)} {t.filters.results}
          </span>
        </div>
      </form>

      {rows.length === 0 ? (
        <div className="mt-8 rounded-xl border border-border bg-background p-6 text-center">
          <p className="font-heading text-lg text-foreground">{t.filters.noResults}</p>
          <p className="mt-1 text-sm text-foreground/60">{t.filters.noResultsHint}</p>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-xl border border-border bg-background shadow-sm">
          <table className="w-full text-sm">
            <caption className="sr-only">{t.title}</caption>
            <thead className="bg-muted text-left">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium text-foreground">
                  {t.table.date}
                </th>
                <th scope="col" className="px-4 py-3 font-medium text-foreground">
                  {t.table.match}
                </th>
                {/* T579 (ITEM 20) — a coluna "Placar" foi ABSORVIDA pela coluna "Partida".
                    O dono pediu a frase na ordem do confronto — "SS Lazio 0 x 1 Unione
                    Sportiva Lecce" — e essa ordem é impossível de montar com os dois placares
                    numa célula à parte: o leitor teria de saltar para a direita no meio da
                    frase. Placar separado do nome também é o que faz o leitor de tela dizer
                    os nomes primeiro e os números depois, sem dizer de quem é cada número. */}
                <th scope="col" className="px-4 py-3 font-medium text-foreground">
                  {t.table.competition}
                </th>
                <th scope="col" className="px-4 py-3 font-medium text-foreground">
                  {t.table.season}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-t border-border/50">
                  <td className="whitespace-nowrap px-4 py-3 text-foreground/60">
                    {fmtDate(m.date)}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    <Confronto
                      match={m}
                      joiner={t579.matches.scoreJoiner}
                      noScore={t579.matches.noScore}
                    />
                  </td>
                  <td className="px-4 py-3 text-foreground/60">{m.competition?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-foreground/60">
                    {m.season?.name ?? '—'}
                    {m.round ? <span className="ml-1 text-foreground/70">· {m.round}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(hasPrev || hasNext) && (
        <nav className="mt-6 flex items-center justify-center gap-4" aria-label={t.title}>
          {hasPrev && (
            <Link
              href={pageQuery(Math.max(offset - PAGE_SIZE, 0))}
              className="text-primary-ink underline"
            >
              ← {t.pagination.previous}
            </Link>
          )}
          <span className="text-sm text-foreground/60">
            {t.pagination.page} {Math.floor(offset / PAGE_SIZE) + 1}
          </span>
          {hasNext && (
            <Link href={pageQuery(offset + PAGE_SIZE)} className="text-primary-ink underline">
              {t.pagination.next} →
            </Link>
          )}
        </nav>
      )}

      <p className="mt-8 text-xs text-foreground/60">{t.source}</p>
    </div>
  );
}

/**
 * T579 (ITEM 20) — o CONFRONTO na ordem em que se lê um resultado:
 * `escudo · time da casa · placar da casa · × · placar do visitante · time visitante · escudo`.
 *
 * A ordem visual é a ordem do DOM, e é isso que faz a leitura funcionar: um leitor de tela
 * anuncia a sequência como ela aparece. O "×" é DECORATIVO (`aria-hidden`) e quem carrega a
 * fala é a conjunção invisível (`a`/`to`) — o resultado soa "SS Lazio 0 a 1 Unione Sportiva
 * Lecce", com cada número colado no time a que pertence. Sem isso, o "×" seria lido como
 * "vezes" no meio da frase, ou — pior, no desenho antigo com placar em outra coluna — os dois
 * números chegariam longe dos nomes, sem dizer de quem são.
 *
 * Placar ausente na fonte: os dois números são uma UNIDADE. Se um dos lados falta, não existe
 * "1 × —" a inventar; a célula DECLARA a lacuna (`sem placar na fonte`) em vez de mostrar
 * zero, que é um número com cara de fato.
 *
 * Sem logo no acervo, entra o escudo genérico AUTORAL do projeto via `ClubCrest` — nunca um
 * brasão inventado (mesma regra do `PlayerPhoto`).
 */
function Confronto({
  match,
  joiner,
  noScore,
}: {
  match: MatchRow;
  joiner: string;
  noScore: string;
}) {
  const { homeClub, awayClub, homeScore, awayScore } = match;
  const temPlacar = homeScore != null && awayScore != null;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      {homeClub ? <ClubCrest logoUrl={homeClub.logoUrl} name={homeClub.name} size={26} /> : null}
      {homeClub ? (
        <Link href={`/clubs/${homeClub.id}`} className="text-primary-ink underline">
          {homeClub.name}
        </Link>
      ) : (
        <span className="text-foreground/70">—</span>
      )}
      {temPlacar ? (
        <>
          <span className="font-heading font-bold tabular-nums">{homeScore}</span>
          <span aria-hidden="true" className="text-foreground/60">
            ×
          </span>
          <span className="sr-only">{joiner}</span>
          <span className="font-heading font-bold tabular-nums">{awayScore}</span>
        </>
      ) : (
        <span className="text-foreground/60">{noScore}</span>
      )}
      {awayClub ? (
        <Link href={`/clubs/${awayClub.id}`} className="text-primary-ink underline">
          {awayClub.name}
        </Link>
      ) : (
        <span className="text-foreground/70">—</span>
      )}
      {awayClub ? <ClubCrest logoUrl={awayClub.logoUrl} name={awayClub.name} size={26} /> : null}
    </span>
  );
}
