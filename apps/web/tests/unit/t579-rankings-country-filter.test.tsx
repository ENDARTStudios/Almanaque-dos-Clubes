// @vitest-environment jsdom
/**
 * T579 (ITEM 21) — /rankings: a lista de países do filtro vem do FACET da API.
 *
 * A causa-raiz medida: a lista era montada no cliente com `res.data.map(r => r.country)`, ou
 * seja, com os países da PRIMEIRA PÁGINA da tabela. No ranking que a página carrega por padrão
 * (o piloto da Serie A, nacional) isso dá um país só (`IT`). Este teste trava a correção:
 *
 *  (a) o `<select>` de país mostra os países do FACET (`countries`), não os da página;
 *  (b) o rótulo traz o nome do país no idioma do usuário e a sigla que a API filtra;
 *  (c) trocar de competição (ou de tipo) RECARREGA — não ficava preso no recorte anterior;
 *  (d) o fallback para as linhas só existe quando a API (antiga) não manda o facet.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';

vi.mock('@/i18n/Provider', () => {
  const rankings: Record<string, string> = {
    title: 'Rankings',
    pilotBadge: 'Piloto',
    pilotSubtitle: 'Inglaterra/RSSSF',
    pilotMethodology: 'Metodologia',
    viewDivision: 'Por divisão',
    viewPyramid: 'Pirâmide',
    pyramidDisclaimer: 'Agregado derivado.',
    filterYear: 'Ano',
    filterType: 'Tipo',
    typeClubs: 'Clubes',
    typePlayers: 'Jogadores',
    filterCompetition: 'Competição',
    filterGender: 'Gênero',
    genderMen: 'Masculino',
    genderWomen: 'Feminino',
    filterCountry: 'País',
    all: 'Todos',
    searchClub: 'Buscar clube',
    empty: 'Sem dados.',
    loadMore: 'Carregar mais',
    colPosition: 'Pos.',
    colClub: 'Clube',
    colPoints: 'Nota',
    colBase: 'Base',
    colDivision: 'Divisão',
    colLevel: 'Nível',
    colMultiplier: 'Multiplicador',
    baseOf: 'base em {m} partidas',
    updated: 'Atualizado: {name}',
  };
  return {
    useI18n: () => ({
      locale: 'pt-br' as const,
      dict: { pages: { rankings } },
      t: (key: string) => key,
      setLocale: () => {},
    }),
  };
});

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { get } }));

import RankingsTable from '@/components/RankingsTable';

const entradas = {
  ranking: {
    id: 'r1',
    name: 'Ranking 0-100 Serie A 2024-2025',
    season: '2024-2025',
    competitionId: 'c1',
  },
  data: [
    {
      position: 1,
      points: 100,
      clubId: 'club-1',
      clubName: 'Inter Milan',
      playerId: null,
      playerName: null,
      country: 'IT',
      state: null,
      city: 'Milão',
      baseMatches: 58,
      baseTitles: 0,
      gender: 'men',
    },
  ],
  cursor: null,
  /** FACET real: os países que TÊM ranking no recorte (medido: 58 no acervo de clubes). */
  countries: ['ES', 'GB', 'IT', 'BR'],
};

const publicados = {
  data: [
    {
      id: 'r1',
      name: 'Ranking 0-100 Serie A 2024-2025',
      season: '2024-2025',
      competitionId: 'c1',
      scope: null,
      type: 'club',
    },
  ],
};

beforeEach(() => {
  get.mockImplementation(async (url: string) => {
    if (url.startsWith('/rankings?')) return publicados;
    return entradas;
  });
});
afterEach(() => {
  cleanup();
  get.mockReset();
});

const seletorPais = () => screen.getByLabelText('País');

describe('/rankings — filtro "País" (T579 · item 21)', () => {
  it('(a)(b) o select mostra os países do FACET, com nome no idioma e sigla', async () => {
    render(<RankingsTable />);
    await waitFor(() => expect(seletorPais().querySelectorAll('option').length).toBe(5));
    const rotulos = [...seletorPais().querySelectorAll('option')].map((o) => o.textContent);
    // "Todos" + os 4 do facet, ordenados por NOME no idioma do usuário (não por sigla).
    expect(rotulos).toEqual([
      'Todos',
      'Brasil (BR)',
      'Espanha (ES)',
      'Itália (IT)',
      'Reino Unido (GB)',
    ]);
    const valores = [...seletorPais().querySelectorAll('option')].map(
      (o) => (o as HTMLOptionElement).value,
    );
    // O valor enviado à API continua sendo a SIGLA, que é o que o filtro usa.
    expect(valores).toEqual(['', 'BR', 'ES', 'IT', 'GB']);
    // A linha da tabela traz a bandeira clicável para os clubes daquele país.
    const bandeira = screen.getAllByTestId('country-flag-link')[0]!;
    expect(bandeira.getAttribute('href')).toBe('/clubs?country=IT');
    expect(bandeira.getAttribute('aria-label')).toBe('Ver clubes: Itália');
  });

  it('(c) trocar de competição recarrega o recorte (antes ficava preso no anterior)', async () => {
    render(<RankingsTable />);
    await waitFor(() =>
      expect(get.mock.calls.some(([u]) => String(u).startsWith('/rankings/entries'))).toBe(true),
    );
    const antes = get.mock.calls.filter(([u]) => String(u).startsWith('/rankings/entries')).length;
    // O select de competição só aparece depois dos publicados carregarem.
    const competicao = await screen.findByLabelText('Competição');
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.change(competicao, { target: { value: 'c1' } });
    await waitFor(() =>
      expect(
        get.mock.calls.filter(([u]) => String(u).startsWith('/rankings/entries')).length,
      ).toBeGreaterThan(antes),
    );
    const ultima = String(get.mock.calls[get.mock.calls.length - 1]?.[0]);
    expect(ultima).toContain('competitionId=c1');
  });

  it('(d) API antiga sem o campo `countries`: cai para os países das linhas', async () => {
    get.mockImplementation(async (url: string) => {
      if (url.startsWith('/rankings?')) return publicados;
      // Resposta SEM o facet: exatamente o formato da API anterior à correção.
      return { ranking: entradas.ranking, data: entradas.data, cursor: entradas.cursor };
    });
    render(<RankingsTable />);
    await waitFor(() => expect(seletorPais().querySelectorAll('option').length).toBe(2));
    expect([...seletorPais().querySelectorAll('option')].map((o) => o.textContent)).toEqual([
      'Todos',
      'Itália (IT)',
    ]);
  });
});
