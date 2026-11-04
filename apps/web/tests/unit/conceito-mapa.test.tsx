// @vitest-environment jsdom
/**
 * /map no conceito FICHA — quadro do mapa com dado real.
 *
 * O que estes testes travam:
 *  (a) a composição do conceito existe: FichaHead no servidor (fora daqui), filtros em três
 *      níveis, mapa à esquerda e índice à direita com contagem REAL + barra proporcional;
 *  (b) NENHUM número é inventado: país/estado/cidade saem de /clubs/countries, /clubs/states e
 *      /clubs/cities; sem coordenada o clube não é plotado e a lacuna é declarada;
 *  (c) a funcionalidade da página antiga não regrediu: seleção por clique no mapa, toggle de
 *      clubes femininos, lista acessível de clubes com os data-testid originais e atribuição;
 *  (d) estado/cidade recortam de verdade (stateCode/city), e o índice pede state=<id>.
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

// O canvas real carrega Leaflet (CSS + DOM); a composição é testada com um dublê que registra
// quantos pontos o mapa recebeu.
const { panelProps } = vi.hoisted(() => ({ panelProps: vi.fn() }));
vi.mock('@/components/conceito/mapa/MapaPanel', () => ({
  default: (props: { points: unknown[] }) => {
    panelProps(props);
    return null;
  },
}));

import MapaFicha from '@/components/conceito/mapa/MapaFicha';
import {
  barWidth,
  filterGeoFeatures,
  ufFromCode,
  withSelectedCountry,
} from '@/components/conceito/mapa/derive';
import { wsConceitoMapa } from '@/i18n/wsConceitoMapa';
import { mapPageStrings } from '@/i18n/wsMapPage';

const s = wsConceitoMapa['pt-br'];
const m = mapPageStrings['pt-br'];

afterEach(cleanup);

const COUNTRIES = {
  data: {
    totals: { countries: 2, clubsWithCountry: 900 },
    countries: [
      { code: 'BR', name: 'Brazil', clubs: 820 },
      { code: 'PT', name: 'Portugal', clubs: 80 },
    ],
  },
};

const STATES = {
  data: {
    country: 'BR',
    totals: { withState: 810, withoutState: 10, states: 3 },
    states: [
      { id: 's-sp', name: 'São Paulo', code: 'BR-SP', clubs: 78, withCity: 70 },
      { id: 's-rj', name: 'Rio de Janeiro', code: 'BR-RJ', clubs: 71, withCity: 60 },
      { id: 's-rs', name: 'Rio Grande do Sul', code: 'BR-RS', clubs: 42, withCity: 30 },
    ],
  },
};

const CITIES_COUNTRY = {
  data: {
    country: 'BR',
    totals: { withCity: 24, withoutCity: 5, cities: 4 },
    cities: [
      { name: 'São Paulo', clubs: 12 },
      { name: 'Rio de Janeiro', clubs: 7 },
      { name: 'Campinas', clubs: 3 },
      { name: 'Santos', clubs: 2 },
    ],
  },
};

const CITIES_SP = {
  data: {
    country: 'BR',
    totals: { withCity: 17, withoutCity: 2, cities: 3 },
    cities: [
      { name: 'São Paulo', clubs: 12 },
      { name: 'Campinas', clubs: 3 },
      { name: 'Santos', clubs: 2 },
    ],
  },
};

const POINTS = {
  generatedAt: '2026-11-03T00:00:00.000Z',
  rulesVersion: 'ws-c3-geo-v1',
  viewport: { country: 'BR', bbox: null, limit: 500 },
  features: [
    {
      type: 'club',
      id: 'c1',
      qid: 'Q100',
      name: 'Clube Paulista',
      city: 'São Paulo',
      state: 'SP',
      country: 'BR',
      lat: -23.55,
      lng: -46.63,
      coordSource: 'wikidata',
      attribution: null,
      stateCode: 'BR-SP',
      stateFlagUrl: null,
    },
    {
      type: 'club',
      id: 'c2',
      qid: null,
      name: 'Clube Carioca',
      city: 'Rio de Janeiro',
      state: 'RJ',
      country: 'BR',
      lat: -22.9,
      lng: -43.2,
      coordSource: 'wikidata',
      attribution: null,
      stateCode: 'BR-RJ',
      stateFlagUrl: null,
    },
  ],
  withoutLocation: { available: true, count: 7 },
  attributions: { osm: 'OSM', wikidata: 'Wikidata CC0', naturalEarth: 'NE', rsssf: 'RSSSF' },
  limitations: ['clubs_without_coordinates_are_not_plotted'],
};

function defaultGet(url: string) {
  const u = String(url);
  if (u.startsWith('/clubs/countries')) return Promise.resolve(COUNTRIES);
  if (u.startsWith('/clubs/states')) return Promise.resolve(STATES);
  if (u.startsWith('/clubs/cities')) {
    return Promise.resolve(u.includes('state=s-sp') ? CITIES_SP : CITIES_COUNTRY);
  }
  if (u.startsWith('/geo/points')) return Promise.resolve(POINTS);
  return Promise.reject(new Error('URL inesperada no teste: ' + u));
}

beforeEach(() => {
  get.mockImplementation(defaultGet);
  panelProps.mockClear();
});

const urls = () => get.mock.calls.map(([url]) => String(url));

async function renderLoaded() {
  render(<MapaFicha />);
  await waitFor(() => expect(screen.getByTestId('mapa-estados-titulo')).toBeTruthy());
}

describe('derive — regras puras da tela', () => {
  it('UF sai do ISO 3166-2, e código sem hífen continua legível', () => {
    expect(ufFromCode('BR-SP')).toBe('SP');
    expect(ufFromCode('US-CA')).toBe('CA');
    expect(ufFromCode('CA')).toBe('CA');
    expect(ufFromCode(null)).toBe('—');
  });

  it('barra é proporcional ao maior da lista e tem piso para não sumir', () => {
    expect(barWidth(78, 78)).toBe(100);
    expect(barWidth(71, 78)).toBe(91);
    expect(barWidth(1, 10_000)).toBe(3);
    expect(barWidth(0, 78)).toBe(0);
    expect(barWidth(5, 0)).toBe(0);
  });

  it('o recorte do mapa casa por stateCode/city (nunca por nome de estado solto)', () => {
    const features = POINTS.features;
    expect(filterGeoFeatures(features, { stateCode: 'BR-SP', city: null })).toHaveLength(1);
    expect(filterGeoFeatures(features, { stateCode: null, city: 'São Paulo' })).toHaveLength(1);
    expect(filterGeoFeatures(features, { stateCode: 'BR-SP', city: 'Campinas' })).toHaveLength(0);
    // Sem recorte devolve a MESMA lista (não cria um mapa vazio por engano).
    expect(filterGeoFeatures(features, { stateCode: null, city: null })).toBe(features);
  });

  it('o país selecionado sempre aparece no seletor, mesmo sem índice', () => {
    const options = withSelectedCountry([{ code: 'PT', clubs: 80 }], 'BR');
    expect(options[0]).toEqual({ code: 'BR', clubs: null });
    expect(options).toHaveLength(2);
    expect(withSelectedCountry(options, 'BR')).toBe(options);
  });
});

describe('MapaFicha — a composição do conceito com dado real', () => {
  it('monta índice de estados com contagem real e barra proporcional', async () => {
    await renderLoaded();
    expect(screen.getByTestId('mapa-estados-titulo').textContent).toBe('Estados · 3 · Brasil');
    const linhas = screen.getAllByTestId('mapa-estado-linha');
    expect(linhas).toHaveLength(3);
    expect(linhas[0]!.textContent).toContain('SP');
    expect(linhas[0]!.textContent).toContain('São Paulo');
    expect(linhas[0]!.textContent).toContain('78');

    // A barra usa o maior da LISTA como 100%: 78 → 100%, 71 → 91%.
    const barras = screen.getAllByTestId('mapa-barra-intensidade');
    expect(barras[0]!.firstElementChild!.getAttribute('style')).toContain('width: 100%');
    expect(barras[1]!.firstElementChild!.getAttribute('style')).toContain('width: 91%');
    // O número é texto real e tabular — a barra é comparação, não o dado.
    expect(screen.getAllByTestId('mapa-estado-contagem')[0]!.className).toContain('tabular-nums');
  });

  it('a coluna de cidades mostra o país inteiro quando nenhum estado está selecionado', async () => {
    await renderLoaded();
    expect(screen.getByTestId('mapa-cidades-titulo').textContent).toBe('Cidades · 4 · Brasil');
    const cidades = screen.getAllByTestId('mapa-cidade-linha');
    expect(cidades).toHaveLength(4);
    expect(cidades[0]!.textContent).toContain('São Paulo');
    expect(cidades[0]!.textContent).toContain('12 clubes');
  });

  it('os três filtros trazem o dado real do acervo, sem contagem inventada', async () => {
    await renderLoaded();
    const pais = screen.getByTestId('mapa-filtro-pais') as HTMLSelectElement;
    expect([...pais.options].map((o) => o.textContent)).toEqual([
      'Brasil (BR) · 820',
      'Portugal (PT) · 80',
    ]);
    const estado = screen.getByTestId('mapa-filtro-estado') as HTMLSelectElement;
    expect([...estado.options].map((o) => o.textContent)).toEqual([
      'Todos os estados',
      'SP · São Paulo (78)',
      'RJ · Rio de Janeiro (71)',
      'RS · Rio Grande do Sul (42)',
    ]);
    const cidade = screen.getByTestId('mapa-filtro-cidade') as HTMLSelectElement;
    expect([...cidade.options].map((o) => o.textContent)).toEqual([
      'Todas as cidades',
      'São Paulo (12)',
      'Rio de Janeiro (7)',
      'Campinas (3)',
      'Santos (2)',
    ]);
    expect(screen.getByTestId('geo-women-toggle')).toBeTruthy();
  });

  it('selecionar estado pede o índice daquele estado e recorta mapa + lista', async () => {
    await renderLoaded();
    fireEvent.change(screen.getByTestId('mapa-filtro-estado'), { target: { value: 's-sp' } });

    await waitFor(() =>
      expect(screen.getByTestId('mapa-cidades-titulo').textContent).toBe(
        'Cidades em São Paulo · 3',
      ),
    );
    expect(urls().some((u) => u.startsWith('/clubs/cities') && u.includes('state=s-sp'))).toBe(
      true,
    );
    // O mapa recebeu só o clube do estado escolhido, e a lista também.
    expect((panelProps.mock.calls.at(-1)?.[0] as { points: unknown[] }).points).toHaveLength(1);
    expect(screen.getAllByTestId('geo-list-item')).toHaveLength(1);
    // A contagem do recorte é a do recorte — não a do país disfarçada.
    expect(screen.getByText('1 no recorte · 2 no país com coordenada')).toBeTruthy();
    const linhaSp = screen
      .getAllByTestId('mapa-estado-linha')
      .find((el) => el.getAttribute('aria-pressed') === 'true');
    expect(linhaSp?.textContent).toContain('São Paulo');
  });

  it('selecionar cidade recorta a lista de clubes por city', async () => {
    await renderLoaded();
    fireEvent.change(screen.getByTestId('mapa-filtro-cidade'), {
      target: { value: 'São Paulo' },
    });
    await waitFor(() => expect(screen.getAllByTestId('geo-list-item')).toHaveLength(1));
    expect(screen.getByTestId('geo-list-item').textContent).toContain('Clube Paulista');
    const linhaCidade = screen
      .getAllByTestId('mapa-cidade-linha')
      .find((el) => el.getAttribute('aria-pressed') === 'true');
    expect(linhaCidade?.textContent).toContain('São Paulo');
  });

  it('o toggle de clubes femininos continua consultando /geo/points com gender=women', async () => {
    await renderLoaded();
    fireEvent.click(screen.getByTestId('geo-women-toggle'));
    await waitFor(() =>
      expect(urls().some((u) => u.startsWith('/geo/points') && u.includes('gender=women'))).toBe(
        true,
      ),
    );
    expect(screen.getByText(s.archiveIndexNoteWomen, { exact: false })).toBeTruthy();
  });

  it('preserva a lista acessível de clubes, o contador do país e a atribuição', async () => {
    await renderLoaded();
    expect(screen.getByTestId('geo-list')).toBeTruthy();
    expect(screen.getByTestId('geo-state-groups')).toBeTruthy();
    expect(screen.getAllByTestId('geo-list-item')).toHaveLength(2);
    // 2 com coordenada · 7 sem — o segundo número é a lacuna declarada.
    expect(screen.getByText('2 com coordenada · 7 sem localização')).toBeTruthy();
    const semLocal = screen.getByTestId('geo-without-location');
    expect(semLocal.textContent).toContain('7');
    // Atribuição por camada continua visível (ODbL), e a nota de proveniência fica no pé.
    expect(screen.getByText(m.tiles)).toBeTruthy();
    expect(screen.getByTestId('mapa-source-note').textContent).toContain('Contagens derivadas');
    expect(screen.getByText(s.gapNote)).toBeTruthy();
  });

  it('o seletor de país não inventa contagem quando /clubs/countries falha', async () => {
    get.mockImplementation(async (url: string) => {
      const u = String(url);
      if (u.startsWith('/clubs/countries')) throw new Error('offline');
      return defaultGet(url);
    });
    await renderLoaded();
    const pais = screen.getByTestId('mapa-filtro-pais') as HTMLSelectElement;
    expect([...pais.options].map((o) => o.textContent)).toEqual(['Brasil (BR)']);
  });

  it('índice de estados com erro vira alerta com tentar de novo — nunca lista vazia', async () => {
    let falhas = 0;
    get.mockImplementation(async (url: string) => {
      const u = String(url);
      if (u.startsWith('/clubs/states')) {
        falhas += 1;
        if (falhas === 1) throw new Error('offline');
      }
      return defaultGet(url);
    });
    render(<MapaFicha />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain(s.statesError));
    fireEvent.click(screen.getByTestId('mapa-indice-retry'));
    await waitFor(() =>
      expect(screen.getByTestId('mapa-estados-titulo').textContent).toBe('Estados · 3 · Brasil'),
    );
    expect(falhas).toBeGreaterThan(1);
  });

  it('sem estado no acervo, declara o vazio em vez de desenhar índice falso', async () => {
    get.mockImplementation(async (url: string) => {
      const u = String(url);
      if (u.startsWith('/clubs/states')) {
        return {
          data: {
            country: 'BR',
            totals: { withState: 0, withoutState: 820, states: 0 },
            states: [],
          },
        };
      }
      return defaultGet(url);
    });
    render(<MapaFicha />);
    await waitFor(() => expect(screen.getByText(s.statesEmptyTitle)).toBeTruthy());
    expect(screen.getByText(s.statesEmptyBody)).toBeTruthy();
    expect(screen.queryByTestId('mapa-estados-lista')).toBeNull();
  });

  it('sem clube com coordenada, o mapa fica vazio mas o acervo não vira "0"', async () => {
    get.mockImplementation(async (url: string) => {
      const u = String(url);
      if (u.startsWith('/geo/points')) {
        return { ...POINTS, features: [], withoutLocation: { available: true, count: 12 } };
      }
      return defaultGet(url);
    });
    render(<MapaFicha />);
    await waitFor(() => expect(screen.getByText(m.noPoints)).toBeTruthy());
    expect(screen.getByTestId('geo-without-location').textContent).toContain('12');
    expect((panelProps.mock.calls.at(-1)?.[0] as { points: unknown[] }).points).toHaveLength(0);
    // O índice lateral continua contando o acervo (o mapa não é o acervo).
    expect(screen.getByTestId('mapa-estados-titulo').textContent).toBe('Estados · 3 · Brasil');
  });
});
