import type { Locale } from '@/i18n/config';
import type { ConceitoLendasStrings } from '@/i18n/wsConceitoLendas';
import { formatCount } from '@/lib/format';
import type { LegendsCounts, LegendsSummary } from './types';

/**
 * FAIXA DE MÉTRICAS — cinco números reais com o rótulo sempre junto.
 *
 * O quadro usa "Jogadores 1.284 · Clubes 312 · Títulos 2.046 · Recordes 97 · Países 64".
 * Nenhum desses números é publicado pelo acervo como está: cada célula aqui vem de uma
 * fonte real e verificável —
 *   · jogadores/clubes → `total` da paginação de `/players` e `/clubs`;
 *   · títulos         → `titlesCounted` (arestas WON contabilizadas pelo próprio /legends);
 *   · competições     → `competitionsConsidered` (competições com títulos auditáveis);
 *   · países          → `totals.countries` de `/clubs/countries`.
 * Se uma origem não responde, a célula vira "—": lacuna declarada, nunca 0. O primeiro
 * número é o acento ocre, como no quadro; os demais ficam na tinta cheia.
 */
export default function MetricBand({
  counts,
  summary,
  locale,
  t,
}: {
  counts: LegendsCounts;
  summary: LegendsSummary;
  locale: Locale;
  t: ConceitoLendasStrings;
}) {
  const metrics = [
    { key: 'players', label: t.metrics.players, value: counts.players },
    { key: 'clubs', label: t.metrics.clubs, value: counts.clubs },
    {
      key: 'titles',
      label: t.metrics.titles,
      value: summary.topChampions.provenance.titlesCounted,
    },
    {
      key: 'competitions',
      label: t.metrics.competitions,
      value: summary.competitionLeaders.provenance.competitionsConsidered,
    },
    { key: 'countries', label: t.metrics.countries, value: counts.countries },
  ];

  return (
    <dl
      data-testid="lendas-metrics"
      aria-label={t.metrics.label}
      className="mt-10 grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-3 lg:grid-cols-5"
    >
      {metrics.map((metric, index) => (
        <div key={metric.key} className="min-w-0">
          <dt className="text-[12.5px] leading-none text-ink-3">{metric.label}</dt>
          <dd
            data-testid={`lendas-metric-${metric.key}`}
            className={`num mt-2 text-[34px] leading-none ${
              index === 0 ? 'text-secondary' : 'text-foreground'
            }`}
          >
            {metric.value === null ? '—' : formatCount(metric.value, locale)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
