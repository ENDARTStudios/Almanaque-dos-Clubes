// @vitest-environment jsdom
/**
 * /search no conceito FICHA — resultados agrupados por tipo.
 *
 * O que protege: a busca devolve TIPOS diferentes e a página os apresenta como grupos com
 * contagem real (Clubes · 3), em vez de uma lista achatada; o tipo vai rotulado em cada linha;
 * e grupo sem correspondência NÃO aparece (não existe seção vazia inventada).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('@/i18n/Provider', async () => {
  const { wsConceitoBusca } = await import('@/i18n/wsConceitoBusca');
  const { wsC2Strings } = await import('@/i18n/wsC2');
  return {
    useI18n: () => ({
      locale: 'pt-br' as const,
      dict: {},
      t: (k: string) => k,
      setLocale: () => {},
      wsConceitoBusca,
      wsC2Strings,
    }),
  };
});

const resposta = {
  query: 'flamengo',
  normalizedQuery: 'flamengo',
  type: 'all' as const,
  results: [
    {
      type: 'club' as const,
      id: 'c1',
      qid: null,
      name: 'Flamengo',
      subtitle: 'Rio de Janeiro · BR',
      country: 'BR',
      score: 1,
      sourceUrl: null,
    },
    {
      type: 'club' as const,
      id: 'c2',
      qid: null,
      name: 'Flamengo de Guarulhos',
      subtitle: 'São Paulo · BR',
      country: 'BR',
      score: 1,
      sourceUrl: null,
    },
    {
      type: 'player' as const,
      id: 'p1',
      qid: null,
      name: 'Flamenguinho',
      subtitle: 'meia · 2004',
      country: 'BR',
      score: 1,
      sourceUrl: null,
    },
  ],
  pagination: { limit: 20, offset: 0, total: 3 },
  counts: { all: 3, club: 2, competition: 0, player: 1 },
  limitations: ['Busca textual; não cobre estádios.'],
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(async () => resposta) },
}));

import GlobalSearch from '@/components/GlobalSearch';

afterEach(cleanup);

describe('GlobalSearch — grupos do conceito', () => {
  it('renderiza grupos com contagem e o tipo rotulado em cada linha', async () => {
    render(<GlobalSearch />);
    const input = screen.getAllByRole('combobox')[0];
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.change(input, { target: { value: 'flamengo' } });
    await new Promise((r) => setTimeout(r, 400));
    expect(await screen.findByTestId('search-group-club')).toBeTruthy();
    expect(screen.getByTestId('search-group-club').textContent).toContain('Clubes · 2');
    expect(screen.getByTestId('search-group-player').textContent).toContain('Jogadores · 1');
    // grupo sem correspondência não é renderizado
    expect(screen.queryByTestId('search-group-competition')).toBeNull();
    // cada linha leva o tipo (clube/jogador) em texto
    expect(screen.getAllByTestId('search-result-club')[0].textContent).toContain('clube');
  });
});
