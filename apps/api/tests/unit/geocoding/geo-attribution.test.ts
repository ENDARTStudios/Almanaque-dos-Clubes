import { describe, it, expect } from 'vitest';
import {
  geoAttributionForMetadata,
  OSM_GEO_ATTRIBUTION,
} from '../../../src/lib/geocoding/geo-attribution.js';

// WS-D M1a-3 — atribuição ODbL por origem da coordenada.

describe('geoAttributionForMetadata', () => {
  it('coordSource=nominatim → atribuição OSM/ODbL', () => {
    expect(geoAttributionForMetadata({ coordSource: 'nominatim' })).toEqual(OSM_GEO_ATTRIBUTION);
  });

  it('coordSource=osm/openstreetmap → OSM/ODbL (case-insensitive)', () => {
    expect(geoAttributionForMetadata({ coordSource: 'OSM' })).toEqual(OSM_GEO_ATTRIBUTION);
    expect(geoAttributionForMetadata({ coordSource: 'OpenStreetMap' })).toEqual(
      OSM_GEO_ATTRIBUTION,
    );
  });

  it('coordAttribution com OpenStreetMap/ODbL → OSM/ODbL', () => {
    expect(
      geoAttributionForMetadata({ coordAttribution: '© OpenStreetMap contributors (ODbL)' }),
    ).toEqual(OSM_GEO_ATTRIBUTION);
  });

  it('coordSource Wikidata → null (não mistura ODbL)', () => {
    expect(
      geoAttributionForMetadata({ coordSource: 'P115_P131', coordPrecision: 'exact' }),
    ).toBeNull();
    expect(geoAttributionForMetadata({ coordSource: 'P625_direct' })).toBeNull();
  });

  it('metadata ausente/inválido → null', () => {
    expect(geoAttributionForMetadata(null)).toBeNull();
    expect(geoAttributionForMetadata(undefined)).toBeNull();
    expect(geoAttributionForMetadata({})).toBeNull();
    expect(geoAttributionForMetadata('x')).toBeNull();
  });
});
