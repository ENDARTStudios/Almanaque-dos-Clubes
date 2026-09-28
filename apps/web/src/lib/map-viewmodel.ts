/**
 * WS-C-3 FASE 3 (local/off) — ViewModel PURO da tela de mapa interna.
 * Transforma a resposta de `GET /api/v1/geo/points` em um modelo pronto para render,
 * aplicando as regras de honestidade: só plota coord válida, não colapsa homônimos,
 * expõe attribution por camada e a contagem sem-localização. Sem React/Next/rede.
 */
import {
  clusterPoints,
  layerAttribution,
  limitPerViewport,
  MAX_MARKERS_PER_VIEWPORT,
  resolveGeoSource,
  type Cluster,
  type GeoSource,
} from './map-geo';

export interface GeoAttributionDto {
  geo: string;
  source: string;
  license: string;
}

export interface GeoPointFeatureDto {
  type: 'club';
  id: string;
  qid: string | null;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  lat: number;
  lng: number;
  coordSource: string | null;
  attribution: GeoAttributionDto | null;
}

export interface GeoPointsResponseDto {
  generatedAt: string;
  rulesVersion: string;
  viewport: { country: string | null; bbox: unknown; limit: number };
  features: GeoPointFeatureDto[];
  withoutLocation: { available: boolean; count: number };
  attributions: { osm: string; wikidata: string; naturalEarth: string; rsssf: string };
  limitations: string[];
}

export interface MapViewModelPoint {
  id: string;
  qid: string | null;
  name: string;
  subtitle: string | null;
  lat: number;
  lng: number;
  source: GeoSource;
  attribution: GeoAttributionDto | null;
}

export type DegradedReason = 'missing_attribution' | 'unknown_source';

export interface MapViewModel {
  points: MapViewModelPoint[];
  /** Pontos NÃO plotados por segurança (origem desconhecida ou OSM sem atribuição). */
  degradedPoints: Array<MapViewModelPoint & { reason: DegradedReason }>;
  clusters: Cluster[];
  withoutLocationCount: number;
  attributionsBySource: Array<{ source: GeoSource; label: string; license: string }>;
  limitations: string[];
  rulesVersion: string;
}

/** Só é plotável com origem reconhecida; OSM/Nominatim EXIGE atribuição ODbL resolvida. */
function isSafelyPlottable(p: MapViewModelPoint): boolean {
  if (p.source === 'osm') return p.attribution != null;
  return p.source === 'wikidata';
}

function degradeReason(p: MapViewModelPoint): DegradedReason {
  return p.source === 'osm' && p.attribution == null ? 'missing_attribution' : 'unknown_source';
}

function subtitleOf(f: GeoPointFeatureDto): string | null {
  const s = [f.city, f.state, f.country]
    .filter((x): x is string => typeof x === 'string' && x !== '')
    .join(', ');
  return s === '' ? null : s;
}

export function buildMapViewModel(
  resp: GeoPointsResponseDto,
  opts: { cellSizeDeg?: number; max?: number } = {},
): MapViewModel {
  const points: MapViewModelPoint[] = resp.features.map((f) => ({
    id: f.id,
    qid: f.qid,
    name: f.name,
    subtitle: subtitleOf(f),
    lat: f.lat,
    lng: f.lng,
    source: resolveGeoSource(f.coordSource),
    attribution: f.attribution,
  }));

  const plottable = points.filter(isSafelyPlottable);
  const degradedPoints = points
    .filter((p) => !isSafelyPlottable(p))
    .map((p) => ({ ...p, reason: degradeReason(p) }));

  const mapPoints = plottable.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, source: p.source }));
  const clusters = limitPerViewport(
    clusterPoints(mapPoints, opts.cellSizeDeg ?? 1),
    opts.max ?? MAX_MARKERS_PER_VIEWPORT,
  );

  const sources = [...new Set(plottable.map((p) => p.source))];
  const attributionsBySource = sources.map((source) => ({ source, ...layerAttribution(source) }));

  return {
    points,
    degradedPoints,
    clusters,
    withoutLocationCount: resp.withoutLocation.count,
    attributionsBySource,
    limitations: resp.limitations,
    rulesVersion: resp.rulesVersion,
  };
}
