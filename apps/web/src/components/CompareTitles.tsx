'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  CHART_LEGEND_STYLE,
  CHART_SERIES_A,
  CHART_SERIES_B,
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
} from '@/lib/chart-theme';
import { useI18n } from '@/i18n/Provider';

// T440 — Títulos por hierarquia (barras agrupadas, 2 séries).

const HIERARCHIES = ['mundial', 'continental', 'nacional', 'estadual', 'municipal'] as const;

export default function CompareTitles({
  aName,
  bName,
  aTitles,
  bTitles,
}: {
  aName: string;
  bName: string;
  aTitles: Record<string, number>;
  bTitles: Record<string, number>;
}) {
  const { dict } = useI18n();
  const t = dict.pages.compare;
  const label: Record<string, string> = {
    mundial: t.world,
    continental: t.continental,
    nacional: t.national,
    estadual: t.state,
    municipal: t.municipal,
  };

  const data = HIERARCHIES.map((h) => ({
    hierarchy: label[h],
    [aName]: aTitles[h] ?? 0,
    [bName]: bTitles[h] ?? 0,
  }));
  const totalA = aTitles.total ?? 0;
  const totalB = bTitles.total ?? 0;

  if (totalA === 0 && totalB === 0) {
    return (
      <section aria-label={t.titlesTitle}>
        <h2 className="text-xl font-heading font-semibold mb-3">{t.titlesTitle}</h2>
        <p className="text-sm text-foreground/70">{t.noData}</p>
      </section>
    );
  }

  return (
    <section aria-label={t.titlesTitle}>
      <h2 className="text-xl font-heading font-semibold mb-3">{t.titlesTitle}</h2>
      <div
        role="img"
        aria-label={`${t.titlesTitle}: ${aName} (${totalA}) vs ${bName} (${totalB})`}
        className="w-full h-72 rounded-xl border border-border p-4"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <XAxis dataKey="hierarchy" fontSize={12} />
            <YAxis allowDecimals={false} fontSize={12} />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              labelStyle={CHART_TOOLTIP_LABEL_STYLE}
              itemStyle={CHART_TOOLTIP_ITEM_STYLE}
            />
            <Legend wrapperStyle={CHART_LEGEND_STYLE} />
            <Bar dataKey={aName} fill={CHART_SERIES_A} radius={[4, 4, 0, 0]} />
            <Bar dataKey={bName} fill={CHART_SERIES_B} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-foreground/70">
        {t.titlesTotal}: {aName} {totalA} · {bName} {totalB}
      </p>
    </section>
  );
}
