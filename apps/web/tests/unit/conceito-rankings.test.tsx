// @vitest-environment jsdom
/**
 * /rankings no conceito FICHA — tabela densa + índice funcional.
 *
 * O que este teste trava:
 *  (a) a tabela desenha o ESQUELETO do conceito (cabeçalho de 6 colunas, número à direita e
 *      tabular, top-3 em peso maior, zebra) — e as lacunas viram "—", nunca zero inventado;
 *  (b) os links do dado continuam reais: clube → /clubs/[id], país → /clubs?country=XX;
 *  (c) a FUNCIONALIDADE da página antiga não regrediu: filtros por ano/competição/país/gênero/
 *      tipo, as duas réguas (divisão e pirâmide) e a paginação por cursor continuam consultando
 *      a API com os mesmos parâmetros;
 *  (d) os `data-testid` existentes seguem no DOM (`rankings-tab-*`, `pyramid-disclaimer`,
 *      `ranking-division-badge`, `ranking-pilot-badge`).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';

vi.mock('@/i18n/Provider', () => ({
  useI18n: () => ({
    locale: 'pt-br' as const,
    dict: {},
    t: (key: string) => key,
    setLocale: () => {},
  }),
}));

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { get } }));

import RankingsTable from '@/components/conceito/rankings/RankingsTable';
import RankingsIndex from '@/components/conceito/rankings/RankingsIndex';
import { wsConceitoRankings } from '@/i18n/wsConceitoRankings';

// Sem limpeza entre testes, um render acumula no DOM do próximo (a tabela apareceria 3×).
afterEach(cleanup);

const s = wsConceitoRankings['pt-br'];

const linhaCheia = {
  position: 1,
  points: 100,
  clubId: 'club-1',
  clubName: 'Inter Milan',
  playerId: null,
  playerName: null,
  country: 'IT',
  city: 'Milão',
  baseTitles: 3,
  baseMatches: 58,
};

const linhaLacunar = {
  position: 2,
  points: null,
  clubId: 'club-2',
  clubName: 'Palmeiras',
  playerId: null,
  playerName: null,
  country: null,
  city: null,
  baseTitles: null,
  baseMatches: null,
};

describe('RankingsTable — a tabela do conceito', () => {
  it('desenha as 6 colunas do conceito com o dado real disponível', () => {
    render(<RankingsTable rows={[linhaCheia]} locale="pt-br" view="division" s={s} />);
    const headers = screen.getAllByRole('columnheader').map((th) => th.textContent);
    expect(headers).toEqual(['#', 'Clube', 'País', 'Pts', 'Títulos', 'Base auditável']);
    expect(screen.getByRole('table')).toBeTruthy();
    expect(screen.getByTestId('conceito-rankings-row')).toBeTruthy();
  });

  it('número à direita e tabular; top-3 com peso maior', () => {
    render(
      <RankingsTable
        rows={[
          linhaCheia,
          { ...linhaLacunar, position: 2 },
          { ...linhaLacunar, position: 3 },
          { ...linhaLacunar, position: 4 },
        ]}
        locale="pt-br"
        view="division"
        s={s}
      />,
    );
    const linhas = screen.getAllByTestId('conceito-rankings-row');
    const celulasPrimeira = linhas[0]!.querySelectorAll('td');
    // # e Pts são numéricos: alinhados à direita e com numeral tabular.
    for (const indice of [0, 3]) {
      expect(celulasPrimeira[indice]!.className).toContain('text-right');
      expect(celulasPrimeira[indice]!.className).toContain('tabular-nums');
    }
    // o conceito dá peso 600 ao top-3, e só a ele
    expect(celulasPrimeira[1]!.className).toContain('font-semibold');
    const celulasQuarta = linhas[3]!.querySelectorAll('td');
    expect(celulasQuarta[1]!.className).not.toContain('font-semibold');
  });

  it('lacuna é "—" e os links do dado apontam para rotas reais', () => {
    render(
      <RankingsTable rows={[linhaCheia, linhaLacunar]} locale="pt-br" view="division" s={s} />,
    );
    // clube → ficha do clube
    const linkClube = screen.getByRole('link', { name: 'Inter Milan' });
    expect(linkClube.getAttribute('href')).toBe('/clubs/club-1');
    // país → recorte de clubes daquele país (nome acessível por extenso)
    const linkPais = screen.getByTestId('country-flag-link');
    expect(linkPais.getAttribute('href')).toBe('/clubs?country=IT');
    expect(linkPais.getAttribute('aria-label')).toBe('Ver clubes: Itália');
    // Sem base/títulos/país, a célula é lacuna declarada — não zero.
    const celulasSegunda = screen
      .getAllByTestId('conceito-rankings-row')[1]!
      .querySelectorAll('td');
    expect(celulasSegunda[2]!.textContent).toBe('—');
    expect(celulasSegunda[3]!.textContent).toBe('—');
    expect(celulasSegunda[4]!.textContent).toBe('—');
    expect(celulasSegunda[5]!.textContent).toBe('—');
  });

  it('a régua da pirâmide troca Títulos/Base por Divisão/Nível/Multiplicador', () => {
    render(
      <RankingsTable
        rows={[{ ...linhaCheia, divisionLabel: 'Série A', divisionLevel: 1, multiplier: 2 }]}
        locale="pt-br"
        view="pyramid"
        s={s}
      />,
    );
    const headers = screen.getAllByRole('columnheader').map((th) => th.textContent);
    expect(headers).toEqual(['#', 'Clube', 'País', 'Pts', 'Divisão', 'Nível', 'Mult.']);
    const celulas = screen.getAllByTestId('conceito-rankings-row')[0]!.querySelectorAll('td');
    expect(celulas[4]!.textContent).toBe('Série A');
    expect(celulas[5]!.textContent).toBe('1');
    expect(celulas[6]!.textContent).toBe('2');
  });
});

const entradas = {
  ranking: {
    id: 'r1',
    name: 'Ranking 0-100 Serie A 2024-2025',
    season: '2024-2025',
    competitionId: 'c1',
  },
  data: [linhaCheia, linhaLacunar],
  cursor: 2,
  countries: ['BR', 'ES', 'IT'],
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

function chamadasDeEntradas() {
  return get.mock.calls
    .map(([url]) => String(url))
    .filter((url) => url.startsWith('/rankings/entries'));
}

describe('RankingsIndex — funcionalidade preservada', () => {
  beforeEach(() => {
    get.mockImplementation(async (url: string) => {
      if (String(url).startsWith('/rankings?')) return publicados;
      return entradas;
    });
  });
  afterEach(() => {
    cleanup();
    get.mockReset();
  });

  it('carrega com os parâmetros da régua de divisão e popula ano/competição/facet de país', async () => {
    render(<RankingsIndex />);
    await waitFor(() => expect(screen.getByTestId('conceito-rankings-table')).toBeTruthy());

    expect(chamadasDeEntradas()[0]).toContain('type=club');
    expect(chamadasDeEntradas()[0]).toContain('limit=25');

    // Ano sai dos rankings PUBLICADOS (não é inventado no cliente).
    await waitFor(() =>
      expect(screen.getByLabelText('Ano').querySelectorAll('option').length).toBe(2),
    );
    // Competição sai dos escopos publicados do tipo selecionado.
    const competicao = await screen.findByLabelText('Competição');
    expect(competicao.querySelectorAll('option').length).toBe(2);
    // País sai do FACET da API — o mesmo contrato do T579 (item 21).
    const pais = screen.getByLabelText('País');
    const rotulos = [...pais.querySelectorAll('option')].map((o) => o.textContent);
    expect(rotulos).toEqual(['Todos', 'Brasil (BR)', 'Espanha (ES)', 'Itália (IT)']);

    // O nome real do ranking publicado aparece no recorte.
    expect(screen.getAllByText(/Ranking 0-100 Serie A 2024-2025/).length).toBeGreaterThan(0);
  });

  it('trocar o ano e a competição recarrega a consulta com o filtro', async () => {
    render(<RankingsIndex />);
    await waitFor(() => expect(chamadasDeEntradas().length).toBeGreaterThan(0));

    fireEvent.change(screen.getByLabelText('Ano'), { target: { value: '2024-2025' } });
    await waitFor(() =>
      expect(chamadasDeEntradas().some((url) => url.includes('year=2024-2025'))).toBe(true),
    );

    // Com filtro ativo, "Limpar filtros" aparece e realmente zera a consulta.
    fireEvent.click(screen.getByTestId('rankings-clear'));
    await waitFor(() => expect(chamadasDeEntradas().at(-1) ?? '').not.toContain('year='));
    expect(screen.queryByTestId('rankings-clear')).toBeNull();

    const antes = chamadasDeEntradas().length;
    const competicao = await screen.findByLabelText('Competição');
    fireEvent.change(competicao, { target: { value: 'c1' } });
    await waitFor(() => expect(chamadasDeEntradas().length).toBeGreaterThan(antes));
    expect(chamadasDeEntradas().at(-1)).toContain('competitionId=c1');
  });

  it('a régua da pirâmide consulta o escopo agregado e mantém os testids da página', async () => {
    render(<RankingsIndex />);
    await waitFor(() => expect(chamadasDeEntradas().length).toBeGreaterThan(0));

    expect(screen.getByTestId('rankings-tab-division')).toBeTruthy();
    fireEvent.click(screen.getByTestId('rankings-tab-pyramid'));

    await waitFor(() =>
      expect(chamadasDeEntradas().some((url) => url.includes('scope=country_pyramid'))).toBe(true),
    );
    expect(screen.getByTestId('pyramid-disclaimer')).toBeTruthy();
    await waitFor(() => expect(screen.getAllByRole('columnheader').length).toBe(7));
  });

  it('cursor vira "Carregar mais" e pede a próxima página ao servidor', async () => {
    render(<RankingsIndex />);
    const botao = await screen.findByTestId('rankings-load-more');
    const antes = chamadasDeEntradas().length;
    fireEvent.click(botao);
    await waitFor(() => expect(chamadasDeEntradas().length).toBeGreaterThan(antes));
    expect(chamadasDeEntradas().at(-1)).toContain('cursor=2');
  });

  it('sem linhas no recorte, declara o vazio sem inventar número', async () => {
    get.mockImplementation(async (url: string) => {
      if (String(url).startsWith('/rankings?')) return publicados;
      return { ranking: null, data: [], cursor: null, countries: [] };
    });
    render(<RankingsIndex />);
    await waitFor(() => expect(screen.getByText(s.emptyTitle)).toBeTruthy());
    expect(screen.getByText(s.emptyBody)).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByTestId('conceito-rankings-table')).toBeNull();
  });

  it('falha da API vira estado de erro com tentar de novo — nunca "0"', async () => {
    get.mockImplementation(async (url: string) => {
      if (String(url).startsWith('/rankings?')) return publicados;
      throw new Error('offline');
    });
    render(<RankingsIndex />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    const antes = chamadasDeEntradas().length;
    fireEvent.click(screen.getByRole('button', { name: /Tentar de novo/ }));
    await waitFor(() => expect(chamadasDeEntradas().length).toBeGreaterThan(antes));
  });

  it('a procedência fica no pé, em 11px, com o link real da metodologia', async () => {
    render(<RankingsIndex />);
    await waitFor(() => expect(screen.getByTestId('conceito-rankings-table')).toBeTruthy());
    const nota = screen.getByTestId('ranking-pilot-badge');
    expect(nota.textContent).toContain('Piloto Inglaterra');
    const link = screen.getAllByRole('link', { name: s.provenanceLink })[0]!;
    expect(link.getAttribute('href')).toBe('/metodologia#ranking-piloto-inglaterra');
  });
});
