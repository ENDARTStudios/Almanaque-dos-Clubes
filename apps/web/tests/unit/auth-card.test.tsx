// @vitest-environment jsdom
/**
 * AuthCard — a casca das telas de entrada, redesenhada.
 *
 * ── O QUE ESTE TESTE TRAVA ────────────────────────────────────────────────────────────────
 * A versão anterior era um card de duas metades com troca por `<input type=checkbox>` + `~`.
 * Quatro painéis coexistiam no DOM, e por isso existia uma regra especial (T554): só o painel
 * ATIVO recebia `<h1>`, senão a página teria dois. A troca era um `<label>` — que não navega,
 * não recebe foco e não aparece na lista de links do leitor de tela.
 *
 * O desenho novo é coluna única. As invariantes que passam a valer:
 *
 *   1. UM `<h1>` — agora por CONSTRUÇÃO, não por condicional. Se alguém voltar a montar os dois
 *      formulários juntos, o teste cai.
 *   2. NENHUM VERSALETE — o CTA anterior era `text-transform: uppercase` ("ENTRAR"). O teste
 *      olha o HTML renderizado, então pega tanto classe Tailwind quanto CSS.
 *   3. A SAÍDA É UM LINK — `role=link` com `href`, focável. Era um `<label>` sem href.
 *   4. O `<h1>` é o primeiro texto do card, sem eyebrow acima.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

const push = vi.fn();
const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace, refresh: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/i18n/Provider', () => ({
  useI18n: () => ({
    locale: 'pt-br' as const,
    // devolve a própria chave: o teste não depende de copy, só de estrutura
    t: (k: string) => k,
    setLocale: vi.fn(),
  }),
}));

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn().mockResolvedValue({ data: null }), post: vi.fn().mockResolvedValue({}) },
}));

import { AuthCard } from '@/components/auth/AuthCard';

beforeEach(() => {
  push.mockClear();
  replace.mockClear();
});

afterEach(cleanup);

describe('AuthCard — login', () => {
  it('tem UM h1 e ele é o primeiro texto do card', () => {
    const { container } = render(<AuthCard mode="login" />);

    const headings = container.querySelectorAll('h1');
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe('Entrar');

    // nada de eyebrow acima do título: o h1 é o primeiro nó de texto
    const card = container.querySelector('.auth-card')!;
    const antes = Array.from(card.querySelectorAll('p, span, h2, h3')).filter(
      (el) => (el.compareDocumentPosition(headings[0]) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
    );
    expect(antes).toHaveLength(0);
  });

  it('não usa versalete em lugar nenhum do card', () => {
    const { container } = render(<AuthCard mode="login" />);
    const html = container.innerHTML.toLowerCase();

    expect(html).not.toContain('uppercase');
    expect(html).not.toContain('text-transform');
  });

  it('a saída para o cadastro é um LINK de verdade, com href', () => {
    render(<AuthCard mode="login" />);

    const link = screen.getByRole('link', { name: 'Criar conta' });
    expect(link.getAttribute('href')).toBe('/auth/register');
  });

  it('não tem o checkbox-escondido da troca animada', () => {
    const { container } = render(<AuthCard mode="login" />);
    // o mecanismo antigo era um <input type=checkbox> escondido que dirigia a troca por CSS
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
  });
});

describe('AuthCard — cadastro', () => {
  it('tem UM h1 ("Criar conta") e a saída leva ao login', () => {
    const { container } = render(<AuthCard mode="register" />);

    const headings = container.querySelectorAll('h1');
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe('Criar conta');

    const link = screen.getByRole('link', { name: 'Entrar' });
    expect(link.getAttribute('href')).toBe('/auth/login');
  });

  it('o consentimento não repete o nome do documento', () => {
    render(<AuthCard mode="register" />);

    // as chaves vêm do dicionário; o que importa é que exista UM link para /termos
    const termos = screen.getAllByRole('link').filter((a) => a.getAttribute('href') === '/termos');
    expect(termos).toHaveLength(1);
  });
});
