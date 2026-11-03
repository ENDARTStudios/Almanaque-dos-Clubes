// @vitest-environment jsdom
/**
 * Globe — a ilustração de abertura.
 *
 * ── POR QUE ESTE TESTE EXISTE, E O QUE ELE APRENDEU COM UM SCREENSHOT ──────────────────────
 * O desenho original do conceito (`globo-animado.svg`) foi renderizado em Chromium e OLHADO. Ele
 * tinha três defeitos que nenhum teste de unidade teria pego sozinho, mas que se traduzem em
 * invariantes geométricas:
 *
 *   1. MERIDIANOS E PARALELOS VAZAVAM DA ESFERA → teste: todo ponto desenhado está a ≤ R do
 *      centro, e existe um `clipPath` circular aplicado ao grupo de linhas.
 *   2. OS PENTÁGONOS LATERAIS SAÍAM DA SILHUETA → teste: nenhum vértice de gomo fica fora do
 *      círculo.
 *   3. (visual) os gomos eram chapados → coberto por construção: os vértices vêm de (lat, lon)
 *      projetados, não de pixels.
 *
 * O teste não substitui olhar. Ele impede que os defeitos VOLTEM, o que é outra tarefa.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

import Globe from '@/components/ficha/Globe';

afterEach(cleanup);

/** Centro e raio usados pelo componente (viewBox 220). */
const CX = 110;
const CY = 110;
const R = 100;
const FOLGA = 0.5; // arredondamento de uma casa decimal no `points`

function foraDaEsfera(x: number, y: number): boolean {
  return Math.hypot(x - CX, y - CY) > R + FOLGA;
}

describe('Globe', () => {
  it('é decorativo: aria-hidden, fora da tabulação e sem role', () => {
    const { container } = render(<Globe />);
    const svg = container.querySelector('svg')!;

    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('focusable')).toBe('false');
    expect(svg.getAttribute('role')).toBeNull();
  });

  it('tem clip circular — é o que impede as linhas de vazarem da esfera', () => {
    const { container } = render(<Globe />);
    const clip = container.querySelector('clipPath');

    expect(clip).not.toBeNull();
    expect(clip!.getAttribute('id')).toBeTruthy();

    const circulo = clip!.querySelector('circle')!;
    expect(Number(circulo.getAttribute('r'))).toBe(R);

    // e o grupo de linhas realmente usa esse clip
    const grupo = container.querySelector('g');
    expect(grupo!.getAttribute('clip-path')).toBe(`url(#${clip!.getAttribute('id')})`);
  });

  it('nenhum vértice de gomo sai da silhueta', () => {
    const { container } = render(<Globe />);
    const gomos = container.querySelectorAll('polygon');

    expect(gomos.length).toBeGreaterThanOrEqual(4);

    for (const g of gomos) {
      const pontos = g.getAttribute('points')!.trim().split(/\s+/);
      expect(pontos.length).toBe(5);
      for (const p of pontos) {
        const [x, y] = p.split(',').map(Number);
        expect(foraDaEsfera(x, y)).toBe(false);
      }
    }
  });

  it('nenhum ponto do couro sai da silhueta', () => {
    const { container } = render(<Globe />);
    // os pontos são os círculos pequenos; o contorno é o último, sem preenchimento
    const pontos = Array.from(container.querySelectorAll('circle')).filter(
      (c) => c.getAttribute('fill') === 'currentColor',
    );

    expect(pontos.length).toBeGreaterThan(50);
    for (const c of pontos) {
      const x = Number(c.getAttribute('cx'));
      const y = Number(c.getAttribute('cy'));
      expect(foraDaEsfera(x, y)).toBe(false);
    }
  });

  it('usa o token de acento nos gomos, não um hex cru', () => {
    const { container } = render(<Globe />);
    const html = container.innerHTML;

    expect(html).toContain('var(--color-primary)');
    expect(html).not.toMatch(/stroke="#[0-9a-f]{6}"/i);
  });

  it('escala e respeita a opacidade pedida', () => {
    const { container } = render(<Globe size={320} opacity={0.08} />);
    const svg = container.querySelector('svg')!;

    expect(svg.getAttribute('width')).toBe('320');
    expect((svg as unknown as HTMLElement).style.opacity).toBe('0.08');
  });
});
