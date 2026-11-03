// @vitest-environment jsdom
/**
 * AdminHeading — a espinha do sistema na régua do admin.
 *
 * ── O QUE ESTE TESTE PROTEGE ────────────────────────────────────────────────────────────────
 * A decisão do conceito é específica: *"Admin não é vitrine: mesmos tokens, régua tipográfica
 * menor, densidade maior"*. Se alguém trocar este componente por `FichaHead` "para unificar", o
 * painel ganha um título de 6xl e os indicadores saem da primeira dobra — e nada avisa, porque
 * as duas são cabeçalhos válidos.
 *
 * Então o teste fixa a RÉGUA: no máximo `text-3xl`. O público chega a `lg:text-6xl`; o admin não
 * pode chegar lá.
 *
 * ── O QUE MAIS ELE CONFERE ─────────────────────────────────────────────────────────────────
 *   · zero eyebrow — nada acima do `<h1>` (a proibição vale no admin também);
 *   · um `<h1>` só, sem pular nível;
 *   · `measure-readable` no subtítulo — a medida de 68ch vale aqui como em qualquer lugar.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import AdminHeading from '@/components/ficha/AdminHeading';

afterEach(cleanup);

describe('AdminHeading', () => {
  it('é um h1, sem eyebrow acima dele', () => {
    const { container } = render(<AdminHeading title="Operação" subtitle="Estado do acervo" />);

    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toBe('Operação');

    const header = container.querySelector('header')!;
    const antes = Array.from(header.querySelectorAll('p, span')).filter(
      (el) => (el.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
    );
    expect(antes).toHaveLength(0);
  });

  it('usa a RÉGUA DO ADMIN: no máximo text-3xl, nunca a escala pública', () => {
    render(<AdminHeading title="Operação" />);
    const classes = screen.getByRole('heading', { level: 1 }).className;

    // positivo: a escala de trabalho existe
    expect(classes).toContain('text-2xl');
    expect(classes).toContain('sm:text-3xl');

    // negativo: nada de 4xl/5xl/6xl — é o que separa admin de página pública
    expect(classes).not.toContain('text-4xl');
    expect(classes).not.toContain('text-5xl');
    expect(classes).not.toContain('text-6xl');
  });

  it('não está em caixa alta', () => {
    render(<AdminHeading title="Operação" />);
    expect(screen.getByRole('heading', { level: 1 }).className).not.toContain('uppercase');
  });

  it('mantém o eixo tipográfico do sistema', () => {
    render(<AdminHeading title="Operação" />);
    expect(screen.getByRole('heading', { level: 1 }).className).toContain('font-heading');
  });

  it('o subtítulo respeita a medida de leitura', () => {
    render(<AdminHeading title="t" subtitle="Filas de ingestão e pendências de moderação." />);
    expect(screen.getByText('Filas de ingestão e pendências de moderação.').className).toContain(
      'measure-readable',
    );
  });

  it('aceita uma contagem à direita e omite o bloco quando não há', () => {
    // com aside: o header tem DUAS colunas (título + contagem)
    const comAside = render(<AdminHeading title="t" aside="7 pendentes" />);
    expect(screen.getByText('7 pendentes')).toBeTruthy();
    expect(comAside.container.querySelector('header')!.children).toHaveLength(2);
    comAside.unmount();

    // sem aside: uma coluna só — nada de espaço reservado à toa
    const semAside = render(<AdminHeading title="t" />);
    expect(semAside.container.querySelector('header')!.children).toHaveLength(1);
  });
});
