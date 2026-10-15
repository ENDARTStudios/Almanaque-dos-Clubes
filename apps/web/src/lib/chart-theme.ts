import type { CSSProperties } from 'react';

/**
 * Tema dos gráficos (Recharts) — um só lugar, para os três gráficos do /compare não divergirem.
 *
 * Por que existe: o Recharts NÃO lê o nosso tema para as caixas que ele mesmo desenha. Os
 * rótulos dos eixos herdam `currentColor` (então já acompanham `--color-foreground`), mas
 * `Tooltip` e `Legend` trazem estilo inline próprio — fundo branco e texto escuro — e sobre a
 * superfície escura isso vira um retângulo branco no meio do gráfico. As linhas de grade tinham
 * `#00000018` fixo, que simplesmente desaparecia no fundo escuro.
 *
 * As cores usam as variáveis CSS do tema (e não hex fixo), então o mesmo componente acompanha
 * o tema vigente sem alteração: hoje o CLARO é o padrão e o escuro é a exceção `.theme-dark`.
 * O motivo de existir continua o mesmo, só espelhado: o Recharts desenha `Tooltip` e `Legend`
 * com fundo BRANCO e texto escuro inline, que sobre uma superfície escura vira um retângulo
 * branco no meio do gráfico.
 */
export const CHART_TOOLTIP_STYLE: CSSProperties = {
  backgroundColor: 'var(--color-background)',
  border: '1px solid var(--color-border)',
  borderRadius: '0.5rem',
  color: 'var(--color-foreground)',
  fontSize: '0.8125rem',
  padding: '0.5rem 0.75rem',
};

export const CHART_TOOLTIP_LABEL_STYLE: CSSProperties = {
  color: 'var(--color-foreground)',
  fontWeight: 600,
  marginBottom: '0.25rem',
};

export const CHART_TOOLTIP_ITEM_STYLE: CSSProperties = {
  color: 'var(--color-foreground)',
};

export const CHART_LEGEND_STYLE: CSSProperties = {
  color: 'var(--color-foreground)',
  fontSize: '0.8125rem',
};

/** Grade/linhas: `currentColor` com opacidade herda o token do tema (claro e escuro). */
export const CHART_GRID_PROPS = {
  stroke: 'currentColor',
  strokeOpacity: 0.18,
} as const;

/** Séries: dois matizes da marca, nunca azul fora do design system. */
export const CHART_SERIES_A = 'var(--color-primary)';
export const CHART_SERIES_B = 'var(--color-secondary)';
