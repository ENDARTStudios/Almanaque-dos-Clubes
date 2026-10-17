// @vitest-environment jsdom
/**
 * Seletor de idioma — LISTA PRÓPRIA, com o design do site.
 *
 * O DEFEITO QUE ESTES TESTES TRAVAM
 *   O controle era um `<select>` NATIVO sobreposto em `opacity-0`. A janela que abre é desenhada
 *   pelo SISTEMA OPERACIONAL, e não há CSS que a alcance: o Operador via um retângulo alheio ao
 *   site, sem cantos, sem borda e sem as cores da paleta.
 *
 *   A asserção (a) é a que impede a volta: **não pode existir `<select>` nativo** neste componente.
 *   É uma regressão fácil de reintroduzir — o truque resolvia um problema real de largura — e o
 *   typecheck não veria diferença nenhuma.
 *
 * O resto cobre o que o `<select>` dava de graça e uma lista própria precisa implementar: teclado,
 * `aria` de listbox e fechar ao clicar fora.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';

const setLocale = vi.fn();
vi.mock('@/i18n/Provider', () => ({
  useI18n: () => ({ locale: 'pt-br' as const, setLocale }),
}));

import LanguageSelector from '@/components/LanguageSelector';

function montar() {
  return render(<LanguageSelector />);
}

/** Abre a lista pelo gatilho. */
async function abrir() {
  await act(async () => {
    fireEvent.click(screen.getByTestId('language-trigger'));
  });
}

beforeEach(() => setLocale.mockReset());
afterEach(cleanup);

describe('LanguageSelector — a lista é do site, não do sistema', () => {
  it('(a) NENHUM `<select>` nativo — é isso que trazia a janela do sistema operacional', () => {
    const { container } = montar();
    expect(container.querySelector('select')).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('(b) a lista usa os tokens do site (cantos, borda, fundo, sombra)', async () => {
    montar();
    await abrir();
    const lista = screen.getByTestId('language-list');
    /* As classes são o design system: `rounded-xl` (card), `border-border`, `bg-background` e
       `shadow-lg`. Não é asserção de aparência exata — é de que a lista fala a MESMA língua dos
       outros dropdowns do projeto, que é o que faltava. */
    for (const classe of ['rounded-xl', 'border-border', 'bg-background', 'shadow-lg']) {
      expect(lista.className, `falta ${classe}`).toContain(classe);
    }
  });

  it('(c) alinha à DIREITA: o controle vive na ponta direita da barra', async () => {
    montar();
    await abrir();
    // `left-0` faria a lista sair da tela em viewport estreita.
    expect(screen.getByTestId('language-list').className).toContain('right-0');
  });

  it('(d) o idioma em uso é MARCADO (o `<select>` mostrava por posição)', async () => {
    montar();
    await abrir();
    expect(screen.getByTestId('language-option-pt-br').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('language-option-en-us').getAttribute('aria-selected')).toBe('false');
  });

  it('(e) mostra os três idiomas com nome e bandeira (asset próprio, não emoji)', async () => {
    montar();
    await abrir();
    expect(screen.getByTestId('language-option-pt-br').textContent).toContain('Português (BR)');
    expect(screen.getByTestId('language-option-en-us').textContent).toContain('English (US)');
    expect(screen.getByTestId('language-option-es-es').textContent).toContain('Español (ES)');
    // T579b — a bandeira do idioma é `/flags/br.svg`, servida do nosso domínio. O emoji
    // (`🇧🇷`) saiu porque no Windows ele degrada para as duas letras regionais.
    const bandeira = screen.getByTestId('locale-flag-pt-br');
    expect(bandeira.getAttribute('src')).toBe('/flags/br.svg');
    expect(screen.getByTestId('language-option-pt-br').textContent).not.toContain('🇧🇷');
  });
});

describe('LanguageSelector — o que o nativo dava de graça', () => {
  it('(f) `aria-expanded` acompanha o estado', async () => {
    montar();
    const gatilho = screen.getByTestId('language-trigger');
    expect(gatilho.getAttribute('aria-expanded')).toBe('false');
    await abrir();
    expect(gatilho.getAttribute('aria-expanded')).toBe('true');
    expect(gatilho.getAttribute('aria-haspopup')).toBe('listbox');
  });

  it('(g) escolher um idioma chama setLocale e fecha', async () => {
    montar();
    await abrir();
    await act(async () => {
      fireEvent.click(screen.getByTestId('language-option-en-us'));
    });
    expect(setLocale).toHaveBeenCalledWith('en-us');
    expect(screen.queryByTestId('language-list')).toBeNull();
  });

  it('(h) setas navegam e Enter escolhe — sem mouse', async () => {
    montar();
    const gatilho = screen.getByTestId('language-trigger');
    await act(async () => {
      fireEvent.keyDown(gatilho, { key: 'ArrowDown' });
    });
    // Abriu pelo teclado, como um `<select>` nativo.
    expect(screen.getByTestId('language-list')).toBeTruthy();

    // O destaque começa no idioma ATUAL (pt-br, índice 0); ArrowDown vai para o próximo.
    await act(async () => {
      fireEvent.keyDown(gatilho, { key: 'ArrowDown' });
    });
    await act(async () => {
      fireEvent.keyDown(gatilho, { key: 'Enter' });
    });
    expect(setLocale).toHaveBeenCalledWith('en-us');
  });

  it('(i) Home e End vão às pontas', async () => {
    montar();
    const gatilho = screen.getByTestId('language-trigger');
    await abrir();
    await act(async () => {
      fireEvent.keyDown(gatilho, { key: 'End' });
    });
    await act(async () => {
      fireEvent.keyDown(gatilho, { key: 'Enter' });
    });
    expect(setLocale).toHaveBeenCalledWith('es-es');
  });

  it('(j) Esc fecha e NÃO escolhe nada', async () => {
    montar();
    const gatilho = screen.getByTestId('language-trigger');
    await abrir();
    await act(async () => {
      fireEvent.keyDown(gatilho, { key: 'Escape' });
    });
    expect(screen.queryByTestId('language-list')).toBeNull();
    expect(setLocale, 'Esc não pode trocar o idioma').not.toHaveBeenCalled();
  });

  it('(k) clique FORA fecha a lista', async () => {
    montar();
    await abrir();
    expect(screen.getByTestId('language-list')).toBeTruthy();
    await act(async () => {
      fireEvent.mouseDown(document.body);
    });
    expect(screen.queryByTestId('language-list')).toBeNull();
  });
});
