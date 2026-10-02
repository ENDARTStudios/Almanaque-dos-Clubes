/**
 * WS-D M1a-3 — Atribuição mínima de dados geográficos por origem (ODbL/OpenStreetMap).
 *
 * ODbL exige atribuição quando dados do OpenStreetMap/Nominatim são disponibilizados.
 * Coordenadas do Wikidata (CC0) NÃO geram ODbL. Função PURA (sem I/O) — usada na camada
 * de resposta pública (clubes) para expor `attribution` de forma aditiva.
 */
export interface GeoAttribution {
  geo: string;
  source: string;
  license: string;
}

export const OSM_GEO_ATTRIBUTION: GeoAttribution = {
  geo: '© OpenStreetMap contributors (ODbL)',
  source: 'openstreetmap/nominatim',
  license: 'ODbL',
};

const OSM_SOURCES = new Set(['nominatim', 'osm', 'openstreetmap']);

/** Devolve a atribuição OSM/ODbL quando a origem da coordenada for OSM/Nominatim; senão null. */
export function geoAttributionForMetadata(metadata: unknown): GeoAttribution | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const m = metadata as Record<string, unknown>;
  const source = typeof m.coordSource === 'string' ? m.coordSource.toLowerCase() : '';
  const credit = typeof m.coordAttribution === 'string' ? m.coordAttribution : '';
  if (OSM_SOURCES.has(source) || /openstreetmap|odbl/i.test(credit)) return OSM_GEO_ATTRIBUTION;
  return null;
}
