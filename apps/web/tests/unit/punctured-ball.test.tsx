// @vitest-environment jsdom
/**
 * PuncturedBall — a ilustração do 404.
 *
 * ── O QUE ESTE TESTE PROTEGE ────────────────────────────────────────────────────────────────
 * Duas coisas que uma ilustração perde sem aviso:
 *
 *   1. ACESSIBILIDADE. Uma ilustração decorativa precisa ser `aria-hidden` e `focusable="false"`.
 *      Se alguém trocar por `role="img"` com `alt`, o leitor de tela anuncia a imagem E o texto
 *      ao lado — a mesma informação duas vezes.
 *   2. OS TOKENS. A ilustração usa `currentColor` para a esfera e `var(--color-primary)` para os
 *      gomos. Se alguém cravar `#be123c` num `stroke`, ela para de acompanhar o tema escuro.
 *
 * O teste também confere a CONTAGEM das formas: são 5 gomos, 1 rasgo e 3 traços de ar. Uma
 * ilustração que perde metade das formas continua renderizando — só deixa de ser uma bola.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

import PuncturedBall from '@/components/ficha/PuncturedBall';

afterEach(cleanup);

describe('PuncturedBall', () => {
  it('é decorativa: aria-hidden e fora da ordem de tabulação', () => {
    const { container } = render(<PuncturedBall />);
    const svg = container.querySelector('svg')!;

    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('focusable')).toBe('false');
    // decorativa NÃO é role="img": o texto ao lado já explica o erro
    expect(svg.getAttribute('role')).toBeNull();
  });

  it('desenha a bola: 5 gomos, o rasgo e os três traços de ar', () => {
    const { container } = render(<PuncturedBall />);

    expect(container.querySelectorAll('polygon')).toHaveLength(5);
    // a esfera é 1 círculo + 2 elipses
    expect(container.querySelectorAll('circle')).toHaveLength(1);
    expect(container.querySelectorAll('ellipse')).toHaveLength(2);
    // o rasgo é 1 path; o ar são 3 linhas
    expect(container.querySelectorAll('path')).toHaveLength(1);
    expect(container.querySelectorAll('line')).toHaveLength(3);
  });

  it('usa os tokens, não cor crua — a ilustração acompanha o tema', () => {
    const { container } = render(<PuncturedBall />);
    const html = container.innerHTML;

    expect(html).toContain('var(--color-primary)');
    expect(html).toContain('currentColor');
    // nenhum hex solto: se houver, a ilustração deixa de responder ao tema escuro
    expect(html).not.toMatch(/#[0-9a-f]{6}/i);
  });

  it('escala com o tamanho pedido', () => {
    const { container } = render(<PuncturedBall size={200} />);
    const svg = container.querySelector('svg')!;

    expect(svg.getAttribute('width')).toBe('200');
    expect(svg.getAttribute('viewBox')).toBe('0 0 200 200');
  });
});
