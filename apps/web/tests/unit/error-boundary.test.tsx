// @vitest-environment jsdom
/**
 * Fronteira de erro — a mensagem tem de descrever a causa CERTA.
 *
 * ── O DEFEITO QUE ESTE TESTE TRAVA ────────────────────────────────────────────────────────
 * As fronteiras usavam as strings de falha de ORIGEM:
 *
 *     title = "Não foi possível carregar"
 *     body  = "A origem não respondeu. O número que aparece abaixo é o último que conseguimos
 *              verificar."
 *
 * Mas a fronteira captura uma EXCEÇÃO de renderização — o React quebrou, não a origem. A tela
 * afirmava uma causa que não tinha, e ainda mandava olhar "o número abaixo", que nesse caso não
 * existe. Vi isso forçando um `throw` e olhando a tela.
 *
 * A mensagem certa fala do que aconteceu (a tela falhou ao montar) e aponta para o `digest`, que
 * é o identificador que liga a tela ao log.
 *
 * O teste também garante que a mensagem CRUA do erro não chega ao visitante — ela serve a quem
 * desenvolve e pode vazar detalhe interno.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

const reset = vi.fn();

// O componente lê SÓ o locale do provider e busca as strings em `fichaStrings`, que NÃO é
// mockado — então o teste valida o texto REAL que a pessoa lê em pt-br.
vi.mock('@/i18n/Provider', () => ({
  useI18n: () => ({ locale: 'pt-br' as const }),
}));

import RootError from '@/app/error';

afterEach(cleanup);

describe('fronteira de erro', () => {
  it('descreve a causa CERTA e não culpa a origem', async () => {
    render(<RootError error={new Error('boom interno')} reset={reset} />);

    const alerta = await screen.findByRole('alert');
    const texto = (alerta.textContent ?? '').toLowerCase();

    // fala de renderização
    expect(texto).toContain('falhou ao montar');
    // e NÃO repete a mensagem de falha de fonte de dado
    expect(texto).not.toContain('a origem não respondeu');
    expect(texto).not.toContain('o número que aparece abaixo');
  });

  it('não expõe a mensagem crua do erro ao visitante', async () => {
    render(<RootError error={new Error('senha do banco inválida')} reset={reset} />);

    const main = document.body.textContent ?? '';
    expect(main).not.toContain('senha do banco inválida');
  });

  it('mostra o digest — é o que liga a tela ao log', async () => {
    render(<RootError error={Object.assign(new Error('x'), { digest: 'abc123' })} reset={reset} />);

    expect(await screen.findByText(/abc123/)).toBeTruthy();
  });

  it('oferece repetir com reset(), não com um link que recarrega', async () => {
    render(<RootError error={new Error('x')} reset={reset} />);

    const botao = await screen.findByRole('button', { name: /tentar/i });
    expect(botao.tagName).toBe('BUTTON');
    botao.click();
    expect(reset).toHaveBeenCalled();
  });
});
