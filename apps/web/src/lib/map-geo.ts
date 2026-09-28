/**
 * WS-C-3 FASE 1 (protótipo local/off) — utilitários PUROS do mapa-múndi.
 *
 * Sem React/Next, sem rede, sem UI. Regras de honestidade geográfica:
 *  - clube sem coordenada NUNCA é plotado (vazio-honesto);
 *  - clustering determinístico (grid) para não renderizar milhares de markers crus;
 *  - limite por viewport;
 *  - atribuição por camada/fonte (ODbL/CC0/RSSSF/domínio público).
 *
 * Nada aqui é publicado: o mapa segue `noindex`/fora do nav até WS-C-3 FASE 4 (aprovação).
 */

export type GeoSource = 'osm' | 'nominatim' | 'wikidata' | 'rsssf' | 'naturalearth' | 'none';

export interface MapPoint {
  id: string;
  lat: number | null;
  lng: number | null;
  source: GeoSource;
}

export interface Bbox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface Cluster {
  key: string;
  lat: number;
  lng: number;
  count: number;
  ids: string[];
}

export interface LayerAttribution {
  label: string;
  license: string;
  url: string | null;
}

/** Máximo de markers/clusters por viewport (clustering/lazy no consumidor). */
export const MAX_MARKERS_PER_VIEWPORT = 500;

export function isValidCoordinate(lat: number | null, lng: number | null): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/** Um ponto só é plotável com coordenada válida (nunca pino falso). */
export function isPlotable(p: MapPoint): p is MapPoint & { lat: number; lng: number } {
  return isValidCoordinate(p.lat, p.lng);
}

export function filterPlotable(points: MapPoint[]): Array<MapPoint & { lat: number; lng: number }> {
  return points.filter(isPlotable);
}

export function inBbox(lat: number, lng: number, bbox: Bbox): boolean {
  return lat >= bbox.minLat && lat <= bbox.maxLat && lng >= bbox.minLng && lng <= bbox.maxLng;
}

export function bboxFilter(
  points: MapPoint[],
  bbox: Bbox,
): Array<MapPoint & { lat: number; lng: number }> {
  return filterPlotable(points).filter((p) => inBbox(p.lat, p.lng, bbox));
}

/**
 * Clustering determinístico por grade (cellSizeDeg). A ordem é estável:
 * clusters ordenados por (count desc, key asc); ids asc dentro do cluster.
 * Centróide = média; não inventa posição além dos pontos reais.
 */
export function clusterPoints(points: MapPoint[], cellSizeDeg = 1): Cluster[] {
  if (!(cellSizeDeg > 0)) throw new Error('cellSizeDeg deve ser > 0');
  const plotable = filterPlotable(points);
  const cells = new Map<string, Array<MapPoint & { lat: number; lng: number }>>();
  for (const p of plotable) {
    const r = Math.floor(p.lat / cellSizeDeg);
    const c = Math.floor(p.lng / cellSizeDeg);
    const key = `${r}:${c}`;
    const arr = cells.get(key) ?? [];
    arr.push(p);
    cells.set(key, arr);
  }
  const clusters: Cluster[] = [];
  for (const [key, arr] of cells) {
    const lat = arr.reduce((s, p) => s + p.lat, 0) / arr.length;
    const lng = arr.reduce((s, p) => s + p.lng, 0) / arr.length;
    clusters.push({
      key,
      lat,
      lng,
      count: arr.length,
      ids: arr.map((p) => p.id).sort(),
    });
  }
  clusters.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  return clusters;
}

/** Limita o número de clusters/markers renderizados por viewport (determinístico). */
export function limitPerViewport(clusters: Cluster[], max = MAX_MARKERS_PER_VIEWPORT): Cluster[] {
  return clusters.slice(0, Math.max(0, max));
}

/** Atribuição por camada/fonte — usada no painel "Fontes deste mapa". */
export function layerAttribution(source: GeoSource): LayerAttribution {
  switch (source) {
    case 'osm':
    case 'nominatim':
      return {
        label: '© OpenStreetMap contributors',
        license: 'ODbL',
        url: 'https://www.openstreetmap.org/copyright',
      };
    case 'wikidata':
      return { label: 'Wikidata', license: 'CC0', url: 'https://www.wikidata.org' };
    case 'rsssf':
      return {
        label: 'RSSSF / RSSSF Brasil',
        license: 'Atribuição ao autor (não é domínio público)',
        url: 'https://www.rsssf.org',
      };
    case 'naturalearth':
      return {
        label: 'Natural Earth',
        license: 'Domínio público',
        url: 'https://www.naturalearthdata.com',
      };
    default:
      return { label: '—', license: '—', url: null };
  }
}

/**
 * Resolve o `GeoSource` a partir do `coordSource` real do acervo (metadata.coordSource).
 * Desconhecido → 'none' (vira gap, nunca inventa atribuição).
 */
export function resolveGeoSource(coordSource: string | null | undefined): GeoSource {
  const s = (coordSource ?? '').trim().toLowerCase();
  if (s === 'nominatim' || s === 'osm' || s === 'openstreetmap') return 'osm';
  if (s === 'wikidata' || s.startsWith('p')) return 'wikidata';
  return 'none';
}

/** Clubes SEM coordenada válida — vão para a listagem alternativa (nunca viram pino). */
export function buildWithoutLocation(points: MapPoint[]): MapPoint[] {
  return points.filter((p) => !isPlotable(p));
}

export interface ViewportSelection {
  clusters: Cluster[];
  /** Total de clubes plotáveis dentro da bbox (antes do limite por viewport). */
  plottedInViewport: number;
  /** Clubes sem coordenada válida (não plotados). */
  withoutLocation: number;
}

/**
 * Seleção determinística de um viewport: filtra plotáveis na bbox, clusteriza e limita
 * ao teto por viewport. Nunca renderiza ~9k markers crus; sem coords não entram.
 */
export function selectViewport(
  points: MapPoint[],
  bbox: Bbox,
  cellSizeDeg = 1,
  max = MAX_MARKERS_PER_VIEWPORT,
): ViewportSelection {
  const inView = bboxFilter(points, bbox);
  return {
    clusters: limitPerViewport(clusterPoints(inView, cellSizeDeg), max),
    plottedInViewport: inView.length,
    withoutLocation: buildWithoutLocation(points).length,
  };
}
