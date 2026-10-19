/**
 * GRÁFICO DE POSIÇÕES rodada a rodada — tarefa 31, "quem subiu e caiu jogo a jogo".
 *
 * ── SERVIDOR, NÃO CLIENTE ───────────────────────────────────────────────────────────────
 * É um Server Component: SVG gerado no servidor, zero JavaScript no navegador. Três motivos:
 *   1. não há interação a oferecer que justifique hidratar 20 séries;
 *   2. a régua de movimento do projeto (`ui:audit:ci`) não tem o que auditar aqui — não existe
 *      transição, gesto ou animação de layout para reprovar;
 *   3. o gráfico fica legível para quem lê o HTML, para buscadores e para leitor de tela.
 *
 * ── ACESSIBILIDADE: O GRÁFICO SOZINHO NÃO BASTA ─────────────────────────────────────────
 * Cor não pode ser o único portador de significado (WCAG 2.2 AA, 1.4.1), e 20 séries coloridas
 * seriam indistinguíveis de qualquer forma. Por isso:
 *   - o SVG tem `role="img"` e um `aria-label` que RESUME a história em palavras;
 *   - as séries de contexto são apagadas e apenas poucos destaques levam cor;
 *   - abaixo dele há uma `<details>` com a TABELA completa de posição por rodada — a
 *     informação existe em texto para quem não lê o desenho, e é conferível contra os números.
 */
import Link from 'next/link';
import { biggestMovers, buildPositionChart, type ChartGeometry } from '@/lib/position-chart';

export interface PositionChartProps {
  rounds: Array<{
    round: string;
    table: Array<{ clubId: string; position: number; clubName: string | null }>;
  }>;
  /** Rótulo acessível e título visível da seção. */
  title: string;
  /** Rótulo do `<summary>` da tabela alternativa. */
  tableSummaryLabel: string;
  /** Cabeçalho da coluna de clube na tabela alternativa. */
  clubLabel: string;
  /** Frase do destaque na legenda: `(nome, variacao)` -> texto. `variacao` é sempre positiva
   *  aqui (quem subiu 4 e quem caiu 4 passam ambos 4); quem diz a direção é a posição na
   *  tabela final, já ordenada. */
  highlightLabel: (clubName: string, delta: number) => string;
  /** Total de rodadas, para o resumo acessível. */
  totalRounds: number;
}

/** Quantos clubes recebem destaque colorido. Acima disso, nada é distinguível. */
const DESTAQUES = 3;

export function PositionChart({
  rounds,
  title,
  tableSummaryLabel,
  clubLabel,
  highlightLabel,
  totalRounds,
}: PositionChartProps) {
  if (rounds.length < 2) return null;

  const nomes = new Map<string, string>();
  for (const r of rounds) {
    for (const linha of r.table) if (linha.clubName) nomes.set(linha.clubId, linha.clubName);
  }

  const geo: ChartGeometry = buildPositionChart(rounds, nomes);
  const destacados = new Set(biggestMovers(geo.series, DESTAQUES));

  /* Resumo em palavras: quem lidera no fim, quem mais subiu e quem mais caiu. É o que o leitor de
     tela recebe no lugar do desenho — e é literalmente a resposta para "quem subiu e caiu". */
  const lider = geo.series[0];
  const movers = [...geo.series]
    .filter((s) => s.totalChange !== null && s.totalChange !== 0)
    .sort((a, b) => Math.abs(b.totalChange!) - Math.abs(a.totalChange!));
  const subiu = movers.find((s) => s.totalChange! > 0) ?? null;
  const caiu = movers.find((s) => s.totalChange! < 0) ?? null;

  const resumo = [
    `${title}: ${totalRounds} rodadas, ${geo.series.length} clubes.`,
    lider ? `Líder ao final: ${lider.clubName}.` : '',
    subiu ? `Maior alta: ${subiu.clubName}, ${subiu.totalChange} posições.` : '',
    caiu ? `Maior queda: ${caiu.clubName}, ${Math.abs(caiu.totalChange!)} posições.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const cores: Record<number, string> = {
    0: 'stroke-primary',
    1: 'stroke-emerald-600',
    2: 'stroke-amber-600',
  };
  const ordemDestaque = [...destacados];

  return (
    <section aria-labelledby="position-chart-title" data-testid="position-chart">
      <h2 id="position-chart-title" className="text-xl font-heading font-bold mb-1">
        {title}
      </h2>

      <figure className="mt-4">
        <svg
          viewBox={`0 0 ${geo.width} ${geo.height}`}
          className="w-full h-auto"
          role="img"
          aria-label={resumo}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grade horizontal: ajuda a ler a posição sem contar pixels. */}
          {geo.yTicks.map((t) => (
            <g key={`y-${t.label}`}>
              <line
                x1={40}
                x2={geo.width - 168}
                y1={t.y}
                y2={t.y}
                className="stroke-current text-border"
                strokeWidth={1}
              />
              <text
                x={32}
                y={t.y + 4}
                textAnchor="end"
                className="fill-current text-[11px] text-foreground/60"
              >
                {t.label}
              </text>
            </g>
          ))}

          {/* Séries de contexto: todas as linhas apagadas. Elas dão a densidade do campeonato
              — sem elas o gráfico perde a noção de que são 20 clubes disputando. */}
          {geo.series
            .filter((s) => !destacados.has(s.clubId))
            .map((s) => (
              <g key={s.clubId} className="text-border">
                {s.segments.map((seg, i) => (
                  <polyline
                    key={`${s.clubId}-${i}`}
                    points={seg.map((p) => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.25}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ))}
              </g>
            ))}

          {/* Destaques: poucos, com cor e rótulo no fim da linha. */}
          {geo.series
            .filter((s) => destacados.has(s.clubId))
            .map((s) => {
              const idx = ordemDestaque.indexOf(s.clubId);
              /* Último ponto da série: onde o rótulo do clube encosta na linha. Calculado
                 fora do JSX porque dentro dele seria preciso encadear dois `at(-1)` por
                 segmento, e a expressão ficaria ilegível. */
              const fim = s.segments.at(-1)?.at(-1) ?? null;
              return (
                <g key={s.clubId} className={cores[idx] ?? 'stroke-primary'}>
                  {s.segments.map((seg, i) => (
                    <polyline
                      key={`${s.clubId}-${i}`}
                      points={seg.map((p) => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  ))}
                  {fim ? (
                    <g>
                      <circle cx={fim.x} cy={fim.y} r={3.5} fill="currentColor" />
                      <text
                        x={fim.x + 10}
                        y={fim.y + 4}
                        className="fill-current text-[11px] font-semibold"
                      >
                        {s.clubName}
                      </text>
                    </g>
                  ) : null}
                </g>
              );
            })}

          {/* Eixo X */}
          {geo.xTicks.map((t) => (
            <text
              key={`x-${t.label}`}
              x={t.x}
              y={geo.height - 10}
              textAnchor="middle"
              className="fill-current text-[11px] text-foreground/60"
            >
              {t.label}
            </text>
          ))}
        </svg>

        <figcaption className="mt-3 flex flex-wrap gap-4 text-xs text-foreground/70">
          {movers
            .filter((s) => destacados.has(s.clubId))
            .map((s) => (
              <span key={s.clubId} className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className={`inline-block h-0.5 w-5 ${
                    ordemDestaque.indexOf(s.clubId) === 0
                      ? 'bg-primary'
                      : ordemDestaque.indexOf(s.clubId) === 1
                        ? 'bg-emerald-600'
                        : 'bg-amber-600'
                  }`}
                />
                {highlightLabel(s.clubName, Math.abs(s.totalChange!))}
              </span>
            ))}
        </figcaption>
      </figure>

      {/*
        TABELA ALTERNATIVA — a informação em texto. Não é "extra": é o que cumpre 1.4.1 e o que
        permite CONFERIR o desenho contra o número, que é exatamente o que um gráfico impede.
      */}
      <details className="mt-6 rounded-xl border border-border">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
          {tableSummaryLabel}
        </summary>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-foreground/5 text-left">
                <th scope="col" className="px-3 py-2 font-semibold">
                  {clubLabel}
                </th>
                {rounds.map((r) => (
                  <th key={r.round} scope="col" className="px-2 py-2 text-center font-semibold">
                    {r.round}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {geo.series.map((s) => (
                <tr key={s.clubId} className="border-t border-border">
                  <th scope="row" className="whitespace-nowrap px-3 py-1.5 text-left font-medium">
                    <Link href={`/clubs/${s.clubId}`} className="hover:underline">
                      {s.clubName}
                    </Link>
                  </th>
                  {rounds.map((r) => {
                    const linha = r.table.find((t) => t.clubId === s.clubId);
                    return (
                      <td
                        key={`${s.clubId}-${r.round}`}
                        className="px-2 py-1.5 text-center tabular-nums text-foreground/70"
                      >
                        {linha ? linha.position : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
