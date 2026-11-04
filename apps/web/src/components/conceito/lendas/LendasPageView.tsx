import SourceNote from '@/components/SourceNote';
import { Bars } from '@/components/ficha/Charts';
import { EmptyState, ErrorState } from '@/components/ficha/States';
import type { Locale } from '@/i18n/config';
import {
  conceitoLendasStrings,
  fillLendas,
  type ConceitoLendasStrings,
} from '@/i18n/wsConceitoLendas';
import { formatCount, formatDate } from '@/lib/format';
import { countryName } from '@/lib/country-flag';
import ChampionCards from './ChampionCards';
import LeaderList from './LeaderList';
import MetricBand from './MetricBand';
import RecordCards from './RecordCards';
import type { LegendsCounts, LegendsSummary } from './types';

/**
 * /legends FIEL AO QUADRO DO CONCEITO — a ÚNICA superfície escura do produto.
 *
 * ── COMPOSIÇÃO (o que veio do quadro) ─────────────────────────────────────────────────────
 *   · faixa escura com `.theme-dark` (os tokens escuros são os mesmos de `globals.css`);
 *   · kicker curto, título display ~76 px ("Lendas e Imortais") e subtítulo;
 *   · o "fio" aparece como o desenho o tem: separador de 1 px entre as linhas da lista e
 *     régua de 1 px acima da procedência. O gerador do conceito SUPRIME o fio de seção
 *     (`rule()` em `ficha.py`: peso 2 na largura toda não é desenhado), e o quadro não tem
 *     linha entre o subtítulo e as métricas — então não inventamos uma divisória ali;
 *   · faixa de cinco métricas reais com o número grande (o primeiro em ocre, como o quadro);
 *   · lista densa com número de posição e fio de 1 px entre as linhas;
 *   · cartões de clube com borda de 1 px, número de posição em metal e nº de títulos;
 *   · cartões de recorde com borda e número grande;
 *   · fio + procedência no pé (SourceNote, 11 px, abaixo do dado).
 *
 * ── ADAPTAÇÃO HONESTA (o que o quadro pede e a API não entrega) ───────────────────────────
 * O quadro desenha "Maiores jogadores" (Pelé, Maradona, Messi…) e gráficos de carreira. O
 * `GET /legends` NÃO tem jogadores, biografias, gols por década nem público de estádio —
 * então esses blocos NÃO são renderizados, em vez de preenchidos com o desenho. No lugar
 * entram os três blocos que o payload realmente publica: clubes campeões (WON), líderes por
 * competição (WON) e recordes de partidas encerradas com placar. Cada bloco vazio é omitido;
 * se nenhum tiver dado, a página declara o vazio com `EmptyState` — e falha de rede usa
 * `ErrorState`, que é um estado diferente (falha ≠ vazio).
 */
export interface LendasPageViewProps {
  locale: Locale;
  /** `null` = a chamada a `/legends` falhou. Diferente de um resumo com listas vazias. */
  data: LegendsSummary | null;
  counts: LegendsCounts;
  /** Data de geração do resumo (ISO). */
  generatedAt: string | null;
}

function ProvenanceFooter({
  data,
  generatedAt,
  locale,
  t,
}: {
  data: LegendsSummary;
  generatedAt: string | null;
  locale: Locale;
  t: ConceitoLendasStrings;
}) {
  const titles = data.topChampions.provenance.titlesCounted;
  const competitions = data.competitionLeaders.provenance.competitionsConsidered;
  const matches = data.records.provenance.matchesConsidered;

  return (
    <footer data-testid="lendas-provenance" className="mt-16 border-t border-border pt-4">
      <SourceNote label={t.provenance.lead} />
      <SourceNote label={fillLendas(t.provenance.titles, { count: formatCount(titles, locale) })} />
      <SourceNote
        label={fillLendas(t.provenance.leaders, { count: formatCount(competitions, locale) })}
      />
      <SourceNote
        label={fillLendas(t.provenance.records, { count: formatCount(matches, locale) })}
      />
      <SourceNote label={t.provenance.counts} />
      {generatedAt ? (
        <SourceNote
          label={fillLendas(t.provenance.generated, { date: formatDate(generatedAt, locale) })}
        />
      ) : null}
      <SourceNote label={t.provenance.gap} />
    </footer>
  );
}

export default function LendasPageView({ locale, data, counts, generatedAt }: LendasPageViewProps) {
  const t = conceitoLendasStrings[locale];

  const champions = data?.topChampions.items ?? [];
  const leaders = data?.competitionLeaders.items ?? [];
  const recordValues = data
    ? [
        data.records.biggestWin,
        data.records.mostGoalsMatch,
        data.records.mostGoalsClubSeason,
        data.records.longestUnbeatenSeason,
      ]
    : [];
  const hasRecords = recordValues.some((record) => record !== null);
  const hasAnyBlock = champions.length > 0 || leaders.length > 0 || hasRecords;

  // Distribuição real dos clubes do topo por país (o quadro tem um gráfico equivalente).
  const porPais = new Map<string, number>();
  for (const champion of champions) {
    const code = champion.country ?? '—';
    porPais.set(code, (porPais.get(code) ?? 0) + 1);
  }
  const countryChart = [...porPais.entries()]
    .map(([code, count]) => ({
      label: code === '—' ? '—' : (countryName(code, locale) ?? code),
      value: count,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div
      data-testid="lendas-dark-surface"
      className="theme-dark min-h-[calc(100vh-5rem)] bg-background text-foreground"
    >
      <div className="mx-auto w-full max-w-[1440px] px-6 pt-10 pb-16 sm:px-10 lg:px-16 lg:pt-14">
        <header>
          <p
            data-testid="lendas-kicker"
            className="text-[11px] leading-none font-semibold tracking-[0.2em] text-ink-3"
          >
            {t.kicker}
          </p>
          <h1 className="mt-3 font-heading text-[42px] leading-[1.02] font-bold tracking-[-0.02em] text-foreground sm:text-[58px] lg:text-[76px]">
            {t.title}
          </h1>
          <p className="mt-4 max-w-[700px] text-[15px] leading-[22px] text-ink-2 [text-wrap:pretty]">
            {t.subtitle}
          </p>
        </header>

        {data ? (
          <>
            <MetricBand counts={counts} summary={data} locale={locale} t={t} />

            {hasAnyBlock ? (
              <>
                {leaders.length > 0 ? (
                  <>
                    <LeaderList items={leaders} locale={locale} t={t} />
                    <p className="mt-2 max-w-[820px] text-[11px] leading-snug text-ink-3">
                      {t.chart.playersGap}
                    </p>
                  </>
                ) : null}
                {champions.length > 0 ? (
                  <ChampionCards items={champions.slice(0, 5)} locale={locale} t={t} />
                ) : null}

                {/* O quadro pede três gráficos. O dado sustenta DOIS (títulos por clube e
                    distribuição por país); carreira/público não existem no payload. */}
                {champions.length > 1 ? (
                  <section className="mt-12" aria-labelledby="lendas-chart-title">
                    <h2
                      id="lendas-chart-title"
                      className="text-[12.5px] font-semibold text-secondary"
                    >
                      {t.chart.chartsLabel}
                    </h2>
                    <div className="mt-4 grid gap-8 lg:grid-cols-2">
                      <div className="max-w-[760px]">
                        <Bars
                          horizontal
                          data={champions.slice(0, 10).map((c) => ({
                            label: c.clubName,
                            value: c.titles,
                          }))}
                          title={t.chart.title}
                          summary={fillLendas(t.chart.summary, {
                            club: champions[0]?.clubName ?? '—',
                            titles: formatCount(champions[0]?.titles ?? 0, locale),
                          })}
                          height={240}
                        />
                      </div>
                      <div className="max-w-[760px]">
                        <Bars
                          horizontal
                          data={countryChart}
                          title={t.chart.countryTitle}
                          summary={fillLendas(t.chart.countrySummary, {
                            count: String(champions.length),
                          })}
                          height={240}
                        />
                      </div>
                    </div>
                  </section>
                ) : null}

                {hasRecords ? <RecordCards records={data.records} locale={locale} t={t} /> : null}
                <ProvenanceFooter data={data} generatedAt={generatedAt} locale={locale} t={t} />
              </>
            ) : (
              <div className="mt-12">
                <EmptyState title={t.states.emptyTitle} body={t.states.emptyBody} />
              </div>
            )}
          </>
        ) : (
          <div className="mt-12">
            <ErrorState
              title={t.states.loadErrorTitle}
              body={t.states.loadErrorBody}
              retryLabel={t.states.retry}
              retryHref="/legends"
            />
          </div>
        )}
      </div>
    </div>
  );
}
