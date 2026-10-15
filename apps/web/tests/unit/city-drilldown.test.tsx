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
        'pages.byCountry.citiesGapPartial':
          'Cidade conhecida para {com} de {total} clubes deste país — os clubes estão listados abaixo.',
        'pages.byCountry.citiesGapNone':
          'Ainda não há cidade registrada para os clubes deste país — os {n} estão listados abaixo.',
        'pages.byCountry.citiesPartial': '{n} sem cidade registrada',
        'pages.byCountry.citiesCoverage': 'Cidade registrada para {com} de {total} clubes ({pct}%)',
        'pages.byCountry.citiesFilter': 'Filtrar cidade…',
        'pages.byCountry.citiesEmpty': 'Nenhuma cidade com esse nome.',
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
    /* T563 — o aviso passou a declarar a COBERTURA ("93 de 100"), que e mais informativo que
       "7 sem cidade": o usuario ve de quanto e o total, e nao so quanto falta. O que importa e
       que a lacuna continue DITA — se sumisse, ele somaria as cidades e concluiria errado. */
    const parcial = screen.getByTestId('city-drilldown-partial');
    expect(parcial.textContent).toContain('93');
    expect(parcial.textContent).toContain('100');
  });

  it('(c) T563 — cobertura BAIXA ainda LISTA as cidades (o limiar de 60% saiu)', async () => {
    /* O teste anterior afirmava o CONTRARIO: que cobertura < 60% nao lista. Aquela regra foi
       removida porque SUPRIMIA DADO EXISTENTE — o Operador relatou "apenas algumas cidades
       aparecem ao clicar no pais", e a causa era este limiar escondendo 268 cidades brasileiras,
       148 portuguesas e 154 suecas, que existem na base.
       O certo e MOSTRAR e DECLARAR: a cobertura vai numa linha ao lado do titulo. */
    get.mockImplementation(async () => resposta(26, 74, [['Stockholm', 9]]));
    await montar('SE');
    expect(screen.getByTestId('city-drilldown-list')).toBeTruthy();
    expect(screen.getByTestId('city-Stockholm')).toBeTruthy();
    // E a lacuna continua declarada, agora sem esconder nada.
    const cob = screen.getByTestId('city-drilldown-partial').textContent ?? '';
    expect(cob).toContain('26');
    expect(cob).toContain('100');
  });

  it('(c2) sem NENHUMA cidade, declara a lacuna e nao mostra lista vazia', async () => {
    get.mockImplementation(async () => resposta(0, 40, []));
    await montar('XX');
    const texto = screen.getByTestId('city-drilldown-gap').textContent ?? '';
    expect(texto).toContain('40');
    expect(screen.queryByTestId('city-drilldown-list')).toBeNull();
  });

  it('T563 — lista TODAS as cidades, sem cortar em 12', async () => {
    // Com 268 cidades no Brasil e 268 na Alemanha (medido), cortar em 12 escondia 256 atras de um
    // botao. A lista longa e razao para organiza-la com busca local, nao para oculta-la.
    const muitas: Array<[string, number]> = Array.from({ length: 40 }, (_, i) => [`C${i}`, 40 - i]);
    get.mockImplementation(async () => resposta(95, 5, muitas));
    await montar();
    expect(screen.getAllByTestId(/^city-C\d+$/).length).toBe(40);
    // E oferece busca local, porque 40+ cidades nao se navega rolando.
    expect(screen.getByTestId('city-drilldown-filter')).toBeTruthy();
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
