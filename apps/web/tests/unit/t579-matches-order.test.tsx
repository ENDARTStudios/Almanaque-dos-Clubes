// @vitest-environment jsdom
/**
 * T579 (ITEM 20) — /matches: ordem do confronto e escudos.
 *
 * A página é um Server Component assíncrono, então o teste a CHAMA (aguardando) e renderiza o
 * JSX resultante. O que se prova aqui é o que o dono pediu e o que o leitor de tela ouve:
 *
 *  (a) a ordem é `casa · placar casa · × · placar visitante · visitante` — a frase
 *      "SS Lazio 0 × 1 Unione Sportiva Lecce", não o placar isolado depois dos dois nomes;
 *  (b) o escudo de cada time aparece ao lado do nome (com logo do acervo e com o fallback
 *      autoral quando não há logo — nunca um brasão inventado);
 *  (c) o "×" é decorativo e a conjunção falada (`a`/`to`) carrega o confronto na leitura;
 *  (d) placar ausente na fonte é DECLARADO, não virou zero.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: 'pt-br' }) }),
}));

import MatchesPage from '@/app/matches/page';

const partidas = {
  data: [
    {
      id: 'm1',
      date: '2025-05-25T00:00:00.000Z',
      round: '38',
      homeScore: 0,
      awayScore: 1,
      homeClub: { id: 'c1', name: 'SS Lazio', logoUrl: 'https://exemplo.test/lazio.png' },
      awayClub: { id: 'c2', name: 'Unione Sportiva Lecce', logoUrl: null },
      competition: { id: 'p1', name: 'Serie A' },
      season: { id: 's1', name: '2024-2025' },
    },
    {
      id: 'm2',
      date: '2025-05-18T00:00:00.000Z',
      round: '37',
      homeScore: null,
      awayScore: null,
      homeClub: { id: 'c3', name: 'AS Roma', logoUrl: null },
      awayClub: { id: 'c4', name: 'Inter Milan', logoUrl: null },
      competition: { id: 'p1', name: 'Serie A' },
      season: { id: 's1', name: '2024-2025' },
    },
  ],
  total: 2,
};

async function renderPagina() {
  const url = (entrada: unknown) => String(entrada);
  global.fetch = vi.fn(async (entrada: unknown) => {
    const alvo = url(entrada);
    const corpo = alvo.includes('/matches/facets')
      ? { competitions: [{ id: 'p1', name: 'Serie A', count: 2 }], seasons: [] }
      : partidas;
    return new Response(JSON.stringify(corpo), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;
  const ui = await MatchesPage({ searchParams: Promise.resolve({}) });
  render(ui);
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('/matches — confronto na ordem certa (T579 · item 20)', () => {
  it('(a)(c) a linha lê "casa, placar casa, ×, placar visitante, visitante"', async () => {
    await renderPagina();
    const linha = screen.getByText('SS Lazio').closest('tr');
    expect(linha).not.toBeNull();
    // A ordem do DOM na célula é a do confronto — e é a ordem que o leitor de tela segue:
    // "SS Lazio | 0 | (× decorativo) | a | 1 | Unione Sportiva Lecce".
    const celula = linha!.querySelector('td:nth-child(2)')!;
    expect(celula.textContent).toBe('SS Lazio0×a1Unione Sportiva Lecce');
    // O "×" visual é decorativo; a fala vem da conjunção, que existe no DOM e não na tela.
    const decorativo = [...celula.querySelectorAll('[aria-hidden="true"]')].map(
      (n) => n.textContent,
    );
    expect(decorativo).toContain('×');
    const falado = [...celula.querySelectorAll('.sr-only')].map((n) => n.textContent);
    expect(falado).toContain('a');
    // Confronto falado, com cada placar colado no time a que pertence:
    const semDecoracao = celula.cloneNode(true) as HTMLElement;
    semDecoracao.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
    expect(semDecoracao.textContent).toBe('SS Lazio0a1Unione Sportiva Lecce');
    expect(linha!.textContent).not.toContain('sem placar na fonte');
  });

  it('(b) cada time tem escudo ao lado do nome — logo do acervo e fallback autoral', async () => {
    await renderPagina();
    const linha = screen.getByText('SS Lazio').closest('tr')!;
    // Lazio tem logo no acervo: escudo real.
    expect(linha.querySelector('[data-testid="club-crest"]')).not.toBeNull();
    // Lecce não tem: o cartão de fallback do projeto (nunca um brasão inventado).
    expect(linha.querySelector('[data-testid="club-crest-fallback"]')).not.toBeNull();
    // Os dois times, com os dois escudos.
    expect(linha.querySelectorAll('[data-testid^="club-crest"]').length).toBe(2);
  });

  it('(a) o placar NÃO fica mais numa coluna depois dos dois nomes', async () => {
    await renderPagina();
    const cabecalhos = [...document.querySelectorAll('thead th')].map((n) => n.textContent?.trim());
    expect(cabecalhos).toEqual(['Data', 'Partida', 'Competição', 'Temporada']);
  });

  it('(d) placar ausente na fonte é declarado, não virou 0', async () => {
    await renderPagina();
    const linha = screen.getByText('AS Roma').closest('tr')!;
    // A célula do confronto NÃO tem número nenhum: só a lacuna declarada. (`0` existe na
    // linha inteira por causa da data "18/05/2025" — por isso a asserção é na célula.)
    const celula = linha.querySelector('td:nth-child(2)')!;
    expect(celula.textContent).toBe('AS Romasem placar na fonteInter Milan');
    expect(celula.textContent).not.toContain('0');
  });
});
