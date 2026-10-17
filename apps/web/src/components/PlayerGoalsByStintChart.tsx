'use client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import {
  CHART_GRID_PROPS,
  CHART_SERIES_A,
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
} from '@/lib/chart-theme';

// T-22.3 — gols do jogador por passagem (stint) na página de perfil.
// Mesmo desenho do LegendsTopChart (server busca, este componente só desenha;
// recharts precisa de cliente) — uma série, matiz da marca, valores visíveis.

export interface PlayerGoalsStintItem {
  /** Rótulo do eixo: clube + temporada (ex. "Santos 1956–1974"). */
  label: string;
  goals: number;
}

export default function PlayerGoalsByStintChart({
  items,
  barLabel,
  ariaLabel,
}: {
  items: PlayerGoalsStintItem[];
  barLabel: string;
  ariaLabel: string;
}) {
  // Altura cresce com o nº de passagens: barra de ~40px nunca esmaga o rótulo.
  const height = Math.max(220, items.length * 40 + 48);

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className="w-full rounded-xl border border-border bg-muted p-4"
      style={{ height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={items} layout="vertical" margin={{ top: 4, right: 48, bottom: 4, left: 8 }}>
          <CartesianGrid horizontal={false} strokeDasharray="3 3" {...CHART_GRID_PROPS} />
          <XAxis
            type="number"
            allowDecimals={false}
            fontSize={12}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={180}
            fontSize={12}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'var(--color-border)', fillOpacity: 0.25 }}
            formatter={(value) => [value ?? '', barLabel]}
            contentStyle={CHART_TOOLTIP_STYLE}
            labelStyle={CHART_TOOLTIP_LABEL_STYLE}
            itemStyle={CHART_TOOLTIP_ITEM_STYLE}
          />
          {/* Uma série, matiz da marca (nunca azul fora do design system). */}
          <Bar dataKey="goals" fill={CHART_SERIES_A} radius={[0, 4, 4, 0]} maxBarSize={28}>
            {/* Valores visíveis: o número faz parte do conteúdo, não do tooltip. */}
            <LabelList
              dataKey="goals"
              position="right"
              fill="var(--color-foreground)"
              fontSize={12}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
