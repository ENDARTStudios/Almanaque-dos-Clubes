// @vitest-environment jsdom
/**
 * Navegação mobile — o comportamento que faltava testar.
 *
 * ── POR QUE ESTE TESTE EXISTE ───────────────────────────────────────────────────────────────
 * A varredura do conceito dizia que "o menu de 7 itens não cabe em celular". Ao abrir o código,
 * o painel mobile JÁ existia e estava bem construído: hambúrguer com `aria-expanded` e
 * `aria-controls`, painel com busca, destinos agrupados e submenus expansíveis. A afirmação
 * estava errada — eu tinha julgado pela lista de links, não pelo componente.
 *
 * O que REALMENTE faltava era cobertura: nenhum teste tocava em `nav-mobile-*`. Um painel de
 * navegação sem teste é um painel que quebra em silêncio na próxima refatoração — e o modo de
 * quebrar é justamente o que ninguém vê no desktop.
 *
 * ── O QUE ELE PROVA ─────────────────────────────────────────────────────────────────────────
 *   1. o gatilho abre e fecha o painel, e `aria-expanded` acompanha;
 *   2. `aria-controls` aponta para um id que existe quando o painel está aberto;
 *   3. Escape fecha o painel (padrão de disclosure do WAI-ARIA) e devolve o foco ao gatilho.
 *
 * O terceiro é o que estava faltando no código: sem ele, quem navega por teclado abre o menu,
 * aperta Escape e nada acontece — a única saída é tabular até o fim do painel.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

vi.mock('@/i18n/Provider', async () => {
  const pt = (await import('@/i18n/dictionaries/pt-br')).default;
  return {
    useI18n: () => ({
      locale: 'pt-br' as const,
      dict: pt,
      // devolve a própria chave: o teste procura pelo nome do rótulo, não pelo texto traduzido
      t: (key: string) => key,
      setLocale: () => {},
    }),
  };
});

vi.mock('@/components/CommandPaletteProvider', () => ({
  useCommandPalette: () => ({ open: vi.fn() }),
}));

vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({ user: null, status: 'ready', logout: vi.fn() }),
}));

vi.mock('@/hooks/useGsap', () => ({ useGsapFadeIn: () => {} }));

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));

vi.mock('next/image', () => ({
  // o Next/Image real exige o loader; no teste basta a marca
  default: ({ alt }: { alt?: string }) => <span data-testid="nav-logo" aria-label={alt} />,
}));

vi.mock('@/components/LanguageSelector', () => ({ default: () => null }));
vi.mock('@/components/NotificationBadge', () => ({ default: () => null }));

import Navbar from '@/components/Navbar';

afterEach(cleanup);

function abrirMenu() {
  const toggle = screen.getByTestId('nav-mobile-toggle');
  fireEvent.click(toggle);
  return toggle;
}

describe('navegação mobile', () => {
  it('o gatilho abre o painel e anuncia o estado em aria-expanded', () => {
    render(<Navbar />);
    const toggle = screen.getByTestId('nav-mobile-toggle');

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByTestId('nav-mobile-panel')).toBeNull();

    fireEvent.click(toggle);

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByTestId('nav-mobile-panel')).toBeTruthy();
  });

  it('aria-controls aponta para o id do painel, e o alvo existe quando aberto', () => {
    render(<Navbar />);
    abrirMenu();

    const toggle = screen.getByTestId('nav-mobile-toggle');
    const idAlvo = toggle.getAttribute('aria-controls');

    expect(idAlvo).toBeTruthy();
    const painel = screen.getByTestId('nav-mobile-panel');
    expect(painel.id).toBe(idAlvo);
  });

  it('clicar de novo fecha o painel', () => {
    render(<Navbar />);
    const toggle = abrirMenu();

    fireEvent.click(toggle);

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByTestId('nav-mobile-panel')).toBeNull();
  });

  it('Escape fecha o painel e devolve o foco ao gatilho', async () => {
    render(<Navbar />);
    const toggle = abrirMenu();

    expect(screen.getByTestId('nav-mobile-panel')).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });

    // o painel sai do DOM no mesmo tick
    expect(screen.queryByTestId('nav-mobile-panel')).toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    // o foco volta no quadro seguinte (requestAnimationFrame), para não focar um nó que sai
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    expect(document.activeElement).toBe(toggle);
  });

  it('Escape com o painel fechado não quebra nada', () => {
    render(<Navbar />);
    expect(() => fireEvent.keyDown(document, { key: 'Escape' })).not.toThrow();
    expect(screen.getByTestId('nav-mobile-toggle').getAttribute('aria-expanded')).toBe('false');
  });
});
