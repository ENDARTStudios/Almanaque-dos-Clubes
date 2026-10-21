// @vitest-environment jsdom
/**
 * `CityDrilldown` — hierarquia país → ESTADO → cidade (T595).
 *
 * ── O QUE ESTES TESTES PROTEGEM ─────────────────────────────────────────────────────────
 * O componente pulava o nível de estado porque `stateId` cobria 1 em 100 clubes. Depois dos bots
 * A/B/C (T588/589/590) cobre 2.815, e o nível intermediário passou a existir.
 *
 * Três decisões aprendidas com o Operador continuam valendo na nova estrutura:
 *   1. NÃO esconder dado por cobertura (o limiar de 60% do T563 SUPRIMIA dado — o Operador
 *      relatou "apenas algumas cidades aparecem ao clicar no país");
 *   2. NÃO cortar a lista (lista longa é razão para busca, não para ocultar);
 *   3. DECLARAR a lacuna em vez de renderizar lista vazia.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';

vi.mock('@/i18n/Provider', () => ({
  useI18n: () => ({
    locale: 'pt-br' as const,
    t: (k: string) =>
      (
        ({
          'pages.byCountry.clubs': 'clubes',
          'pages.byCountry.statesTitle': 'Estados',
          'pages.byCountry.statesLabel': 'Estados do país',
          'pages.byCountry.statesCoverage': '{com} de {total} clubes com estado ({pct}%)',
          'pages.byCountry.statesFilter': 'Filtrar estados',
          'pages.byCountry.statesEmpty': 'Nenhum estado corresponde ao filtro.',
          'pages.byCountry.statesGapNone': 'Nenhum clube tem estado ({n} sem estado).',
          'pages.byCountry.citiesLabel': 'Cidades do estado',
          'pages.byCountry.citiesInState': 'Cidades em {state} · {n}',
          'pages.byCountry.citiesInStateNone': '{state} ainda não tem cidade catalogada.',
          'pages.byCountry.citiesFilter': 'Filtrar cidades',
          'pages.byCountry.citiesEmpty': 'Nenhuma cidade corresponde ao filtro.',
          'pages.byCountry.citiesLoadError': 'Não foi possível carregar.',
        }) as Record<string, string>
      )[k] ?? k,
  }),
}));

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { get } }));
vi.mock('@/hooks/useGsap', () => ({ useGsapStagger: () => {} }));

import CityDrilldown from '@/components/CityDrilldown';

const estadosBR = {
  data: {
    country: 'BR',
    totals: { withState: 463, withoutState: 367, states: 2 },
    states: [
      { id: 'st-sp', name: 'São Paulo', code: 'BR-SP', clubs: 78, withCity: 59 },
      { id: 'st-rj', name: 'Rio de Janeiro', code: 'BR-RJ', clubs: 71, withCity: 61 },
    ],
  },
};

const cidadesSP = {
  data: {
    country: 'BR',
    totals: { withCity: 59, withoutCity: 19, cities: 2 },
    cities: [
      { name: 'São Paulo', clubs: 12 },
      { name: 'Campinas', clubs: 4 },
    ],
  },
};

const cidadesVazias = {
  data: { country: 'BR', totals: { withCity: 0, withoutCity: 71, cities: 0 }, cities: [] },
};

/** Aquece as microtasks até o efeito assentar. */
async function assentar(ticks = 10) {
  await act(async () => {
    for (let i = 0; i < ticks; i++) await Promise.resolve();
  });
}

/** Roteia por URL, porque o componente faz DUAS chamadas distintas. */
function rotear(cidades: unknown) {
  get.mockImplementation(async (url?: string) =>
    url && url.startsWith('/clubs/cities') ? cidades : estadosBR,
  );
}

beforeEach(() => get.mockReset());
afterEach(cleanup);

describe('CityDrilldown — primeiro nível: ESTADOS', () => {
  it('lista os estados com a contagem rotulada', async () => {
    get.mockResolvedValue(estadosBR);
    render(<CityDrilldown key="BR" country="BR" />);
    await assentar();

    expect(screen.getByTestId('state-drilldown-list')).toBeTruthy();
    const sp = screen.getByTestId('state-BR-SP');
    expect(sp.textContent).toContain('São Paulo');
    expect(sp.textContent).toContain('78');
    expect(sp.textContent?.toLowerCase()).toContain('clubes');
  });

  it('busca o índice do país RECEBIDO, não de outro', async () => {
    /* Se a URL errasse o país, os números seriam de outro acervo — e ninguém notaria, porque a
       lista continuaria bem formada. */
    get.mockResolvedValue(estadosBR);
    render(<CityDrilldown key="PT" country="PT" />);
    await assentar();
    expect(get).toHaveBeenCalledWith('/clubs/states?country=PT');
  });

  it('DECLARA a cobertura de estado em vez de esconder', async () => {
    get.mockResolvedValue(estadosBR);
    render(<CityDrilldown key="BR" country="BR" />);
    await assentar();
    const parcial = screen.getByTestId('state-drilldown-partial').textContent ?? '';
    expect(parcial).toContain('463');
    expect(parcial).toContain('830'); // 463 + 367
  });

  it('país SEM estado declara a lacuna e não renderiza seletor vazio', async () => {
    get.mockResolvedValue({
      data: { country: 'XX', totals: { withState: 0, withoutState: 40, states: 0 }, states: [] },
    });
    render(<CityDrilldown key="XX" country="XX" />);
    await assentar();
    const texto = screen.getByTestId('state-drilldown-gap').textContent ?? '';
    expect(texto).toContain('40');
    expect(screen.queryByTestId('state-drilldown-list')).toBeNull();
  });
});

describe('CityDrilldown — segundo nível: CIDADES do estado', () => {
  it('só busca cidades DEPOIS de escolher um estado', async () => {
    /* Antes da escolha, pedir cidades traria a lista do país inteiro — que é exatamente o
       comportamento antigo e poluído que o Operador pediu para substituir. */
    rotear(cidadesSP);
    render(<CityDrilldown key="BR" country="BR" />);
    await assentar();
    expect(get).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.click(screen.getByTestId('state-BR-SP'));
    });
    await assentar();
    expect(get).toHaveBeenCalledWith('/clubs/cities?country=BR&state=st-sp');
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('lista as cidades com link para o filtro que a API aceita', async () => {
    rotear(cidadesSP);
    render(<CityDrilldown key="BR" country="BR" />);
    await assentar();
    await act(async () => {
      fireEvent.click(screen.getByTestId('state-BR-SP'));
    });
    await assentar();

    const cidade = screen.getByTestId('city-São Paulo');
    expect(cidade.getAttribute('href')).toBe('/clubs?country=BR&city=S%C3%A3o%20Paulo');
    expect(cidade.textContent).toContain('12');
  });

  it('estado sem cidade catalogada DECLARA, não mostra lista vazia', async () => {
    rotear(cidadesVazias);
    render(<CityDrilldown key="BR" country="BR" />);
    await assentar();
    await act(async () => {
      fireEvent.click(screen.getByTestId('state-BR-RJ'));
    });
    await assentar();

    const texto = screen.getByTestId('cities-in-state-gap').textContent ?? '';
    expect(texto).toContain('Rio de Janeiro');
    expect(screen.queryByTestId('city-drilldown-list')).toBeNull();
  });

  it('clicar o mesmo estado de novo fecha o segundo nível', async () => {
    rotear(cidadesSP);
    render(<CityDrilldown key="BR" country="BR" />);
    await assentar();
    await act(async () => {
      fireEvent.click(screen.getByTestId('state-BR-SP'));
    });
    await assentar();
    expect(screen.getByTestId('cities-in-state')).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByTestId('state-BR-SP'));
    });
    await assentar();
    expect(screen.queryByTestId('cities-in-state')).toBeNull();
  });
});

describe('CityDrilldown — as três lições do T563 continuam valendo', () => {
  it('cobertura BAIXA ainda lista (o limiar de 60% não voltou)', async () => {
    /* O limiar escondia 268 cidades brasileiras, 148 portuguesas e 154 suecas que EXISTEM na
       base. Esconder dado existente é pior que o problema que ele tentava evitar. */
    get.mockImplementation(async (url?: string) =>
      url && url.startsWith('/clubs/cities')
        ? {
            data: {
              country: 'BR',
              totals: { withCity: 20, withoutCity: 6, cities: 1 },
              cities: [{ name: 'Cidade', clubs: 9 }],
            },
          }
        : {
            data: {
              country: 'BR',
              totals: { withState: 26, withoutState: 74, states: 1 },
              states: [{ id: 's1', name: 'X', code: 'BR-X', clubs: 26, withCity: 20 }],
            },
          },
    );
    render(<CityDrilldown key="BR" country="BR" />);
    await assentar();
    await act(async () => {
      fireEvent.click(screen.getByTestId('state-BR-X'));
    });
    await assentar();
    expect(screen.getByTestId('city-Cidade')).toBeTruthy();
  });

  it('lista TODAS as cidades do estado, sem cortar em 12', async () => {
    const muitas = Array.from({ length: 40 }, (_, i) => ({ name: `C${i}`, clubs: 40 - i }));
    rotear({
      data: { country: 'BR', totals: { withCity: 95, withoutCity: 5, cities: 40 }, cities: muitas },
    });
    render(<CityDrilldown key="BR" country="BR" />);
    await assentar();
    await act(async () => {
      fireEvent.click(screen.getByTestId('state-BR-SP'));
    });
    await assentar();

    expect(screen.getAllByTestId(/^city-C\d+$/).length).toBe(40);
    // E, acima de 12, oferece busca local — organizar, não ocultar.
    expect(screen.getByTestId('city-drilldown-filter')).toBeTruthy();
  });

  it('falha ao carregar estados é declarada, sem derrubar a página', async () => {
    /* `mockRejectedValue` dispara uma UNHANDLED REJECTION: a promise nasce rejeitada antes de o
       componente ligar o `.catch`, e o vitest reprova o teste por isso — não pela asserção.
       O getter que LANÇA dentro do `.then` simula a mesma falha chegando pelo caminho real
       (a resposta existe, o dado não), e é capturado pelo `.catch` do componente. */
    get.mockImplementation(() =>
      Promise.resolve({
        get data(): never {
          throw new Error('indisponível');
        },
      }),
    );
    render(<CityDrilldown key="BR" country="BR" />);
    await assentar();
    expect(screen.getByTestId('city-drilldown-error')).toBeTruthy();
  });
});
