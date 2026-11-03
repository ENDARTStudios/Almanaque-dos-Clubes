import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getApiBase } from '@/lib/api-base';
import { formatCount, formatDate } from '@/lib/format';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';
import { rankingDetalheStrings } from '@/i18n/wsRankingDetalhe';
import { fichaStrings } from '@/i18n/wsFicha';
import FichaHead from '@/components/ficha/FichaHead';
import DataTable from '@/components/ficha/DataTable';
import SectionHeading from '@/components/ficha/SectionHeading';
import { Medal } from '@/components/ficha/Metal';
import { EmptyState } from '@/components/ficha/States';
import SourceNote from '@/components/SourceNote';
import DetailUnavailable from '@/components/ficha/DetailUnavailable';

/**
 * RANKING — a tabela de UM ranking, com pódio.
 *
 * ── O QUE FALTAVA ──────────────────────────────────────────────────────────────────────────
 * `/rankings` mostra uma lista plana de entradas (cursor, muitas competições misturadas). Não
 * havia como ver UM ranking: as 25 primeiras linhas de um clube-ranking misturado não respondem
 * "quem lidera este ranking". O endpoint `GET /rankings/:id/entries` já existia — faltava a tela.
 *
 * ── A API PRECISOU DE UM AJUSTE, E ELE VALE A PENA EXPLICAR ───────────────────────────────
 * As entradas traziam `clubId`/`playerId` — UUIDs — e nenhum nome. Uma tabela com UUID como
 * "Clube" é ilegível, e resolver por N+1 chamadas seria pior. O `findEntries` passou a trazer o
 * nome na MESMA query (`include` com `select: { name }`), então a página não faz uma chamada por
 * linha.
 *
 * ── ONDE ENTRA O METAL ────────────────────────────────────────────────────────────────────
 * As três primeiras posições recebem ouro, prata e bronze. Mas a cor NÃO é o único portador:
 * `Medal` muda de FORMA por colocação (anel externo no ouro, contorno vazado na prata, disco menor
 * no bronze), e a posição continua escrita em número na coluna. Quem não distingue as cores lê a
 * mesma informação.
 *
 * ── POSIÇÃO NULA ──────────────────────────────────────────────────────────────────────────
 * `position: null` significa "sem posição publicada por dados insuficientes" (T425), e NÃO
 * "último lugar". Por isso a linha mostra "—" no lugar do número e o motivo quando existe, em vez
 * de herdar o número da linha anterior.
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <Link
        href="/rankings"
        className="mb-6 inline-block text-sm text-primary-ink underline decoration-dotted underline-offset-2"
      >
        &larr; {s.backToRankings}
      </Link>

      <FichaHead
        title={ranking.name}
        subtitle={[
          ranking.season ? `${s.season}: ${ranking.season}` : null,
          ranking.country ? `${s.scopeCountry}: ${ranking.country}` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
        anchor={entradas.length > 0 ? String(entradas.length) : undefined}
      />

      <div className="mt-8">
        <SectionHeading aside={entradas.length > 0 ? String(entradas.length) : undefined}>
          {ranking.name}
        </SectionHeading>

        {entradas.length === 0 ? (
          <div className="mt-4">
            <EmptyState title={ranking.name} body={f.emptyBody} />
          </div>
        ) : (
          <DataTable
            caption={ranking.name}
            columns={[
              { header: s.colPosition, align: 'right' },
              { header: s.colName, align: 'left' },
              { header: s.colPoints, align: 'right' },
              { header: s.colBase, align: 'left' },
            ]}
            rows={entradas.map((e) => {
              const nome = e.playerName ?? e.clubName ?? '—';
              const posicao = e.position;

              return [
                // a posição é o NÚMERO, e a medalha acompanha — cor não é o único portador
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

                // pontos ausentes mostram "—", nunca 0
                <span key={`pt-${e.id}`} className="tabular-nums text-foreground">
                  {e.points != null ? formatCount(e.points, locale) : '—'}
                </span>,

                // base auditável: é o que impede o número de ser afirmação sem lastro
                <span key={`b-${e.id}`} className="text-xs text-ink-3">
                  {e.baseMatches != null || e.baseTitles != null
                    ? [
                        e.baseMatches != null
                          ? `${formatCount(e.baseMatches, locale)} ${s.baseMatches}`
                          : null,
                        e.baseTitles != null
                          ? `${formatCount(e.baseTitles, locale)} ${s.baseTitles}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')
                    : '—'}
                </span>,
              ];
            })}
          />
        )}

        <div className="mt-6">
          <SourceNote
            label={ranking.publishedAt ? s.published : s.unpublished}
            detail={
              ranking.publishedAt
                ? `${s.provenance} · ${formatDate(ranking.publishedAt, locale)}`
                : s.provenance
            }
          />
        </div>
      </div>
    </div>
  );
}
