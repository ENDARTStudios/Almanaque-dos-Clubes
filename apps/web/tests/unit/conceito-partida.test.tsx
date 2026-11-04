// @vitest-environment jsdom
/**
 * /matches/[id] no conceito FICHA — o placar é a manchete e a lacuna é declarada.
 *
 * O que protege: a ordem casa · placar · visitante no h1 (a mesma do T579), o placar ausente
 * virando "—" (nunca 0×0), e as duas lacunas reais da API: autores dos gols (quando a fonte não
 * publica) e escalações (a API não publica nunca). A ficha mostra a fonte real da partida.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: 'pt-br' }) }),
}));

import MatchPage from '@/app/matches/[id]/page';

const partida = {
  id: 'm1',
  date: '2025-05-25T00:00:00Z',
  competitionId: 'k1',
  seasonId: 's1',
  homeClubId: 'c1',
  awayClubId: 'c2',
  homeScore: 0,
  awayScore: 1,
  scorers: null,
  sourceNote: null,
  round: '38',
  venue: null,
  stadiumId: null,
  status: 'FINISHED',
  sourceUrl: 'https://www.rsssf.org/tablesi/ital2025.html',
  license: 'RSSSF',
};

const semPlacar = { ...partida, id: 'm2', homeScore: null, awayScore: null };

function mockFetch(dados: unknown) {
  global.fetch = vi.fn(async (entrada: unknown) => {
    const url = String(entrada);
    let corpo: unknown = { data: dados };
    if (url.includes('/clubs/c1')) corpo = { data: { id: 'c1', name: 'SS Lazio', logoUrl: null } };
    else if (url.includes('/clubs/c2'))
      corpo = { data: { id: 'c2', name: 'Unione Sportiva Lecce', logoUrl: null } };
    else if (url.includes('/competitions/k1')) corpo = { data: { name: 'Serie A' } };
    else if (url.includes('/seasons/s1')) corpo = { data: { name: '2024-25' } };
    return new Response(JSON.stringify(corpo), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;
}

afterEach(cleanup);

describe('/matches/[id]', () => {
  it('lê casa · placar · visitante e declara as lacunas de gols/escalações', async () => {
    mockFetch(partida);
    const ui = await MatchPage({ params: Promise.resolve({ id: 'm1' }) });
    render(ui);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toBe('SS Lazio 0 × 1 Unione Sportiva Lecce');
    expect(screen.getByText(/não publica os autores dos gols/)).toBeTruthy();
    expect(screen.getByText(/não publica escalações/)).toBeTruthy();
    expect(screen.getAllByText(/Serie A/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('38').length).toBeGreaterThan(0);
  });

  it('placar ausente vira "—", nunca 0×0', async () => {
    mockFetch(semPlacar);
    const ui = await MatchPage({ params: Promise.resolve({ id: 'm2' }) });
    render(ui);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).not.toContain('0 × 1');
    expect(h1.textContent).toContain('SS Lazio');
    // Os números visíveis do marcador são as lacunas declaradas.
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });
});
