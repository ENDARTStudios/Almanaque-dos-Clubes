import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getLegendsSummary } from './service.js';

/**
 * GET /api/v1/legends — resumo do hall da fama (público, cache 300s).
 * Mesmo contrato de erro das rotas irmãs (champions/graph).
 */
export const legendsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get('/legends', async (_request, reply) => {
    try {
      return reply.send(await getLegendsSummary());
    } catch {
      return reply
        .status(500)
        .send({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' } });
    }
  });
};
