import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getApiBase } from '@/lib/api-base';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';
import { temporadasStrings } from '@/i18n/wsTemporadas';
import DetailUnavailable from '@/components/ficha/DetailUnavailable';
import TemporadaFichaPageView from '@/components/conceito/temporada/TemporadaFichaPageView';
import { groupCompetitions, pickSeasonRow } from '@/components/conceito/temporada/derive';
import type {
  CompetitionSeasonRow,
  SeasonCompetition,
  SeasonMatch,
  SeasonSummary,
} from '@/components/conceito/temporada/types';

/**
 * FICHA DA TEMPORADA — composição do conceito, com dado REAL.
 *
 * ── O QUE A PÁGINA CONSULTA ──────────────────────────────────────────────────────────────
 *   · GET /seasons/:id       — a temporada (nome, situação, datas). Fonte do h1 e do status.
 *   · GET /matches?seasonId= — as partidas da temporada, paginadas. Delas saem TODOS os
 *     agregados (partidas, gols, média, 0 a 0, maior goleada), a tabela derivada quando a
 *     fonte não publica a final, os gráficos e a linha do tempo.
 *   · GET /competitions/:id  — o resumo catalogado de cada competição com partidas no ano
 *     (campeão, artilheiro, tabela final). É aditivo: falha em uma não derruba a página.
 *
 * A API NÃO tem um endpoint de agregados de temporada. Por isso a tela declara a procedência
 * das métricas e separa claramente tabela publicada pela fonte de tabela calculada a partir
 * das partidas. Nada é copiado do quadro ilustrativo: sem público no acervo, o bloco de
 * público (métrica e gráfico por mês) simplesmente não é desenhado.
 *
 * ── O QUE ELA NÃO DIZ ────────────────────────────────────────────────────────────────────
 * Não inventa campeão de copa (mata-mata não se decide por pontos), não inventa artilheiro
 * nem "últimos 5" quando a fonte não publica, e falha de rede não vira zero: a consulta de
 * partidas que não volta mostra ErrorState, e temporada sem partida mostra EmptyState.
 */
export const metadata: Metadata = {
  title: 'Temporada · Almanaque dos Clubes',
};

const PAGE_SIZE = 100;
/**
 * Teto de requisições da paginação por data. Hoje a maior temporada do acervo tem 760
 * partidas, o que pede cerca de 10 janelas de 100.
 */
const MAX_MATCH_REQUESTS = 30;

/**
 * valor = existe · null = a origem disse 404 · undefined = não foi possível perguntar.
 * Fundir os dois últimos fazia a ficha afirmar "não existe" com a API fora do ar.
 */
async function getTemporada(id: string): Promise<SeasonSummary | null | undefined> {
  try {
    const base = getApiBase();
    const r = await fetch(base + '/seasons/' + encodeURIComponent(id), {
      next: { revalidate: 3600 },
    });
    if (r.status === 404) return null;
    if (!r.ok) return undefined;
    const j = (await r.json()) as { data?: SeasonSummary };
    return j.data ?? null;
  } catch {
    return undefined;
  }
}

interface MatchesPage {
  data: SeasonMatch[];
  total: number;
}

/** Data (YYYY-MM-DD, UTC) da partida mais antiga de uma página. null se a página veio vazia. */
function oldestDate(matches: SeasonMatch[]): string | null {
  let oldest: string | null = null;
  for (const match of matches) {
    const day = match.date.slice(0, 10);
    if (!oldest || day < oldest) oldest = day;
  }
  return oldest;
}

async function getMatchesPage(seasonId: string, dateTo?: string): Promise<MatchesPage | null> {
  try {
    const base = getApiBase();
    const url =
      base +
      '/matches?seasonId=' +
      encodeURIComponent(seasonId) +
      '&limit=' +
      PAGE_SIZE +
      (dateTo ? '&dateTo=' + encodeURIComponent(dateTo) : '');
    const r = await fetch(url, { next: { revalidate: 3600 } });
    if (!r.ok) return null;
    const json = (await r.json()) as { data?: SeasonMatch[]; total?: number };
    return { data: json.data ?? [], total: json.total ?? 0 };
  } catch {
    return null;
  }
}

interface SeasonMatchesResult {
  matches: SeasonMatch[];
  /** Total declarado pela origem — a tela compara com o recebido para declarar corte. */
  declaredTotal: number;
}

/**
 * Todas as partidas da temporada.
 *
 * ── POR QUE NÃO USAR OFFSET ────────────────────────────────────────────────────────────────
 * A lista pública ordena por data desc e NÃO tem desempate por id. Com centenas de jogos na
 * mesma data, o offset entre páginas é instável: medido em produção na temporada 2017-18, uma
 * partida apareceu no fim da página 0 e no início da página 1, e outra ficou de fora — 759
 * ids únicos para um total de 760. O agregado sairia levemente errado sem aviso.
 *
 * A paginação aqui é por JANELA DE DATA (dateTo = partida mais antiga já vista). A janela
 * seguinte recomeça naquela data, então a sobreposição é deduplicada por id e nenhum jogo fica
 * entre duas páginas. Exige um pouco mais de requisições (cerca de 10 para a maior temporada),
 * mas é o único jeito de somar 760 partidas sem perder uma na fronteira.
 *
 * Falha de qualquer requisição devolve null: agregado com metade das partidas seria um número
 * errado com cara de certo. Se a paginação não fechar (mudança de dados no meio), o resultado
 * volta com declaredTotal maior que a lista recebida e a tela DECLARA o corte.
 */
async function getSeasonMatches(seasonId: string): Promise<SeasonMatchesResult | null> {
  const first = await getMatchesPage(seasonId);
  if (!first) return null;

  const declaredTotal = first.total;
  const byId = new Map<string, SeasonMatch>();
  for (const match of first.data) byId.set(match.id, match);

  let cursor = oldestDate(first.data);
  let requests = 0;

  while (byId.size < declaredTotal && cursor != null && requests < MAX_MATCH_REQUESTS) {
    const page = await getMatchesPage(seasonId, cursor);
    if (!page) return null;
    if (page.data.length === 0) break;

    for (const match of page.data) byId.set(match.id, match);
    requests++;

    const nextCursor = oldestDate(page.data);
    // Página menor que o limite = fim da lista. Cursor que não avança = não há como continuar.
    if (page.data.length < PAGE_SIZE) break;
    if (nextCursor == null || nextCursor >= cursor) break;
    cursor = nextCursor;
  }

  // Total declarado > 0 e nenhuma partida recebida é contradição da origem: não vira vazio.
  if (byId.size === 0 && declaredTotal > 0) return null;

  return { matches: [...byId.values()], declaredTotal };
}

interface CompetitionDetail {
  type: string | null;
  country: string | null;
  season: CompetitionSeasonRow | null;
}

/** Resumo catalogado da competição na temporada pedida. Falha = null (lacuna declarada). */
async function getCompetitionDetail(
  id: string,
  seasonName: string,
): Promise<CompetitionDetail | null> {
  try {
    const base = getApiBase();
    const r = await fetch(base + '/competitions/' + encodeURIComponent(id), {
      next: { revalidate: 3600 },
    });
    if (!r.ok) return null;
    const json = (await r.json()) as {
      data?: { type?: string | null; country?: string | null };
      seasons?: CompetitionSeasonRow[];
    };
    return {
      type: json.data?.type ?? null,
      country: json.data?.country ?? null,
      season: pickSeasonRow(json.seasons ?? [], seasonName),
    };
  } catch {
    return null;
  }
}

export default async function TemporadaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const s = temporadasStrings[locale];

  const season = await getTemporada(id);
  // não perguntar ≠ não existir: só o 404 real vira notFound
  if (season === undefined)
    return (
      <DetailUnavailable
        retryHref={'/temporadas/' + id}
        backHref="/temporadas"
        backLabel={s.backToList}
      />
    );
  if (season === null) notFound();

  const seasonMatches = await getSeasonMatches(season.id);
  const groups = seasonMatches ? groupCompetitions(seasonMatches.matches) : [];
  const details = await Promise.all(
    groups.map((group) => getCompetitionDetail(group.id, season.name)),
  );
  const competitionDetails: SeasonCompetition[] = groups.map((group, index) => {
    const detail = details[index];
    return {
      id: group.id,
      name: group.name,
      type: detail?.type ?? null,
      country: detail?.country ?? null,
      season: detail?.season ?? null,
    };
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <Link
        href="/temporadas"
        className="mb-4 inline-flex min-h-6 items-center text-[13px] text-primary-ink underline decoration-dotted underline-offset-2"
      >
        &larr; {s.backToList}
      </Link>

      <TemporadaFichaPageView
        locale={locale}
        season={season}
        matches={seasonMatches?.matches ?? null}
        declaredTotal={seasonMatches?.declaredTotal ?? null}
        competitionDetails={competitionDetails}
        matchesHref={'/matches?seasonId=' + encodeURIComponent(season.id)}
      />
    </div>
  );
}
