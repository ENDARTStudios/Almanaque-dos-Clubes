/**
 * Geometria do GRÁFICO DE POSIÇÕES rodada a rodada (tarefa 31).
 *
 * ── O QUE ESTE GRÁFICO DIZ, E O QUE ELE NÃO PODE DIZER ───────────────────────────────────
 * Diz: em cada rodada, em que posição cada clube estava, e portanto quem subiu e quem caiu. É a
 * leitura que a tabela acumulada esconde — a tabela mostra o retrato de agora; o gráfico mostra
 * a trajetória.
 *
 * NÃO diz: quem vai cair, nem "tendência". Uma série de 38 pontos não projeta nada, e desenhar
 * uma linha de tendência aqui seria inventar leitura que o dado não sustenta.
 *
 * ── POR QUE A GEOMETRIA É UM MÓDULO PURO ────────────────────────────────────────────────
 * Um gráfico com 20 séries erra em silêncio: uma linha deslocada um pixel parece normal, e
 * ninguém confere. Separando a conta do desenho, dá para testar o que importa — escala, lacunas
 * e ordem — sem renderizar nada.
 *
 * ── A LACUNA É O CASO DIFÍCIL ───────────────────────────────────────────────────────────
 * Clube rebaixado não existe na temporada seguinte; clube promovido passa a existir no meio. Se a
 * série tratar "não estava" como "posição 0" ou como "último lugar", o gráfico inventa uma queda
 * que não aconteceu em campo. Aqui a ausência é `null` e a linha simplesmente NÃO é desenhada
 * naquele trecho — o segmento começa onde o clube começa.
 */

/** Uma rodada do gráfico: rótulo + posição de cada clube (null = não estava na tabela). */
export interface RoundSnapshot {
  round: string;
  positions: Map<string, number | null>;
}

export interface ChartSeries {
  clubId: string;
  clubName: string;
  /** Pontos [x, y] em coordenadas do viewBox. Segmentos separados quando há lacuna. */
  segments: Array<Array<{ x: number; y: number; round: string; position: number }>>;
  /** Rótulo no fim da linha (posição final), com y já calculado. */
  endLabel: { x: number; y: number; text: string } | null;
  /** Se o clube estava na primeira rodada desenhada. */
  startedAtFirstRound: boolean;
  /** Variação total da posição entre a primeira e a última rodada em que apareceu. */
  totalChange: number | null;
}

export interface ChartGeometry {
  series: ChartSeries[];
  width: number;
  height: number;
  /** Posições nas laterais (1, e alguns marcos). */
  yTicks: Array<{ y: number; label: string }>;
  /** Rótulos de rodada no eixo X, já filtrados para não amontoar. */
  xTicks: Array<{ x: number; label: string }>;
  /** Quantos clubes aparecem em alguma rodada — define a escala vertical. */
  maxPosition: number;
}

export interface ChartOptions {
  width?: number;
  height?: number;
  padding?: { top: number; right: number; bottom: number; left: number };
  /** Máximo de rótulos de rodada no eixo X. Acima disso, pula de N em N. */
  maxXTicks?: number;
}

const PADRAO: Required<ChartOptions> = {
  width: 900,
  height: 440,
  padding: { top: 16, right: 168, bottom: 32, left: 40 },
  maxXTicks: 10,
};

/**
 * Constrói a geometria.
 *
 * @param rounds rodadas em ordem cronológica (a função NÃO reordena: se a ordem chega errada, o
 *               gráfico mostraria a história fora de sequência, e isso deve ser erro de quem
 *               chamou, não algo que a função conserta em silêncio).
 * @param names  id do clube -> nome legível.
 */
export function buildPositionChart(
  rounds: Array<{ round: string; table: Array<{ clubId: string; position: number }> }>,
  names: Map<string, string>,
  options: ChartOptions = {},
): ChartGeometry {
  const opts = {
    ...PADRAO,
    ...options,
    padding: { ...PADRAO.padding, ...(options.padding ?? {}) },
  };
  const { width, height, padding } = opts;

  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  if (rounds.length === 0) {
    return { series: [], width, height, yTicks: [], xTicks: [], maxPosition: 0 };
  }

  // Maior posição vista em QUALQUER rodada define a escala — não o tamanho do último quadro.
  let maxPosition = 1;
  for (const r of rounds) {
    for (const row of r.table) if (row.position > maxPosition) maxPosition = row.position;
  }

  /* X: uma coluna por rodada. Com UMA rodada, a divisão por (n-1) seria divisão por zero — o
     ponto fica no meio. */
  const xDe = (i: number): number =>
    rounds.length === 1
      ? padding.left + plotW / 2
      : padding.left + (i / (rounds.length - 1)) * plotW;

  /* Y: posição 1 no TOPO. Inverter o eixo é o que faz "subiu" ser para cima na tela; sem isso o
     gráfico contaria a história ao contrário. */
  const yDe = (posicao: number): number =>
    padding.top + (maxPosition === 1 ? plotH / 2 : ((posicao - 1) / (maxPosition - 1)) * plotH);

  // Coleta todos os clubes que aparecem em alguma rodada.
  const clubes = new Set<string>();
  for (const r of rounds) for (const row of r.table) clubes.add(row.clubId);

  const series: ChartSeries[] = [];
  for (const clubId of clubes) {
    const segmentos: ChartSeries['segments'] = [];
    let atual: ChartSeries['segments'][number] = [];
    let primeiraPosicao: number | null = null;
    let ultimaPosicao: number | null = null;
    let ultimoX = 0;
    let ultimoY = 0;
    let ultimoRound = '';

    rounds.forEach((r, i) => {
      const linha = r.table.find((t) => t.clubId === clubId);
      if (!linha) {
        /* Lacuna: fecha o segmento. O clube não estava nesta rodada — desenhar uma linha
           contínua aqui ligaria duas rodadas que não se conectam em campo. */
        if (atual.length > 0) {
          segmentos.push(atual);
          atual = [];
        }
        return;
      }
      const x = xDe(i);
      const y = yDe(linha.position);
      atual.push({ x, y, round: r.round, position: linha.position });
      if (primeiraPosicao === null) primeiraPosicao = linha.position;
      ultimaPosicao = linha.position;
      ultimoX = x;
      ultimoY = y;
      ultimoRound = r.round;
    });
    if (atual.length > 0) segmentos.push(atual);

    const primeiraRodada = rounds[0];
    const comecaNoInicio = primeiraRodada.table.some((t) => t.clubId === clubId);

    series.push({
      clubId,
      clubName: names.get(clubId) ?? clubId,
      segments: segmentos,
      endLabel:
        ultimaPosicao !== null
          ? {
              x: ultimoX,
              y: ultimoY,
              text: `${names.get(clubId) ?? clubId} · ${ultimaPosicao}º ${
                ultimaPosicao === 1 ? 'na ' : 'na '
              }rodada ${ultimoRound}`,
            }
          : null,
      startedAtFirstRound: comecaNoInicio,
      totalChange:
        primeiraPosicao !== null && ultimaPosicao !== null ? primeiraPosicao - ultimaPosicao : null,
    });
  }

  /* Ordem estável: por posição final e depois por nome. Sem esse desempate a legenda trocaria de
     ordem entre duas requisições, e o leitor acharia que o gráfico mudou. */
  series.sort((a, b) => {
    const pa = a.segments.at(-1)?.at(-1)?.position ?? Number.MAX_SAFE_INTEGER;
    const pb = b.segments.at(-1)?.at(-1)?.position ?? Number.MAX_SAFE_INTEGER;
    if (pa !== pb) return pa - pb;
    return a.clubName.localeCompare(b.clubName);
  });

  // Eixo Y: 1º e último sempre; marcos intermediários quando há espaço.
  const yTicks: ChartGeometry['yTicks'] = [];
  const marcos = new Set<number>([1, maxPosition]);
  if (maxPosition > 6) {
    for (const p of [5, 10, 15, 20]) if (p < maxPosition && p > 1) marcos.add(p);
  }
  for (const p of [...marcos].sort((a, b) => a - b)) {
    yTicks.push({ y: yDe(p), label: `${p}º` });
  }

  // Eixo X: no máximo `maxXTicks` rótulos, sempre incluindo o primeiro e o último.
  const passo = Math.max(1, Math.ceil(rounds.length / opts.maxXTicks));
  const xTicks: ChartGeometry['xTicks'] = [];
  rounds.forEach((r, i) => {
    if (i === 0 || i === rounds.length - 1 || i % passo === 0) {
      xTicks.push({ x: xDe(i), label: r.round });
    }
  });

  return { series, width, height, yTicks, xTicks, maxPosition };
}

/**
 * Os N clubes que mais se moveram (para cima ou para baixo) ao longo da temporada.
 *
 * Existe porque desenhar 20 séries com a mesma cor não informa nada, e 20 cores diferentes não
 * são distinguíveis — nem por quem enxerga todas. Destacar poucos é o que torna o gráfico
 * legível; o resto fica como contexto apagado.
 */
export function biggestMovers(series: ChartSeries[], n = 3): string[] {
  return [...series]
    .filter((s) => s.totalChange !== null)
    .sort((a, b) => Math.abs(b.totalChange!) - Math.abs(a.totalChange!))
    .slice(0, n)
    .map((s) => s.clubId);
}
