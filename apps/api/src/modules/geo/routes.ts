/**
 * WS-C-3 FASE 2 — Rotas geo (READ-ONLY, API-only). Nenhuma UI pública de mapa.
 */
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import {
  getGeoPoints,
  isValidBbox,
  isValidCountry,
  type GeoBbox,
  type GeoPointsQuery,
} from './geo.service.js';

function parseBbox(q: Record<string, string | undefined>): GeoBbox | undefined | 'invalid' {
  const keys = ['minLat', 'maxLat', 'minLng', 'maxLng'] as const;
  const present = keys.filter((k) => q[k] !== undefined);
  if (present.length === 0) return undefined;
  if (present.length !== keys.length) return 'invalid';
  const bbox = {
    minLat: Number(q.minLat),
    maxLat: Number(q.maxLat),
    minLng: Number(q.minLng),
    maxLng: Number(q.maxLng),
  };
  return isValidBbox(bbox) ? bbox : 'invalid';
}

export const geoRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  /**
   * GET /geo/points?country=&minLat=&maxLat=&minLng=&maxLng=&limit=
   * Pontos de clube com coordenada válida + atribuição por origem + sem-localização.
   */
  app.get('/geo/points', async (request, reply) => {
    const q = (request.query as Record<string, string | undefined>) ?? {};

    if (!isValidCountry(q.country)) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'country deve ser ISO-3166-1 alpha-2.' },
      });
    }
    const bbox = parseBbox(q);
    if (bbox === 'invalid') {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'bbox inválida: informe minLat/maxLat/minLng/maxLng numéricos e ordenados.',
        },
      });
    }
    const limitRaw = Number.parseInt(q.limit ?? '', 10);
    const query: GeoPointsQuery = {
      country: q.country,
      bbox: bbox ?? undefined,
      limit: Number.isFinite(limitRaw) ? limitRaw : undefined,
    };
    return reply.send(await getGeoPoints(query));
  });
};
