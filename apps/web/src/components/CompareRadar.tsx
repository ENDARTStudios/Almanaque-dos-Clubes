'use client';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useI18n } from '@/i18n/Provider';
import { buildRadarData, type RadarMetricInput } from '@/lib/compare-radar';
import {
  CHART_GRID_PROPS,
  CHART_LEGEND_STYLE,
  CHART_SERIES_A,
  CHART_SERIES_B,
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
} from '@/lib/chart-theme';

// T072 — Comparadores avançados: visão geral em radar (normalização declarada).

export default function CompareRadar({
  aName,
  bName,
  metrics,
}: {
  aName: string;
  bName: string;
  metrics: RadarMetricInput[];
}) {
  const { dict } = useI18n();
  const t = dict.pages.compare;
  const { points, excluded } = buildRadarData(metrics);

  if (points.length === 0) {
    // Nenhum eixo plotável — estado vazio honesto (sem radar vazio).
    return null;
  }

  // recharts recebe as séries em colunas (uma linha por eixo).
  const data = points.map((p) => ({
    axis: p.label,
    [aName]: p.a,
    [bName]: p.b,
  }));

  return (
    <section aria-label={t.radarTitle}>
      <h2 className="text-xl font-heading font-semibold mb-3">{t.radarTitle}</h2>
      <div
        role="img"
        aria-label={`${t.radarTitle}: ${aName} vs ${bName}`}
        className="w-full h-80 rounded-xl border border-border p-4"
      >
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%">
            {/* Grade/linhas via `currentColor` com opacidade: herda o token do tema (claro ou
                escuro) em vez do `#00000018` fixo, que sumia no fundo escuro. Os rótulos dos
                eixos já herdam `currentColor` por padrão no Recharts. */}
            <PolarGrid {...CHART_GRID_PROPS} />
            <PolarAngleAxis dataKey="axis" fontSize={12} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            {/* Séries nos tokens da marca: vermelho (`--color-primary`) contra dourado
                (`--color-secondary`). O azul `#1d4ed8` era cor fora do design system e tinha
                contraste fraco sobre escuro. */}
            <Radar
              name={aName}
              dataKey={aName}
              stroke={CHART_SERIES_A}
              fill={CHART_SERIES_A}
              fillOpacity={0.25}
            />
            <Radar
              name={bName}
              dataKey={bName}
              stroke={CHART_SERIES_B}
              fill={CHART_SERIES_B}
              fillOpacity={0.25}
            />
            <Legend wrapperStyle={CHART_LEGEND_STYLE} />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              labelStyle={CHART_TOOLTIP_LABEL_STYLE}
              itemStyle={CHART_TOOLTIP_ITEM_STYLE}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-foreground/70">
        {t.radarNote}
        {excluded.length > 0 ? ` ${t.radarExcluded} ${excluded.join(', ')}.` : ''}
      </p>
    </section>
  );
}
