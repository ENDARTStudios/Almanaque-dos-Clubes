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
            <PolarGrid stroke="#00000018" />
            <PolarAngleAxis dataKey="axis" fontSize={12} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar name={aName} dataKey={aName} stroke="#b91c1c" fill="#b91c1c" fillOpacity={0.25} />
            <Radar name={bName} dataKey={bName} stroke="#1d4ed8" fill="#1d4ed8" fillOpacity={0.25} />
            <Legend />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-foreground/40">
        {t.radarNote}
        {excluded.length > 0 ? ` ${t.radarExcluded} ${excluded.join(', ')}.` : ''}
      </p>
    </section>
  );
}
