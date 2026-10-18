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
  /** T-26D — ADITIVO: código ISO 3166-2 e bandeira do State (podem ser null — gap). */
  stateCode?: string | null;
  stateFlagUrl?: string | null;
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
  /** T-26D — agrupamento por estado: nome, código ISO 3166-2 e bandeira (null = gap). */
  state: string | null;
  stateCode: string | null;
  stateFlagUrl: string | null;
}

/** T-26D — grupo de estado para a lista do mapa (ordem alfabética; sem-estado por último). */
export interface MapStateGroup {
  /** Chave estável de render (nome ou id do ponto quando sem estado). */
  key: string;
  /** Nome do estado; null = clube sem estado no acervo (grupo de lacuna declarada). */
  name: string | null;
  /** Sigla ISO 3166-2 — entra na tela quando não há bandeira. */
  code: string | null;
  flagUrl: string | null;
  clubs: MapViewModelPoint[];
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
    state: f.state ?? null,
    stateCode: f.stateCode ?? null,
    stateFlagUrl: f.stateFlagUrl ?? null,
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

/**
 * T-26D — agrupa os pontos POR ESTADO para a lista do mapa.
 *
 * Regras de honestidade e ordem:
 *  - grupo por NOME de estado (`state` do acervo); homônimos de país não colidem
 *    porque a consulta já é recortada por país;
 *  - ordem ALFABÉTICA pelo nome do estado, com `Intl.Collator` do idioma ativo —
 *    a ordem segue a leitura do usuário, não o locale do dado;
 *  - clubes SEM estado formam o último grupo com `name: null` — a UI declara a
 *    lacuna ("sem estado informado"), nunca inventa estado pela cidade;
 *  - `code`/`flagUrl` vêm do State (ISO 3166-2 + P163): sem bandeira a UI mostra
 *    a sigla; sem ambos, só o nome.
 */
export function groupByState(points: MapViewModelPoint[], locale: string): MapStateGroup[] {
  const collator = new Intl.Collator(locale);
  const groups = new Map<string, MapStateGroup>();
  for (const p of points) {
    const key = p.state ?? '__none__';
    const existing = groups.get(key);
    if (existing) {
      existing.clubs.push(p);
      // Primeiro código/bandeira não-nulo do grupo (mesmo estado, dado esparso).
      if (!existing.code && p.stateCode) existing.code = p.stateCode;
      if (!existing.flagUrl && p.stateFlagUrl) existing.flagUrl = p.stateFlagUrl;
    } else {
      groups.set(key, {
        key,
        name: p.state,
        code: p.stateCode ?? null,
        flagUrl: p.stateFlagUrl ?? null,
        clubs: [p],
      });
    }
  }
  const list = [...groups.values()];
  const named = list
    .filter((g): g is MapStateGroup & { name: string } => g.name != null)
    .sort((a, b) => collator.compare(a.name, b.name));
  const unnamed = list.filter((g) => g.name == null);
  return [...named, ...unnamed];
}
