/**
 * WS-C-3 FASE 2 — Contratos geo READ-ONLY para o futuro mapa (API-only).
 *
 * Expõe pontos de clube (somente com coordenada válida) com ATRIBUIÇÃO por origem, contagem de
 * clubes sem localização, e attributions por camada. NUNCA plota clube sem coordenada; identidade
 * é o QID/id (nomes não são identidade). Zero escrita, zero migration, zero schema.
 */
import { prisma } from '../../config/prisma.js';
import { cache } from '../../services/cache.js';
import {
  geoAttributionForMetadata,
  OSM_GEO_ATTRIBUTION,
} from '../../lib/geocoding/geo-attribution.js';

export const GEO_RULES_VERSION = 'ws-c3-geo-v1';
export const GEO_MAX_LIMIT = 500;
export const GEO_DEFAULT_LIMIT = 200;
const GEO_TTL_SECONDS = 300;

export interface GeoBbox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface GeoPointsQuery {
  country?: string;
  /** T450 — filtra clubes por gênero ('women' mostra só clubes femininos). */
  gender?: 'men' | 'women';
  bbox?: GeoBbox;
  limit?: number;
}

export interface GeoAttribution {
  geo: string;
  source: string;
  license: string;
}

export interface GeoFeatureItem {
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
  attribution: GeoAttribution | null;
}

export interface GeoPointsResponse {
  generatedAt: string;
  rulesVersion: string;
  viewport: { country: string | null; bbox: GeoBbox | null; limit: number };
  features: GeoFeatureItem[];
  withoutLocation: { available: boolean; count: number };
  attributions: {
    osm: string;
    wikidata: string;
    naturalEarth: string;
    rsssf: string;
  };
  limitations: string[];
}

export function clampGeoLimit(limit?: number): number {
  if (!limit || !Number.isFinite(limit)) return GEO_DEFAULT_LIMIT;
  return Math.min(Math.max(Math.trunc(limit), 1), GEO_MAX_LIMIT);
}

export function isValidCountry(iso?: string | null): boolean {
  return iso == null || /^[A-Za-z]{2}$/.test(iso);
}

export function isValidBbox(b: unknown): b is GeoBbox {
  if (!b || typeof b !== 'object') return false;
  const x = b as Record<string, unknown>;
  const nums = ['minLat', 'maxLat', 'minLng', 'maxLng'].map((k) => x[k]);
  if (!nums.every((n) => typeof n === 'number' && Number.isFinite(n))) return false;
  const [minLat, maxLat, minLng, maxLng] = nums as number[];
  return (
    minLat >= -90 &&
    maxLat <= 90 &&
    minLat <= maxLat &&
    minLng >= -180 &&
    maxLng <= 180 &&
    minLng <= maxLng
  );
}

interface ClubRow {
  id: string;
  qid: string | null;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  metadata: unknown;
}

/** Mapeia um clube (com coordenada) para uma feature com atribuição por origem. */
export function mapGeoFeature(club: ClubRow): GeoFeatureItem {
  const meta = (club.metadata as Record<string, unknown> | null) ?? {};
  const coordSource = typeof meta.coordSource === 'string' ? meta.coordSource : null;
  return {
    type: 'club',
    id: club.id,
    qid: club.qid,
    name: club.name,
    city: club.city,
    state: club.state,
    country: club.country,
    lat: club.latitude,
    lng: club.longitude,
    coordSource,
    attribution: geoAttributionForMetadata(club.metadata),
  };
}

export const GEO_ATTRIBUTIONS = {
  osm: OSM_GEO_ATTRIBUTION.geo,
  wikidata: 'Wikidata CC0',
  naturalEarth: 'Natural Earth (domínio público)',
  rsssf: 'RSSSF atribuição ao autor; não é domínio público',
} as const;

export async function getGeoPoints(query: GeoPointsQuery): Promise<GeoPointsResponse> {
  const country = query.country ? query.country.toUpperCase() : undefined;
  const gender = query.gender;
  const limit = clampGeoLimit(query.limit);
  const bbox = query.bbox;

  return cache.remember(
    `geo:points:${country ?? ''}:${gender ?? ''}:${limit}:${bbox ? JSON.stringify(bbox) : ''}`,
    GEO_TTL_SECONDS,
    async () => {
      const coordWhere = {
        deletedAt: null as null,
        qid: { not: null },
        latitude: { not: null },
        longitude: { not: null },
        ...(country ? { country } : {}),
        ...(gender ? { gender } : {}),
        ...(bbox
          ? {
              latitude: { gte: bbox.minLat, lte: bbox.maxLat },
              longitude: { gte: bbox.minLng, lte: bbox.maxLng },
            }
          : {}),
      };

      const [clubs, withoutLocation] = await Promise.all([
        prisma.club.findMany({
          where: coordWhere,
          select: {
            id: true,
            qid: true,
            name: true,
            city: true,
            state: true,
            country: true,
            latitude: true,
            longitude: true,
            metadata: true,
          },
          orderBy: { id: 'asc' },
          take: limit,
        }),
        prisma.club.count({
          where: {
            deletedAt: null,
            qid: { not: null },
            OR: [{ latitude: null }, { longitude: null }],
            ...(country ? { country } : {}),
          },
        }),
      ]);

      return {
        generatedAt: new Date().toISOString(),
        rulesVersion: GEO_RULES_VERSION,
        viewport: { country: country ?? null, bbox: bbox ?? null, limit },
        features: clubs.map((c) => mapGeoFeature(c as ClubRow)),
        withoutLocation: { available: withoutLocation > 0, count: withoutLocation },
        attributions: GEO_ATTRIBUTIONS,
        limitations: [
          'clubs_without_coordinates_are_not_plotted',
          'map_ui_not_public_yet',
          'coords_are_municipality_level_when_source_is_nominatim',
        ],
      };
    },
  );
}
