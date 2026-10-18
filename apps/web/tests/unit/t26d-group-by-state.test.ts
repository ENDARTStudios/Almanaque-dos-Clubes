import { describe, it, expect } from 'vitest';
import { buildMapViewModel, groupByState, type GeoPointsResponseDto } from '@/lib/map-viewmodel';

// T-26D — agrupamento POR ESTADO da lista do mapa: ordem alfabética do idioma ativo,
// grupo de lacuna (sem estado) por último, sigla/bandeira carregadas do State.

const feature = (
  id: string,
  state: string | null,
  extra: Partial<{ stateCode: string | null; stateFlagUrl: string | null }> = {},
) => ({
  type: 'club' as const,
  id,
  qid: null,
  name: `FC ${id}`,
  city: null,
  state,
  country: 'BR',
  lat: -10,
  lng: -40,
  coordSource: 'wikidata',
  attribution: null,
  ...extra,
});

const resp = (features: ReturnType<typeof feature>[]): GeoPointsResponseDto => ({
  generatedAt: '2026-10-17T00:00:00.000Z',
  rulesVersion: 'ws-c3-geo-v1',
  viewport: { country: 'BR', bbox: null, limit: 200 },
  features,
  withoutLocation: { available: false, count: 0 },
  attributions: {
    osm: '© OpenStreetMap contributors (ODbL)',
    wikidata: 'Wikidata CC0',
    naturalEarth: 'Natural Earth',
    rsssf: 'RSSSF',
  },
  limitations: [],
});

describe('groupByState (T-26D)', () => {
  it('agrupa por estado em ordem alfabética (locale ativo) e soma clubes', () => {
    const vm = buildMapViewModel(
      resp([feature('a', 'São Paulo'), feature('b', 'Amazonas'), feature('c', 'São Paulo')]),
    );
    const groups = groupByState(vm.points, 'pt-BR');
    expect(groups.map((g) => g.name)).toEqual(['Amazonas', 'São Paulo']);
    expect(groups[1].clubs).toHaveLength(2);
  });

  it('clubes sem estado formam UM único grupo de lacuna, por último', () => {
    const vm = buildMapViewModel(
      resp([feature('x', null), feature('y', 'Bahia'), feature('z', null)]),
    );
    const groups = groupByState(vm.points, 'pt-BR');
    expect(groups).toHaveLength(2);
    expect(groups[0].name).toBe('Bahia');
    expect(groups[1].name).toBeNull();
    expect(groups[1].clubs.map((c) => c.id).sort()).toEqual(['x', 'z']);
  });

  it('carrega sigla e bandeira do primeiro valor não-nulo do grupo', () => {
    const vm = buildMapViewModel(
      resp([
        feature('a', 'Minas Gerais', { stateCode: 'BR-MG', stateFlagUrl: null }),
        feature('b', 'Minas Gerais', { stateCode: null, stateFlagUrl: 'https://commons/x.png' }),
      ]),
    );
    const [g] = groupByState(vm.points, 'pt-BR');
    expect(g?.code).toBe('BR-MG');
    expect(g?.flagUrl).toBe('https://commons/x.png');
  });

  it('estado sem sigla/bandeira na API → grupo só com o nome (gap honesto)', () => {
    const vm = buildMapViewModel(resp([feature('a', 'Cundinamarca')]));
    const [g] = groupByState(vm.points, 'es-ES');
    expect(g?.name).toBe('Cundinamarca');
    expect(g?.code).toBeNull();
    expect(g?.flagUrl).toBeNull();
  });
});
