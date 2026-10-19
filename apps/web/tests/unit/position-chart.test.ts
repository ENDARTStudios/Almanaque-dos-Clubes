/**
 * Geometria do gráfico de posições (`lib/position-chart.ts`) — tarefa 31.
 *
 * ── POR QUE ESTE TESTE EXISTE ────────────────────────────────────────────────────────────
 * Um gráfico de 20 séries erra em silêncio: a linha deslocada parece normal e ninguém confere
 * contra o número. Os erros que passam despercebidos, e que aqui estão travados:
 *
 *   1. **Eixo Y não invertido** — o gráfico contaria a história ao contrário: quem subiu
 *      apareceria descendo. Metade dos gráficos de classificação erra isso na primeira versão.
 *   2. **Lacuna virando queda** — clube que não estava na rodada (rebaixado/promovido no meio)
 *      desenhado como se estivesse em último. Inventa uma queda que não houve em campo.
 *   3. **Escala pelo último quadro** — se a maior posição só aparece no meio da temporada, usar o
 *      último quadro como escala faria a linha sair do desenho.
 *   4. **Ordem instável** — sem desempate, a legenda troca de ordem entre requisições e o leitor
 *      acha que o gráfico mudou.
 */
import { describe, it, expect } from 'vitest';
import {
  biggestMovers,
  buildPositionChart,
  type ChartSeries,
} from '../../src/lib/position-chart.js';

const nomes = new Map([
  ['a', 'Alfa'],
  ['b', 'Beta'],
  ['c', 'Gama'],
]);

/** Tabela: clube -> posição naquela rodada. */
const rodada = (round: string, posicoes: Record<string, number>) => ({
  round,
  table: Object.entries(posicoes).map(([clubId, position]) => ({ clubId, position })),
});

describe('buildPositionChart — eixos', () => {
  const rounds = [rodada('1', { a: 1, b: 2 }), rodada('2', { a: 2, b: 1 })];

  it('inverte o eixo Y: posição 1 fica ACIMA da posição 2', () => {
    /* O erro que conta a história ao contrário. Quem sobe tem de subir na TELA. */
    const g = buildPositionChart(rounds, nomes, { width: 100, height: 100 });
    const alfa = g.series.find((s) => s.clubId === 'a')!;
    const y1 = alfa.segments[0].find((p) => p.round === '1')!.y;
    const y2 = alfa.segments[0].find((p) => p.round === '2')!.y;
    expect(y2).toBeGreaterThan(y1); // caiu de 1º para 2º -> desceu na tela
    expect(g.yTicks.map((t) => t.label)).toContain('1º');
  });

  it('a posição 1 fica no topo da área de desenho', () => {
    const g = buildPositionChart(rounds, nomes, {
      width: 100,
      height: 100,
      padding: { top: 10, bottom: 10, left: 10, right: 10 },
    });
    const um = g.yTicks.find((t) => t.label === '1º')!;
    expect(um.y).toBe(10); // exatamente o padding do topo
  });

  it('marca os dois extremos no eixo Y', () => {
    const quatro = [rodada('1', { a: 1, b: 2, c: 3 }), rodada('2', { a: 1, b: 2, c: 4 })];
    const g = buildPositionChart(quatro, nomes);
    const labels = g.yTicks.map((t) => t.label);
    expect(labels).toContain('1º');
    expect(labels).toContain('4º');
    expect(g.maxPosition).toBe(4);
  });

  it('limita os rótulos do eixo X e mantém primeiro e último', () => {
    const muitas = Array.from({ length: 38 }, (_, i) =>
      rodada(String(i + 1), { a: 1 + (i % 3), b: 2 }),
    );
    const g = buildPositionChart(muitas, nomes, { maxXTicks: 10 });
    expect(g.xTicks.length).toBeLessThanOrEqual(11);
    expect(g.xTicks[0].label).toBe('1');
    expect(g.xTicks.at(-1)!.label).toBe('38');
  });
});

describe('buildPositionChart — lacunas (o caso difícil)', () => {
  it('clube ausente numa rodada tem a linha INTERROMPIDA, não uma queda', () => {
    /* B estava nas rodadas 1 e 3, não na 2. Se a função ligasse os pontos, desenharia uma linha
       contínua atravessando uma rodada em que o clube não existia em campo. */
    const rounds = [
      rodada('1', { a: 1, b: 2 }),
      rodada('2', { a: 1 }),
      rodada('3', { a: 1, b: 2 }),
    ];
    const g = buildPositionChart(rounds, nomes);
    const beta = g.series.find((s) => s.clubId === 'b')!;
    expect(beta.segments).toHaveLength(2); // dois trechos, não um
    expect(beta.segments[0]).toHaveLength(1);
    expect(beta.segments[1]).toHaveLength(1);
  });

  it('clube que nunca aparece não vira série vazia', () => {
    const g = buildPositionChart([rodada('1', { a: 1 })], nomes);
    expect(g.series.map((s) => s.clubId)).toEqual(['a']);
  });

  it('marca quem começou na primeira rodada (promovido no meio é diferente)', () => {
    const rounds = [rodada('1', { a: 1 }), rodada('2', { a: 1, b: 2 })];
    const g = buildPositionChart(rounds, nomes);
    expect(g.series.find((s) => s.clubId === 'a')!.startedAtFirstRound).toBe(true);
    expect(g.series.find((s) => s.clubId === 'b')!.startedAtFirstRound).toBe(false);
  });

  it('totalChange mede a variação entre a primeira e a última aparição', () => {
    // Alfa: 3º -> 1º sobe 2 (positivo = subiu).
    const rounds = [rodada('1', { a: 3, b: 1, c: 2 }), rodada('2', { a: 1, b: 3, c: 2 })];
    const g = buildPositionChart(rounds, nomes);
    expect(g.series.find((s) => s.clubId === 'a')!.totalChange).toBe(2);
    expect(g.series.find((s) => s.clubId === 'b')!.totalChange).toBe(-2);
    expect(g.series.find((s) => s.clubId === 'c')!.totalChange).toBe(0);
  });
});

describe('buildPositionChart — casos de borda', () => {
  it('lista vazia devolve geometria vazia, não NaN', () => {
    const g = buildPositionChart([], nomes);
    expect(g.series).toEqual([]);
    expect(g.maxPosition).toBe(0);
    expect(g.xTicks).toEqual([]);
  });

  it('UMA rodada não divide por zero', () => {
    /* Com uma rodada, `i / (n - 1)` seria divisão por zero e todos os x virariam NaN. */
    const g = buildPositionChart([rodada('1', { a: 1, b: 2 })], nomes, {
      width: 200,
      height: 100,
      padding: { top: 0, bottom: 0, left: 0, right: 0 },
    });
    for (const s of g.series) {
      for (const seg of s.segments) {
        for (const p of seg) {
          expect(Number.isFinite(p.x)).toBe(true);
          expect(Number.isFinite(p.y)).toBe(true);
        }
      }
    }
  });

  it('a escala usa a MAIOR posição de qualquer rodada, não a do último quadro', () => {
    // Na rodada 2 a posição vai até 5; na 3, só até 2. A escala tem de comportar 5.
    const rounds = [
      rodada('1', { a: 1, b: 5 }),
      rodada('2', { a: 1, b: 5 }),
      rodada('3', { a: 1, b: 2 }),
    ];
    const g = buildPositionChart(rounds, nomes);
    expect(g.maxPosition).toBe(5);
  });

  it('usa o id como rótulo quando o nome não é conhecido', () => {
    const g = buildPositionChart([rodada('1', { zzz: 1 })], nomes);
    expect(g.series[0].clubName).toBe('zzz');
  });
});

describe('ordem das séries', () => {
  it('ordena pela posição final e desempata por nome', () => {
    const rounds = [rodada('1', { c: 1, a: 2, b: 2 }), rodada('2', { c: 1, a: 2, b: 2 })];
    const g = buildPositionChart(rounds, nomes);
    // c é 1º; a e b empatam em 2º -> desempate por nome (Alfa antes de Beta)
    expect(g.series.map((s) => s.clubName)).toEqual(['Gama', 'Alfa', 'Beta']);
  });

  it('é estável: duas chamadas com o mesmo dado devolvem a mesma ordem', () => {
    const rounds = [rodada('1', { a: 1, b: 2, c: 3 })];
    const a = buildPositionChart(rounds, nomes).series.map((s) => s.clubId);
    const b = buildPositionChart(rounds, nomes).series.map((s) => s.clubId);
    expect(a).toEqual(b);
  });
});

describe('biggestMovers', () => {
  const serie = (clubId: string, totalChange: number | null): ChartSeries => ({
    clubId,
    clubName: clubId,
    segments: [],
    endLabel: null,
    startedAtFirstRound: true,
    totalChange,
  });

  it('pega quem mais se moveu, em qualquer direção', () => {
    const movers = biggestMovers([serie('a', 1), serie('b', -5), serie('c', 3)], 2);
    expect(movers).toEqual(['b', 'c']);
  });

  it('ignora quem não tem variação calculável', () => {
    expect(biggestMovers([serie('a', null), serie('b', 2)], 3)).toEqual(['b']);
  });

  it('respeita o limite pedido', () => {
    expect(biggestMovers([serie('a', 4), serie('b', 3), serie('c', 2)], 1)).toEqual(['a']);
  });
});
