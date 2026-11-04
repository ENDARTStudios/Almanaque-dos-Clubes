import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getApiBase } from '@/lib/api-base';
import { formatCount, formatDate } from '@/lib/format';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';
import { rankingDetalheStrings } from '@/i18n/wsRankingDetalhe';
import { fichaStrings } from '@/i18n/wsFicha';
import { wsConceitoRankingDetalhe } from '@/i18n/wsConceitoRankingDetalhe';
import FichaHead from '@/components/ficha/FichaHead';
import DataTable from '@/components/ficha/DataTable';
import { Medal } from '@/components/ficha/Metal';
import { EmptyState } from '@/components/ficha/States';
import SourceNote from '@/components/SourceNote';
import DetailUnavailable from '@/components/ficha/DetailUnavailable';
import CriteriaBox from '@/components/conceito/ranking-detalhe/CriteriaBox';

/**
 * RANKING — a tabela de UM ranking, no conceito FICHA.
 *
 * O que mudou em relação à versão anterior:
 *   · FichaHead com o número-âncora REAL de entradas publicadas e o rótulo;
 *   · a "Régua" vira chip ativo (Clubes/Jogadores) + link "todos os rankings";
 *   · a tabela separa a BASE AUDITÁVEL em duas colunas reais (Títulos e Partidas), em vez de
 *     esconder as duas num texto corrido;
 *   · a caixa do critério entra embaixo, com a régua aberta e o link da metodologia;
 *   · a procedência declara que "—" é lacuna, nunca zero.
 *
 * O QUE O DESENHO TEM E A API NÃO PUBLICA: país por entrada, variação de posição e a quebra por
 * alcance (mundial/continental/nacional). Essas colunas NÃO existem; a tabela usa o que o
 * endpoint entrega e a nota declara o restante. Posição nula continua sendo "sem posição
 * publicada" (T425), nunca o número da linha anterior.
 */
export const metadata: Metadata = {
  title: 'Ranking · Almanaque dos Clubes',
};

interface Entrada {
  id: string;
  position: number | null;
  points: number | null;
  baseMatches: number | null;
  baseTitles: number | null;
  reason: string | null;
  clubId: string | null;
  clubName: string | null;
  playerName: string | null;
}

interface RankingInfo {
  id: string;
  name: string;
  season: string | null;
  country: string | null;
  scope: string | null;
  publishedAt: string | null;
}

type Resposta = { data?: RankingInfo };

/**
 * `valor` = existe · `null` = a origem disse 404 · `undefined` = não foi possível perguntar.
 */
async function getRanking(id: string): Promise<RankingInfo | null | undefined> {
  try {
    const base = getApiBase();
    const r = await fetch(`${base}/rankings/${encodeURIComponent(id)}`, {
      next: { revalidate: 3600 },
    });
    if (r.status === 404) return null;
    if (!r.ok) return undefined;
    const j = (await r.json()) as Resposta;
    return j.data ?? null;
  } catch {
    return undefined;
  }
}

async function getEntradas(id: string): Promise<Entrada[]> {
  try {
    const base = getApiBase();
    const r = await fetch(`${base}/rankings/${encodeURIComponent(id)}/entries`, {
      next: { revalidate: 3600 },
    });
    if (!r.ok) return [];
    const j = (await r.json()) as { data?: Entrada[] };
    return j.data ?? [];
  } catch {
    return [];
  }
}

export default async function RankingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const s = rankingDetalheStrings[locale];
  const c = wsConceitoRankingDetalhe[locale];
  const f = fichaStrings[locale].states;

  const [ranking, entradas] = await Promise.all([getRanking(id), getEntradas(id)]);
  if (ranking === undefined)
    return (
      <DetailUnavailable
        retryHref={`/rankings/${id}`}
        backHref="/rankings"
        backLabel={s.backToRankings}
      />
    );
  if (ranking === null) notFound();

  // o ranking de jogador usa playerName; o de clube, clubName — a coluna é a mesma
  const ehJogador = entradas.some((e) => e.playerName !== null);
  const contexto = [
    ranking.season ? `${s.season}: ${ranking.season}` : null,
    ranking.country ? `${s.scopeCountry}: ${ranking.country}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <Link
        href="/rankings"
        className="mb-6 inline-block text-sm text-primary-ink underline decoration-dotted underline-offset-2"
      >
        &larr; {s.backToRankings}
      </Link>

      <FichaHead
        title={ranking.name}
        subtitle={`${c.kicker}${contexto ? ` · ${contexto}` : ''} · ${c.subtitle}`}
        anchor={entradas.length > 0 ? formatCount(entradas.length, locale) : undefined}
        anchorLabel={c.anchorLabel}
      />

      {/* RÉGUA — chip do tipo ativo + caminho de volta para o índice. */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold leading-none text-ink-3">{c.regimeLabel}</span>
        <span className="inline-flex min-h-8 items-center rounded-[2px] border border-foreground bg-foreground px-3 text-[12px] font-semibold text-background">
          {ehJogador ? c.activePlayer : c.activeClub}
        </span>
        <Link
          href="/rankings"
          className="inline-flex min-h-8 items-center rounded-[2px] border border-border bg-surface px-3 text-[12px] text-ink-2 transition-colors duration-200 hover:border-foreground hover:text-foreground"
        >
          {c.seeAll}
        </Link>
      </div>

      <div className="mt-8">
        {entradas.length === 0 ? (
          <EmptyState title={ranking.name} body={f.emptyBody} />
        ) : (
          <DataTable
            caption={ranking.name}
            columns={[
              { header: s.colPosition, align: 'right' },
              { header: ehJogador ? c.colPlayer : s.colName, align: 'left' },
              { header: s.colPoints, align: 'right' },
              { header: c.colTitles, align: 'right' },
              { header: c.colMatches, align: 'right' },
            ]}
            rows={entradas.map((e) => {
              const nome = e.playerName ?? e.clubName ?? '—';
              const posicao = e.position;

              return [
                <span key={`p-${e.id}`} className="inline-flex items-center gap-2 tabular-nums">
                  {posicao != null ? (
                    <>
                      {posicao <= 3 ? (
                        <Medal
                          metal={posicao === 1 ? 'ouro' : posicao === 2 ? 'prata' : 'bronze'}
                          place={posicao as 1 | 2 | 3}
                        />
                      ) : null}
                      <span className="text-foreground">{posicao}</span>
                    </>
                  ) : (
                    <span className="text-ink-3" title={e.reason ?? s.noPosition}>
                      —
                    </span>
                  )}
                </span>,

                e.clubId && !ehJogador ? (
                  <Link
                    key={`n-${e.id}`}
                    href={`/clubs/${e.clubId}`}
                    className="text-primary-ink hover:underline"
                  >
                    {nome}
                  </Link>
                ) : (
                  <span key={`n-${e.id}`} className="text-foreground">
                    {nome}
                  </span>
                ),

                <span key={`pt-${e.id}`} className="tabular-nums text-foreground">
                  {e.points != null ? formatCount(e.points, locale) : '—'}
                </span>,

                <span key={`t-${e.id}`} className="tabular-nums text-ink-2">
                  {e.baseTitles != null ? formatCount(e.baseTitles, locale) : '—'}
                </span>,

                <span key={`b-${e.id}`} className="tabular-nums text-ink-2">
                  {e.baseMatches != null ? formatCount(e.baseMatches, locale) : '—'}
                </span>,
              ];
            })}
          />
        )}

        <CriteriaBox s={c} />

        <div className="mt-6">
          <SourceNote
            label={ranking.publishedAt ? s.published : s.unpublished}
            detail={
              ranking.publishedAt
                ? `${c.provenance} · ${formatDate(ranking.publishedAt, locale)}`
                : c.provenance
            }
          />
        </div>
      </div>
    </div>
  );
}
