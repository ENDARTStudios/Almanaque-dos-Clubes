/**
 * WS-C-1 — Rotas de busca global (READ-ONLY).
 */
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { globalSearch } from './global-search.service.js';

type SearchType = 'all' | 'club' | 'competition' | 'player';

export const searchRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  /**
   * GET /search/global?q=&type=&country=&limit=&offset=
   * Busca tipada de clubes/competições. `q` obrigatório (400 se ausente/vazio).
   */
  app.get('/search/global', async (request, reply) => {
    const query = (request.query as Record<string, string | undefined>) ?? {};
    const q = (query.q ?? '').trim();
    if (!q) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Parâmetro "q" é obrigatório.' },
      });
    }

    const type = query.type;
    if (type && type !== 'all' && type !== 'club' && type !== 'competition' && type !== 'player') {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Parâmetro "type" inválido (use all|club|competition|player).',
        },
      });
    }

    const limit = Number.parseInt(query.limit ?? '', 10);
    const offset = Number.parseInt(query.offset ?? '', 10);

    const genderRaw = query.gender;
    if (genderRaw && genderRaw !== 'men' && genderRaw !== 'women') {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Parâmetro "gender" inválido (use men|women).',
        },
      });
    }

    const data = await globalSearch({
      q,
      type: (type as SearchType | undefined) ?? 'all',
      country: query.country,
      gender: (genderRaw as 'men' | 'women' | undefined) ?? undefined,
      limit: Number.isFinite(limit) ? limit : undefined,
      offset: Number.isFinite(offset) ? offset : undefined,
    });
    return reply.send(data);
  });
};
