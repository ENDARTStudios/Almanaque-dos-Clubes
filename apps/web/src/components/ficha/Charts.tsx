/**
 * FICHA — gráficos animados.
 *
 * ── A ANIMAÇÃO É DE CSS, E SÓ EXISTE QUANDO O MOVIMENTO É PERMITIDO ─────────────────────────
 * Os keyframes vivem em `globals.css` dentro de `@media (prefers-reduced-motion: no-preference)`.
 * Isso significa duas coisas que importam:
 *
 *   1. quem pede menos movimento recebe o desenho FINAL, inteiro, sem animação — o gráfico existe
 *      parado. Não é um fade que esconde o dado: é o dado, sem movimento.
 *   2. o componente não escreve animação inline, então nenhum estado do React precisa saber de
 *      `matchMedia`. A regra fica num lugar só, o CSS.
 *
 * ── CADA ANIMAÇÃO REPETE O SIGNIFICADO DO GRÁFICO ───────────────────────────────────────────
 *   barras ... crescem da base, 60ms entre uma e outra: a ordem de aparecimento é a ordem de
 *              leitura da série.
 *   linha .... desenha com `stroke-dashoffset`: a linha sendo desenhada É a série temporal.
 *   rosca .... o arco varre a partir das 12h: a proporção é construída, não revelada de surpresa.
 *
 * Todas rodam UMA vez. Dado não fica pulsando — pulsação é enfeite e compete com a leitura.
 *
 * ── ACESSIBILIDADE ──────────────────────────────────────────────────────────────────────────
 * O gráfico é `role="img"` com `<title>` e `<desc>`. Sem isso ele é um retângulo colorido que o
 * leitor de tela ignora — e o número que ele mostra fica inacessível. O SVG é decorativo para
 * navegação por teclado (`focusable="false"`), porque não é interativo.
 */

const VIZ = [
  'var(--color-viz-1)',
  'var(--color-viz-2)',
  'var(--color-viz-3)',
  'var(--color-viz-4)',
  'var(--color-viz-5)',
  'var(--color-viz-6)',
];

export interface SeriesPoint {
  label: string;
  value: number;
}

export interface BarsProps {
  data: SeriesPoint[];
  /** Nome acessível do gráfico, já traduzido. Ex.: "Gols por década". */
  title: string;
  /** Resumo da série para leitor de tela. Ex.: "1960 é o maior, com 522." */
  summary: string;
  height?: number;
  /** `horizontal` para rótulos longos (países), vertical para curtos (décadas). */
  horizontal?: boolean;
}

export function Bars({ data, title, summary, height = 160, horizontal = false }: BarsProps) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value));

  if (horizontal) {
    const passo = height / data.length;
    return (
      <svg
        viewBox={`0 0 100 ${height}`}
        width="100%"
        height={height}
        role="img"
        focusable="false"
        preserveAspectRatio="none"
      >
        <title>{title}</title>
        <desc>{summary}</desc>
        {data.map((d, i) => {
          const largura = (d.value / max) * 72;
          const destaque = d.value === max;
          return (
            <g key={d.label}>
              <rect
                x={0}
                y={i * passo + passo * 0.18}
                width={largura}
                height={passo * 0.56}
                fill={destaque ? 'var(--color-metal-ouro)' : VIZ[0]}
                className="ficha-bar-h"
                style={{ animationDelay: `${i * 60}ms` }}
              />
              <text
                x={largura + 1.5}
                y={i * passo + passo * 0.18 + passo * 0.42}
                fontSize={2.4}
                fill="var(--color-ink-2)"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  const passo = 100 / data.length;
  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      width="100%"
      height={height}
      role="img"
      focusable="false"
      preserveAspectRatio="none"
    >
      <title>{title}</title>
      <desc>{summary}</desc>
      {data.map((d, i) => {
        const h = (d.value / max) * (height - 26);
        const destaque = d.value === max;
        return (
          <g key={`${d.label}-${i}`}>
            <rect
              x={i * passo + passo * 0.18}
              y={height - 20 - h}
              width={passo * 0.64}
              height={h}
              fill={destaque ? 'var(--color-metal-ouro)' : VIZ[0]}
              className="ficha-bar"
              style={{ animationDelay: `${i * 60}ms`, transformOrigin: `center ${height - 20}px` }}
            />
            <text
              x={i * passo + passo * 0.5}
              y={height - 6}
              fontSize={2.6}
              textAnchor="middle"
              fill="var(--color-ink-3)"
            >
              {d.label}
            </text>
          </g>
        );
      })}
      <line
        x1={0}
        y1={height - 20}
        x2={100}
        y2={height - 20}
        stroke="var(--color-border)"
        strokeWidth={0.2}
      />
    </svg>
  );
}

export interface LineProps {
  data: SeriesPoint[];
  title: string;
  summary: string;
  height?: number;
}

export function Line({ data, title, summary, height = 140 }: LineProps) {
  if (data.length < 2) return null;
  const valores = data.map((d) => d.value);
  const max = Math.max(...valores);
  const min = Math.min(...valores);
  const faixa = max - min || 1;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = height - 16 - ((d.value - min) / faixa) * (height - 32);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      width="100%"
      height={height}
      role="img"
      focusable="false"
      preserveAspectRatio="none"
    >
      <title>{title}</title>
      <desc>{summary}</desc>
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={VIZ[0]}
        strokeWidth={0.8}
        strokeLinecap="round"
        className="ficha-line"
        pathLength={1}
      />
      {data.map((d, i) => {
        const [x, y] = pts[i].split(',');
        return (
          <circle
            key={`${d.label}-${i}`}
            cx={Number(x)}
            cy={Number(y)}
            r={0.9}
            fill="var(--color-background)"
            stroke={VIZ[0]}
            strokeWidth={0.5}
            className="ficha-dot"
            style={{ animationDelay: `${180 + i * 45}ms` }}
          />
        );
      })}
    </svg>
  );
}

export interface DonutSlice {
  label: string;
  value: number;
  /** Índice na paleta de dado; se omitido, segue a ordem da série. */
  colorIndex?: number;
}

export interface DonutProps {
  data: DonutSlice[];
  title: string;
  summary: string;
  size?: number;
  thickness?: number;
}

export function Donut({ data, title, summary, size = 120, thickness = 16 }: DonutProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  // offsets pré-computados: mutar um acumulador dentro do `.map()` é o que o React Compiler
  // barra ("cannot reassign variable after render completes"), e com razão — o valor vaza
  // entre renders. Aqui cada fatia já sai com o seu início.
  const fatias = data.reduce<{ d: DonutSlice; fracao: number; inicio: number; i: number }[]>(
    (acc, d, i) => {
      const anterior = acc[i - 1];
      const inicio = anterior ? anterior.inicio + anterior.fracao : 0;
      acc.push({ d, fracao: d.value / total, inicio, i });
      return acc;
    },
    [],
  );

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" focusable="false">
      <title>{title}</title>
      <desc>{summary}</desc>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {fatias.map(({ d, fracao, inicio, i }) => (
          <circle
            key={d.label}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={VIZ[(d.colorIndex ?? i) % VIZ.length]}
            strokeWidth={thickness}
            strokeDasharray={`${c * fracao} ${c}`}
            strokeDashoffset={-c * inicio}
            className="ficha-arc"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </g>
    </svg>
  );
}
