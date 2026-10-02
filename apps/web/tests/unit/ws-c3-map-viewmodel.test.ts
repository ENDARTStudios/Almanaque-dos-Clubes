import { describe, it, expect } from 'vitest';
import { buildMapViewModel, type GeoPointsResponseDto } from '@/lib/map-viewmodel';

// WS-C-3 FASE 3 — ViewModel puro (regras de render do mapa interno).

const resp: GeoPointsResponseDto = {
  generatedAt: '2026-09-29T00:00:00.000Z',
  rulesVersion: 'ws-c3-geo-v1',
  viewport: { country: 'BR', bbox: null, limit: 200 },
  features: [
    {
      type: 'club',
      id: 'a',
      qid: 'Q1',
      name: 'OSM FC',
      city: 'SP',
      state: 'SP',
      country: 'BR',
      lat: -23.5,
      lng: -46.6,
      coordSource: 'nominatim',
      attribution: {
        geo: '© OpenStreetMap contributors (ODbL)',
        source: 'openstreetmap/nominatim',
        license: 'ODbL',
      },
    },
    {
      type: 'club',
      id: 'b',
      qid: 'Q2',
      name: 'Wiki FC',
      city: 'POA',
      state: 'RS',
      country: 'BR',
      lat: -30,
      lng: -51,
      coordSource: 'P115_P131',
      attribution: null,
    },
    {
      type: 'club',
      id: 'c',
      qid: 'Q3',
      name: 'OSM FC',
      city: 'SP',
      state: 'SP',
      country: 'BR',
      lat: -23.6,
      lng: -46.7,
      coordSource: 'osm',
      attribution: {
        geo: '© OpenStreetMap contributors (ODbL)',
        source: 'openstreetmap/nominatim',
        license: 'ODbL',
      },
    },
  ],
  withoutLocation: { available: true, count: 42 },
  attributions: {
    osm: '© OpenStreetMap contributors (ODbL)',
    wikidata: 'Wikidata CC0',
    naturalEarth: 'Natural Earth (domínio público)',
    rsssf: 'RSSSF...',
  },
  limitations: ['clubs_without_coordinates_are_not_plotted', 'map_ui_not_public_yet'],
};

describe('buildMapViewModel', () => {
  it('mapeia pontos, resolve fonte e preserva homônimos (não colapsa)', () => {
    const vm = buildMapViewModel(resp);
    expect(vm.points).toHaveLength(3);
    const homonyms = vm.points.filter((p) => p.name === 'OSM FC');
    expect(homonyms).toHaveLength(2);
    expect(new Set(homonyms.map((h) => h.id)).size).toBe(2);
    expect(vm.points.find((p) => p.id === 'a')?.source).toBe('osm');
    expect(vm.points.find((p) => p.id === 'b')?.source).toBe('wikidata');
  });

  it('expõe attribution por camada (OSM) e sem-localização', () => {
    const vm = buildMapViewModel(resp);
    expect(vm.attributionsBySource.map((a) => a.source).sort()).toEqual(['osm', 'wikidata']);
    expect(vm.attributionsBySource.find((a) => a.source === 'osm')?.license).toBe('ODbL');
    expect(vm.attributionsBySource.find((a) => a.source === 'wikidata')?.license).toBe('CC0');
    expect(vm.withoutLocationCount).toBe(42);
    expect(vm.limitations).toContain('clubs_without_coordinates_are_not_plotted');
    expect(vm.rulesVersion).toBe('ws-c3-geo-v1');
  });

  it('clusters somam só os plotáveis e respeitam o teto', () => {
    const vm = buildMapViewModel(resp);
    expect(vm.clusters.reduce((s, c) => s + c.count, 0)).toBe(3);
    expect(buildMapViewModel(resp, { max: 1 }).clusters).toHaveLength(1);
  });

  it('resposta vazia → sem pontos/clusters, sem-localização preservada', () => {
    const vm = buildMapViewModel({ ...resp, features: [] });
    expect(vm.points).toHaveLength(0);
    expect(vm.clusters).toHaveLength(0);
    expect(vm.withoutLocationCount).toBe(42);
  });
});

describe('buildMapViewModel — estados degradados (FASE 4)', () => {
  const base = {
    type: 'club' as const,
    qid: 'Q',
    name: 'X',
    city: null,
    state: null,
    country: 'BR',
    lat: 0,
    lng: 0,
  };

  it('OSM sem attribution → NÃO plota; marca missing_attribution', () => {
    const vm = buildMapViewModel({
      ...resp,
      features: [{ ...base, id: 'x', coordSource: 'nominatim', attribution: null }],
    });
    expect(vm.clusters).toHaveLength(0);
    expect(vm.degradedPoints).toHaveLength(1);
    expect(vm.degradedPoints[0].reason).toBe('missing_attribution');
  });

  it('origem desconhecida → NÃO plota; marca unknown_source', () => {
    const vm = buildMapViewModel({
      ...resp,
      features: [{ ...base, id: 'y', coordSource: 'algo-estranho', attribution: null }],
    });
    expect(vm.clusters).toHaveLength(0);
    expect(vm.degradedPoints[0].reason).toBe('unknown_source');
  });

  it('Wikidata sem attribution → plota (CC0 é a proveniência)', () => {
    const vm = buildMapViewModel({
      ...resp,
      features: [{ ...base, id: 'z', coordSource: 'P115_P131', attribution: null }],
    });
    expect(vm.degradedPoints).toHaveLength(0);
    expect(vm.clusters.reduce((s, c) => s + c.count, 0)).toBe(1);
    expect(vm.attributionsBySource.find((a) => a.source === 'wikidata')?.license).toBe('CC0');
  });
});
