import { describe, it, expect } from 'vitest';
import {
  bboxFilter,
  clusterPoints,
  filterPlotable,
  inBbox,
  isPlotable,
  isValidCoordinate,
  layerAttribution,
  limitPerViewport,
  MAX_MARKERS_PER_VIEWPORT,
  type MapPoint,
} from '@/lib/map-geo';

// WS-C-3 FASE 1 — utilidades puras do mapa (network-free).

const p = (
  id: string,
  lat: number | null,
  lng: number | null,
  source: MapPoint['source'] = 'wikidata',
): MapPoint => ({
  id,
  lat,
  lng,
  source,
});

describe('isValidCoordinate / isPlotable', () => {
  it('rejeita nulos, NaN e fora de faixa', () => {
    expect(isValidCoordinate(null, 0)).toBe(false);
    expect(isValidCoordinate(0, null)).toBe(false);
    expect(isValidCoordinate(NaN, 0)).toBe(false);
    expect(isValidCoordinate(91, 0)).toBe(false);
    expect(isValidCoordinate(0, 181)).toBe(false);
    expect(isValidCoordinate(-23.5, -46.6)).toBe(true);
  });

  it('ponto sem coordenada NÃO é plotável (nunca pino falso)', () => {
    expect(isPlotable(p('a', null, null))).toBe(false);
    expect(isPlotable(p('b', -23.5, -46.6))).toBe(true);
  });
});

describe('filterPlotable', () => {
  it('remove não-plotáveis', () => {
    const out = filterPlotable([p('a', null, 1), p('b', 1, 2), p('c', 1, null)]);
    expect(out.map((x) => x.id)).toEqual(['b']);
  });
});

describe('bboxFilter', () => {
  const bbox = { minLat: -30, maxLat: -20, minLng: -50, maxLng: -40 };
  it('mantém só pontos dentro da bbox (sem pino falso)', () => {
    const out = bboxFilter([p('a', -23.5, -46.6), p('b', 10, 10), p('c', null, null)], bbox);
    expect(out.map((x) => x.id)).toEqual(['a']);
  });
  it('inBbox nas bordas', () => {
    expect(inBbox(-30, -50, bbox)).toBe(true);
    expect(inBbox(-20, -40, bbox)).toBe(true);
    expect(inBbox(-19.9, -40, bbox)).toBe(false);
  });
});

describe('clusterPoints', () => {
  it('agrupa por grade de forma determinística e calcula centróide', () => {
    const pts = [p('a', 0.1, 0.1), p('b', 0.2, 0.2), p('c', 5.5, 5.5)];
    const cs = clusterPoints(pts, 1);
    expect(cs).toHaveLength(2);
    const big = cs[0];
    expect(big.count).toBe(2);
    expect(big.ids).toEqual(['a', 'b']);
    expect(big.lat).toBeCloseTo(0.15);
    expect(big.lng).toBeCloseTo(0.15);
    expect(cs[1].count).toBe(1);
  });

  it('ordena por count desc, key asc; ids asc', () => {
    const cs = clusterPoints([p('z', 0, 0), p('a', 0, 0)], 1);
    expect(cs[0].ids).toEqual(['a', 'z']);
  });

  it('ignora pontos não plotáveis', () => {
    expect(clusterPoints([p('a', null, null)], 1)).toHaveLength(0);
  });

  it('cellSizeDeg inválido lança', () => {
    expect(() => clusterPoints([], 0)).toThrow();
  });
});

describe('limitPerViewport', () => {
  it('respeita o teto', () => {
    const pts = Array.from({ length: 1000 }, (_, i) => p(`c${i}`, i * 2, 0));
    const cs = clusterPoints(pts, 1);
    expect(limitPerViewport(cs, 10)).toHaveLength(10);
    expect(limitPerViewport(cs)).toHaveLength(Math.min(cs.length, MAX_MARKERS_PER_VIEWPORT));
  });
});

describe('layerAttribution', () => {
  it('OSM/Nominatim → ODbL; Wikidata → CC0; RSSSF → autor; Natural Earth → domínio público', () => {
    expect(layerAttribution('nominatim').license).toBe('ODbL');
    expect(layerAttribution('osm').license).toBe('ODbL');
    expect(layerAttribution('wikidata').license).toBe('CC0');
    expect(layerAttribution('rsssf').license).toMatch(/autor/i);
    expect(layerAttribution('naturalearth').license).toBe('Domínio público');
    expect(layerAttribution('none').url).toBeNull();
  });
});
