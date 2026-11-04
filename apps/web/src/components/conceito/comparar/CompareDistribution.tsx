'use client';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useI18n } from '@/i18n/Provider';
import { wsConceitoComparar } from '@/i18n/wsConceitoComparar';
import { CHART_TOOLTIP_ITEM_STYLE, CHART_TOOLTIP_STYLE } from '@/lib/chart-theme';

/**
 * DISTRIBUIÇÃO DOS TÍTULOS — dois donuts (A e B) na mesma escala de alcance.
 *
 * Só entra alcance com contagem > 0; se um clube não tem título catalogado, o painel declara a
 * lacuna em vez de desenhar um anel vazio com "0" no meio. As cores são as do sistema (tier-*),
 * não uma paleta nova.
 */
const ALCANCES = [
  { key: 'mundial', color: 'var(--color-tier-mundial)' },
  { key: 'continental', color: 'var(--color-tier-continental)' },
  { key: 'nacional', color: 'var(--color-tier-nacional)' },
  { key: 'estadual', color: 'var(--color-tier-estadual)' },
  { key: 'municipal', color: 'var(--color-viz-5)' },
] as const;

function Donut({
  name,
  titles,
  labelMundial,
  labelContinental,
  labelNacional,
  labelEstadual,
  labelMunicipal,
  emptyLabel,
}: {
  name: string;
  titles: Record<string, number>;
  labelMundial: string;
  labelContinental: string;
  labelNacional: string;
  labelEstadual: string;
  labelMunicipal: string;
  emptyLabel: string;
}) {
  const labels: Record<string, string> = {
    mundial: labelMundial,
    continental: labelContinental,
    nacional: labelNacional,
    estadual: labelEstadual,
    municipal: labelMunicipal,
  };
  const data = ALCANCES.map(({ key, color }) => ({
    name: labels[key],
    value: titles[key] ?? 0,
    color,
  })).filter((d) => d.value > 0);
  const total = titles.total ?? 0;

  if (data.length === 0) {
    return (
      <div className="flex min-w-0 flex-col items-center justify-center gap-2 py-6 text-center">
        <p className="text-[11px] text-ink-3">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col items-center gap-2">
      <div
        className="relative h-[150px] w-full"
        role="img"
        aria-label={`${name}: ${total} ${labels.mundial}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={44}
              outerRadius={66}
              strokeWidth={0}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} itemStyle={CHART_TOOLTIP_ITEM_STYLE} />
          </PieChart>
        </ResponsiveContainer>
        <span className="num pointer-events-none absolute inset-0 flex items-center justify-center text-[20px] font-bold text-foreground">
          {total}
        </span>
      </div>
      <p className="max-w-full truncate text-[11px] font-semibold text-foreground">{name}</p>
      <ul className="mt-1 w-full list-none space-y-0.5 p-0">
        {data.map((d) => (
          <li
            key={d.name}
            className="flex items-center justify-between gap-2 text-[10px] text-ink-3"
          >
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: d.color }}
                aria-hidden="true"
              />
              {d.name}
            </span>
            <span className="num tabular-nums">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function CompareDistribution({
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
  const { dict, locale } = useI18n();
  const t = dict.pages.compare;
  const c = wsConceitoComparar[locale];
  return (
    <section aria-label={c.distributionTitle} data-testid="conceito-comparar-donut">
      <h2 className="text-[12.5px] font-semibold text-foreground">{c.distributionTitle}</h2>
      <div className="mt-3 grid grid-cols-2 gap-4">
        <Donut
          name={aName}
          titles={aTitles}
          labelMundial={t.world}
          labelContinental={t.continental}
          labelNacional={t.national}
          labelEstadual={t.state}
          labelMunicipal={t.municipal}
          emptyLabel={t.noData}
        />
        <Donut
          name={bName}
          titles={bTitles}
          labelMundial={t.world}
          labelContinental={t.continental}
          labelNacional={t.national}
          labelEstadual={t.state}
          labelMunicipal={t.municipal}
          emptyLabel={t.noData}
        />
      </div>
    </section>
  );
}
