'use client';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  CHART_GRID_PROPS,
  CHART_SERIES_A,
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
} from '@/lib/chart-theme';
import type { AdminMetricsPayload } from './types';
import type { AdminMetricsStrings } from './strings';

type Series = AdminMetricsPayload['series'];

/**
 * Os três gráficos do painel. Cada um tem:
 *   - título visível (`h2`);
 *   - o gráfico marcado com `role="img"` + `aria-label`;
 *   - um RESUMO TEXTUAL em `<details>` com a mesma informação em tabela — o
 *     gráfico nunca é a única forma de ler o dado (WCAG 1.1.1).
 *
 * `isAnimationActive={false}`: movimento não acrescenta informação aqui e o
 * conteúdo precisa existir sem animação (régua de motion do projeto).
 */
function labelForKey(key: string, s: AdminMetricsStrings): string {
  switch (key) {
    case 'clubs':
      return s.catalogKeys.clubs;
    case 'nationalTeams':
      return s.catalogKeys.nationalTeams;
    case 'players':
      return s.catalogKeys.players;
    case 'matches':
      return s.catalogKeys.matches;
    case 'competitions':
      return s.catalogKeys.competitions;
    default:
      return s.catalogKeys.other;
  }
}

function TextTable({
  columns,
  rows,
}: {
  columns: [string, string];
  rows: Array<[string, number]>;
}) {
  return (
    <table className="mt-2 w-full text-xs text-foreground/70">
      <thead>
        <tr>
          <th scope="col" className="py-1 text-left font-medium">
            {columns[0]}
          </th>
          <th scope="col" className="py-1 text-right font-medium">
            {columns[1]}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label} className="border-t border-border/50">
            <td className="py-1">{label}</td>
            <td className="py-1 text-right tabular-nums">{value.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ChartSection({
  title,
  intro,
  ariaLabel,
  seeData,
  noData,
  isEmpty,
  columns,
  rows,
  children,
}: {
  title: string;
  intro: string;
  ariaLabel: string;
  seeData: string;
  noData: string;
  isEmpty: boolean;
  columns: [string, string];
  rows: Array<[string, number]>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-muted p-5">
      <h2 className="mb-1 text-lg font-heading font-semibold text-foreground">{title}</h2>
      <p className="mb-3 text-sm text-foreground/70">{intro}</p>
      {isEmpty ? (
        <p className="text-sm text-foreground/70">{noData}</p>
      ) : (
        <>
          <div role="img" aria-label={ariaLabel} className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {children}
            </ResponsiveContainer>
          </div>
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-foreground/70">{seeData}</summary>
            <TextTable columns={columns} rows={rows} />
          </details>
        </>
      )}
    </section>
  );
}

export default function MetricsCharts({ series, s }: { series: Series; s: AdminMetricsStrings }) {
  const monthRows: Array<[string, number]> = series.usersByMonth.map((m) => [m.month, m.count]);
  const catalogRows: Array<[string, number]> = series.catalogByType.map((c) => [
    labelForKey(c.key, s),
    c.count,
  ]);
  const favoriteRows: Array<[string, number]> = series.topFavorites.map((f) => [
    f.name ?? f.targetId,
    f.count,
  ]);

  return (
    <div className="space-y-6">
      <ChartSection
        title={s.charts.usersByMonthTitle}
        intro={s.charts.usersByMonthIntro}
        ariaLabel={`${s.charts.usersByMonthTitle}: ${monthRows.map(([m, c]) => `${m} ${c}`).join(', ')}`}
        seeData={s.seeData}
        noData={s.noData}
        isEmpty={monthRows.every(([, c]) => c === 0)}
        columns={[s.tableMonth, s.tableCount]}
        rows={monthRows}
      >
        <BarChart data={series.usersByMonth} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" {...CHART_GRID_PROPS} />
          <XAxis dataKey="month" fontSize={12} />
          <YAxis allowDecimals={false} fontSize={12} />
          <Tooltip
            contentStyle={CHART_TOOLTIP_STYLE}
            labelStyle={CHART_TOOLTIP_LABEL_STYLE}
            itemStyle={CHART_TOOLTIP_ITEM_STYLE}
          />
          <Bar
            dataKey="count"
            name={s.tableCount}
            fill={CHART_SERIES_A}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartSection>

      <ChartSection
        title={s.charts.catalogTitle}
        intro={s.charts.catalogIntro}
        ariaLabel={`${s.charts.catalogTitle}: ${catalogRows.map(([l, c]) => `${l} ${c}`).join(', ')}`}
        seeData={s.seeData}
        noData={s.noData}
        isEmpty={catalogRows.every(([, c]) => c === 0)}
        columns={[s.tableType, s.tableCount]}
        rows={catalogRows}
      >
        <BarChart
          data={series.catalogByType.map((c) => ({ label: labelForKey(c.key, s), count: c.count }))}
          margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" {...CHART_GRID_PROPS} />
          <XAxis dataKey="label" fontSize={12} />
          <YAxis allowDecimals={false} fontSize={12} />
          <Tooltip
            contentStyle={CHART_TOOLTIP_STYLE}
            labelStyle={CHART_TOOLTIP_LABEL_STYLE}
            itemStyle={CHART_TOOLTIP_ITEM_STYLE}
          />
          <Bar
            dataKey="count"
            name={s.tableCount}
            fill={CHART_SERIES_A}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartSection>

      <ChartSection
        title={s.charts.favoritesTitle}
        intro={s.charts.favoritesIntro}
        ariaLabel={`${s.charts.favoritesTitle}: ${favoriteRows.map(([l, c]) => `${l} ${c}`).join(', ')}`}
        seeData={s.seeData}
        noData={s.noData}
        isEmpty={favoriteRows.length === 0}
        columns={[s.tableTarget, s.tableFavorites]}
        rows={favoriteRows}
      >
        <BarChart
          layout="vertical"
          data={series.topFavorites.map((f) => ({
            label: f.name ?? f.targetId,
            count: f.count,
          }))}
          margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" {...CHART_GRID_PROPS} />
          <XAxis type="number" allowDecimals={false} fontSize={12} />
          <YAxis type="category" dataKey="label" width={150} fontSize={12} />
          <Tooltip
            contentStyle={CHART_TOOLTIP_STYLE}
            labelStyle={CHART_TOOLTIP_LABEL_STYLE}
            itemStyle={CHART_TOOLTIP_ITEM_STYLE}
          />
          <Bar
            dataKey="count"
            name={s.tableFavorites}
            fill={CHART_SERIES_A}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartSection>
    </div>
  );
}
