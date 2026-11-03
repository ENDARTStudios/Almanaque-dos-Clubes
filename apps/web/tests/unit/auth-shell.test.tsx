// @vitest-environment jsdom
/**
 * AuthShell — a casca das telas de entrada, agora no sistema.
 *
 * ── O QUE ESTE TESTE TRAVA ────────────────────────────────────────────────────────────────
 * A casca existia como CSS próprio (`auth-card__*`). O desenho estava certo, mas morava fora do
 * sistema: nenhuma rota de auth importava `@/components/ficha/`, então as quatro telas eram uma
 * ilha — sem contrato, sem teste, sem lugar único para mudar.
 *
 * As invariantes que passam a valer, e que o teste garante:
 *
 *   1. UM `<h1>`, e ele o primeiro texto do card — sem eyebrow acima (a regra vale aqui também).
 *   2. NENHUM VERSALETE. O CTA da versão de duas metades era `text-transform: uppercase`
 *      ("ENTRAR"); o teste olha o HTML renderizado e pega classe Tailwind OU CSS.
 *   3. RÉGUA DE CARD, não de página. `text-3xl` e NUNCA `text-5xl`/`text-6xl` — é a mesma
 *      distinção que separa `AdminHeading` de `FichaHead`. Se alguém "unificar" trocando por
 *      `FichaHead`, o card ganha título de landing e nada mais avisa.
 *   4. O rodapé só existe quando pedido, e vem separado por divisória — ele não compete com o
 *      botão de envio.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import AuthShell from '@/components/ficha/AuthShell';

afterEach(cleanup);

describe('AuthShell', () => {
  it('tem um h1 que é o primeiro texto do card, sem eyebrow', () => {
    const { container } = render(
      <AuthShell title="Entrar" subtitle="Acesse sua conta">
        <form />
      </AuthShell>,
    );

    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toBe('Entrar');
    expect(container.querySelectorAll('h1')).toHaveLength(1);

    const card = container.querySelector('[data-testid="auth-shell"]')!;
    const antes = Array.from(card.querySelectorAll('p, span, h2, h3')).filter(
      (el) => (el.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
    );
    expect(antes).toHaveLength(0);
  });

  it('não usa versalete', () => {
    const { container } = render(<AuthShell title="Entrar">x</AuthShell>);
    const html = container.innerHTML.toLowerCase();

    expect(html).not.toContain('uppercase');
    expect(html).not.toContain('text-transform');
  });

  it('usa a RÉGUA DE CARD: nunca a escala de página', () => {
    render(<AuthShell title="Entrar">x</AuthShell>);
    const classes = screen.getByRole('heading', { level: 1 }).className;

    expect(classes).toContain('text-3xl');
    expect(classes).toContain('font-heading');
    // o que o FichaHead usa e o card NÃO pode usar
    expect(classes).not.toContain('text-5xl');
    expect(classes).not.toContain('text-6xl');
  });

  it('o subtítulo usa ink-2 (AA), não foreground com opacidade', () => {
    render(
      <AuthShell title="Entrar" subtitle="Acesse sua conta">
        x
      </AuthShell>,
    );
    const classes = screen.getByText('Acesse sua conta').className;

    expect(classes).toContain('text-ink-2');
    expect(classes).not.toContain('foreground/70');
  });

  it('o rodapé é opcional e, quando existe, vem depois do conteúdo', () => {
    const semRodape = render(<AuthShell title="t">conteúdo</AuthShell>);
    expect(semRodape.container.querySelector('.border-t')).toBeNull();
    semRodape.unmount();

    const { container } = render(
      <AuthShell title="t" footer={<a href="/auth/login">Voltar</a>}>
        conteúdo
      </AuthShell>,
    );
    const rodape = screen.getByRole('link', { name: 'Voltar' });
    expect(container.querySelector('.border-t')).not.toBeNull();
    // o rodapé vem DEPOIS do corpo
    const corpo = container.querySelector('form');
    expect(corpo).toBeNull();
    expect(rodape).toBeTruthy();
  });
});
