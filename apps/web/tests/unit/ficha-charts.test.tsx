// @vitest-environment jsdom
/**
 * Charts — o gráfico é imagem: sem título e descrição ele não existe para o leitor de tela.
 *
 * ── O QUE ESTE TESTE PROTEGE ────────────────────────────────────────────────────────────────
 * Três coisas que um gráfico perde em silêncio:
 *
 *   1. ACESSIBILIDADE. `<svg>` sem `role="img"` + `<title>`/`<desc>` é um retângulo colorido. O
 *      número que ele mostra fica inacessível — e num acervo de dados isso é perder o dado.
 *   2. O DESTAQUE. A barra em destaque é a de MAIOR valor, em ouro. Já foi a última barra por
 *      acidente de laço, o que apontava para o dado errado: em "gols por década" o ouro caía na
 *      década de 1980 (128) em vez de 1960 (522).
 *   3. A PROPORÇÃO DA ROSCA. As fatias vêm de `stroke-dasharray` calculado com um acumulador que
 *      acabou de virar `reduce` — se o cálculo regredir, as fatias deixam de somar o total e o
 *      anel passa a mentir sem quebrar nada.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import { Bars, Line, Donut } from '@/components/ficha/Charts';

afterEach(cleanup);

describe('Bars', () => {
  const dados = [
    { label: '1950', value: 243 },
    { label: '1960', value: 522 },
    { label: '1970', value: 386 },
  ];

  it('é anunciado como imagem, com título e resumo', () => {
    render(<Bars data={dados} title="Gols por década" summary="1960 é o maior, com 522." />);

    const svg = screen.getByRole('img');
    expect(svg.querySelector('title')?.textContent).toBe('Gols por década');
    expect(svg.querySelector('desc')?.textContent).toBe('1960 é o maior, com 522.');
  });

  it('desenha uma barra por ponto', () => {
    const { container } = render(<Bars data={dados} title="t" summary="s" />);
    expect(container.querySelectorAll('rect')).toHaveLength(dados.length);
  });

  it('o destaque é a barra de MAIOR valor, em ouro — não a última', () => {
    const { container } = render(<Bars data={dados} title="t" summary="s" />);
    const barras = Array.from(container.querySelectorAll('rect'));

    const ouro = 'var(--color-metal-ouro)';
    // 522 está na posição 1, não na última
    expect(barras[1].getAttribute('fill')).toBe(ouro);
    expect(barras[0].getAttribute('fill')).not.toBe(ouro);
    expect(barras[2].getAttribute('fill')).not.toBe(ouro);
  });

  it('sem dados não renderiza nada', () => {
    const { container } = render(<Bars data={[]} title="t" summary="s" />);
    expect(container.querySelector('svg')).toBeNull();
  });
});

describe('Line', () => {
  const serie = [
    { label: 'a', value: 10 },
    { label: 'b', value: 30 },
    { label: 'c', value: 20 },
  ];

  it('desenha uma polilinha com um ponto por valor', () => {
    const { container } = render(<Line data={serie} title="t" summary="s" />);
    expect(container.querySelector('polyline')).toBeTruthy();
    expect(container.querySelectorAll('circle')).toHaveLength(serie.length);
  });

  it('com menos de 2 pontos não renderiza — uma linha precisa de dois pontos', () => {
    const { container } = render(<Line data={[{ label: 'a', value: 1 }]} title="t" summary="s" />);
    expect(container.querySelector('svg')).toBeNull();
  });
});

describe('Donut', () => {
  const fatias = [
    { label: 'Mundial', value: 4 },
    { label: 'Continental', value: 22 },
    { label: 'Nacional', value: 58 },
    { label: 'Estadual', value: 16 },
  ];

  it('é anunciado como imagem, com título e resumo', () => {
    render(<Donut data={fatias} title="Distribuição" summary="Nacional é 58%." />);
    const svg = screen.getByRole('img');
    expect(svg.querySelector('title')?.textContent).toBe('Distribuição');
    expect(svg.querySelector('desc')?.textContent).toBe('Nacional é 58%.');
  });

  it('uma fatia por item', () => {
    render(<Donut data={fatias} title="t" summary="s" />);
    expect(screen.getByRole('img').querySelectorAll('circle')).toHaveLength(fatias.length);
  });

  it('as fatias somam o total: a proporção é calculada, não aproximada', () => {
    render(<Donut data={fatias} title="t" summary="s" />);
    const circulos = Array.from(screen.getByRole('img').querySelectorAll('circle'));

    const total = fatias.reduce((s, d) => s + d.value, 0); // 100
    const somaDasFatias = circulos.reduce((soma, c) => {
      // strokeDasharray = "<comprimento> <circunferencia>"
      const [primeiro] = (c.getAttribute('stroke-dasharray') ?? '').split(' ');
      return soma + Number(primeiro);
    }, 0);

    // a circunferência total está no segundo valor de qualquer fatia
    const circunferencia = Number(
      (circulos[0].getAttribute('stroke-dasharray') ?? '').split(' ')[1],
    );

    // a soma dos comprimentos tem de fechar a circunferência (tolerância de arredondamento)
    expect(somaDasFatias).toBeCloseTo(circunferencia, 4);
    expect(total).toBe(100);
  });

  it('sem valor total não renderiza — divisão por zero não vira gráfico', () => {
    const { container } = render(<Donut data={[{ label: 'x', value: 0 }]} title="t" summary="s" />);
    expect(container.querySelector('svg')).toBeNull();
  });
});
