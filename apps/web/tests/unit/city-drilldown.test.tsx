// @vitest-environment jsdom
/**
 * CityDrilldown — o segundo nível do agrupamento (país → cidade), e a REGRA DO LIMIAR.
 *
 * O componente tem dois comportamentos escolhidos pelo dado, e é isso que os testes fixam:
 *
 *   cobertura >= 60%  → lista as cidades, com contagem rotulada
 *   cobertura <  60%  → NÃO lista; DECLARA quantos clubes não têm cidade
 *
 * O motivo é medido: `city` cobre 93% na Alemanha e 26% na Suécia. Listar cidades de um país com
 * 26% mostraria uma lista curta e o usuário concluiria que o acervo é pequeno — quando falta é o
 * DADO. O teste (c) é o que impede alguém de "melhorar" o componente removendo o limiar.
 *
 * O limiar de 60% é uma ESCOLHA declarada, não um número medido — por isso ele está testado como
 * contrato, para que mudá-lo seja decisão consciente e não efeito colateral.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';

vi.mock('@/i18n/Provider', () => ({
  useI18n: () => ({
    locale: 'pt-br' as const,
    t: (k: string) =>
      ({
        'pages.byCountry.clubs': 'clubes',
        'pages.byCountry.citiesTitle': 'Cidades',
        'pages.byCountry.citiesLabel': 'Cidades do país',
        'pages.byCountry.citiesShowAll': 'Ver as {n} cidades',
        'pages.byCountry.citiesGapPartial':
          'Cidade conhecida para {com} de {total} clubes deste país — os clubes estão listados abaixo.',
        'pages.byCountry.citiesGapNone':
          'Ainda não há cidade registrada para os clubes deste país — os {n} estão listados abaixo.',
        'pages.byCountry.citiesPartial': '{n} sem cidade registrada',
        'pages.byCountry.citiesLoadError': 'Não foi possível carregar as cidades deste país.',
      })[k] ?? k,
  }),
}));

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { get } }));
vi.mock('@/hooks/useGsap', () => ({ useGsapStagger: () => {} }));

import CityDrilldown from '@/components/CityDrilldown';

const resposta = (withCity: number, withoutCity: number, cidades: Array<[string, number]>) => ({
  data: {
    country: 'DE',
    totals: { withCity, withoutCity, cities: cidades.length },
    cities: cidades.map(([name, clubs]) => ({ name, clubs })),
  },
});

async function montar(pais = 'DE') {
  render(<CityDrilldown key={pais} country={pais} />);
  await act(async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  });
}

beforeEach(() => get.mockReset());
afterEach(cleanup);

describe('CityDrilldown — cidades dentro do país', () => {
  it('(a) cobertura ALTA lista as cidades, com contagem rotulada', async () => {
    // 93 com cidade, 7 sem = 93% — acima do limiar.
    get.mockImplementation(async () =>
      resposta(93, 7, [
        ['München', 12],
        ['Hamburg', 8],
      ]),
    );
    await montar();
    expect(screen.getByTestId('city-drilldown-list')).toBeTruthy();
    const cidade = screen.getByTestId('city-München');
    // O link leva ao filtro que a API aceita: país E cidade.
    expect(cidade.getAttribute('href')).toBe('/clubs?country=DE&city=M%C3%BCnchen');
    expect(cidade.textContent).toContain('12');
    expect(cidade.textContent?.toLowerCase()).toContain('clubes');
  });

  it('(b) mesmo com cobertura alta, o que falta é DITO', async () => {
    get.mockImplementation(async () => resposta(93, 7, [['München', 12]]));
    await montar();
    // Nunca esconder os 7 sem cidade: se não há aviso, o usuário soma as cidades e conclui errado.
    const parcial = screen.getByTestId('city-drilldown-partial');
    expect(parcial.textContent).toContain('7');
  });

  it('(c) cobertura BAIXA não lista cidades — declara a lacuna', async () => {
    // 26 com cidade, 74 sem = 26%: o caso da Suécia, medido em produção. Listar aqui mostraria
    // uma lista curta como se fosse o acervo do país.
    get.mockImplementation(async () => resposta(26, 74, [['Stockholm', 9]]));
    await montar('SE');
    expect(screen.getByTestId('city-drilldown-gap')).toBeTruthy();
    // O ponto do teste: a lista de cidades NÃO existe.
    expect(screen.queryByTestId('city-drilldown-list')).toBeNull();
    expect(screen.queryByTestId('city-Stockholm')).toBeNull();
    // E o número da lacuna aparece, para o usuário entender por que não há agrupamento.
    const texto = screen.getByTestId('city-drilldown-gap').textContent ?? '';
    expect(texto).toContain('26');
    expect(texto).toContain('100');
  });

  it('(c2) sem NENHUMA cidade, a mensagem é a outra (e não uma lista vazia)', async () => {
    get.mockImplementation(async () => resposta(0, 40, []));
    await montar('XX');
    const texto = screen.getByTestId('city-drilldown-gap').textContent ?? '';
    expect(texto).toContain('40');
    expect(screen.queryByTestId('city-drilldown-list')).toBeNull();
  });

  it('(d) o limiar é 60%: 59% declara lacuna, 61% lista', async () => {
    // Fixa o contrato do limiar nos dois lados da fronteira. 59/100 e 61/100.
    get.mockImplementation(async () => resposta(59, 41, [['A', 1]]));
    await montar();
    expect(screen.queryByTestId('city-drilldown-list')).toBeNull();

    cleanup();
    get.mockImplementation(async () => resposta(61, 39, [['A', 1]]));
    await montar();
    expect(screen.getByTestId('city-drilldown-list')).toBeTruthy();
  });

  it('corta em 12 cidades e oferece "ver todas" só quando há mais', async () => {
    const muitas: Array<[string, number]> = Array.from({ length: 20 }, (_, i) => [`C${i}`, 20 - i]);
    get.mockImplementation(async () => resposta(95, 5, muitas));
    await montar();
    expect(screen.getByTestId('city-drilldown-show-all')).toBeTruthy();
    expect(screen.getAllByTestId(/^city-C/).length).toBe(12);
  });

  it('falha é declarada, e não derruba a lista de clubes abaixo', async () => {
    get.mockImplementation(() =>
      Promise.resolve({
        get data(): never {
          throw new Error('indisponível');
        },
      }),
    );
    await montar();
    expect(screen.getByTestId('city-drilldown-error')).toBeTruthy();
  });
});
