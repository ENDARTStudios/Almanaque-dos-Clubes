/**
 * WS-C-3 FASE 1 (protótipo local/off) — parser/normalizador PURO de GeoJSON.
 *
 * Suporta apenas **GeoJSON** (é o formato que já temos localmente: Natural Earth
 * `public/geo/ne_110m_admin_0_countries.geojson`, domínio público). **TopoJSON não é
 * suportado nesta fase** (decodificação de arcos) — declarado explicitamente, sem inventar.
 *
 * Sem React/Next, sem rede, sem UI.
 */

export interface GeoFeature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: { type: string; coordinates: unknown } | null;
}

export interface NormalizedCountry {
  /** ISO 3166-1 alpha-2 (quando disponível na fonte). */
  iso2: string | null;
  /** ISO 3166-1 alpha-3 (quando disponível). */
  iso3: string | null;
  name: string | null;
}

const ISO2_KEYS = ['iso_a2', 'ISO_A2', 'ISO2', 'iso2'];
const ISO3_KEYS = ['iso_a3', 'ISO_A3', 'ADM0_A3', 'ISO3', 'iso3'];
const NAME_KEYS = ['NAME', 'name', 'NAME_PT', 'ADMIN'];

function pick(props: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = props[k];
    if (typeof v === 'string' && v.trim() !== '' && v !== '-99') return v;
  }
  return null;
}

/** Extrai o ISO alpha-2 (ou cai para alpha-3) das propriedades da feature. */
export function countryIso(properties: Record<string, unknown>): string | null {
  return pick(properties, ISO2_KEYS) ?? pick(properties, ISO3_KEYS);
}

export function normalizeCountry(feature: GeoFeature): NormalizedCountry {
  return {
    iso2: pick(feature.properties, ISO2_KEYS),
    iso3: pick(feature.properties, ISO3_KEYS),
    name: pick(feature.properties, NAME_KEYS),
  };
}

/** Valida e normaliza um GeoJSON FeatureCollection. Lança em shape inesperado/TopoJSON. */
export function parseGeoJson(input: unknown): GeoFeature[] {
  if (!input || typeof input !== 'object') throw new Error('GeoJSON inválido: não é objeto.');
  const obj = input as { type?: unknown; features?: unknown };
  if (obj.type === 'Topology') {
    throw new Error('TopoJSON não suportado nesta fase (use GeoJSON).');
  }
  if (obj.type !== 'FeatureCollection' || !Array.isArray(obj.features)) {
    throw new Error('GeoJSON inválido: esperado FeatureCollection.features[].');
  }
  return (obj.features as unknown[])
    .filter((f): f is GeoFeature => {
      return (
        !!f &&
        typeof f === 'object' &&
        (f as { type?: unknown }).type === 'Feature' &&
        typeof (f as { properties?: unknown }).properties === 'object'
      );
    })
    .map((f) => ({
      type: 'Feature' as const,
      properties: f.properties,
      geometry: f.geometry ?? null,
    }));
}

/** Normaliza todas as features de países (ISO/name) — ordem preservada. */
export function normalizeCountries(input: unknown): NormalizedCountry[] {
  return parseGeoJson(input).map(normalizeCountry);
}
