// @vitest-environment jsdom
/**
 * DetailUnavailable — o estado que NÃO é 404.
 *
 * ── O DEFEITO QUE ESTE TESTE TRAVA ────────────────────────────────────────────────────────
 * As seis fichas de detalhe tratavam igual o resultado da consulta:
 *
 *     catch { return null; }             // falha de rede
 *     if (r.status === 404) return null; // registro inexistente
 *     if (dado === null) notFound();
 *
 * Com a API fora, `/estadios/qualquer-id` respondia "Página não encontrada — o conteúdo que você
 * procura não existe ou foi movido". Isso é uma AFIRMAÇÃO FALSA: a página não sabe se o registro
 * existe; ela só sabe que não conseguiu perguntar. Um 404 falso é pior que um erro honesto —
 * é cacheável por buscador e por proxy, e acusa o dado de inexistente.
 *
 * As invariantes:
 *   1. o texto NÃO afirma ausência — diz que não foi possível carregar;
 *   2. existe uma ação de repetir, apontando para a MESMA rota (repetir a pergunta);
 *   3. existe saída para o índice de onde se veio (não prender o visitante);
 *   4. `role="alert"` — falha de carregamento é anunciada.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// Server Component: lê o locale do cookie. No teste, o cookie é irrelevante.
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined }),
}));

import DetailUnavailable from '@/components/ficha/DetailUnavailable';

afterEach(cleanup);

describe('DetailUnavailable', () => {
  it('NÃO afirma que o registro não existe — diz que não foi possível carregar', async () => {
    render(await DetailUnavailable({ retryHref: '/estadios/abc' }));

    const alerta = screen.getByRole('alert');
    const texto = alerta.textContent ?? '';

    expect(texto.toLowerCase()).toContain('não foi possível');
    // as palavras do 404 de verdade não podem aparecer aqui
    expect(texto.toLowerCase()).not.toContain('não encontrad');
    expect(texto.toLowerCase()).not.toContain('não existe');
  });

  it('oferece repetir na MESMA rota', async () => {
    render(await DetailUnavailable({ retryHref: '/estadios/abc' }));

    const repetir = screen.getByRole('link', { name: /tentar/i });
    expect(repetir.getAttribute('href')).toBe('/estadios/abc');
  });

  it('oferece a saída para o índice quando recebe backHref', async () => {
    render(
      await DetailUnavailable({
        retryHref: '/estadios/abc',
        backHref: '/estadios',
        backLabel: 'Todos os estádios',
      }),
    );

    const voltar = screen.getByRole('link', { name: /Todos os estádios/ });
    expect(voltar.getAttribute('href')).toBe('/estadios');
  });

  it('sem backHref não inventa link de volta', async () => {
    const { container } = render(await DetailUnavailable({ retryHref: '/x' }));

    const links = Array.from(container.querySelectorAll('a'));
    expect(links).toHaveLength(1); // só o de repetir
  });
});
