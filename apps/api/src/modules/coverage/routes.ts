/**
 * DQ-01 — GET /coverage: a matriz de cobertura como endpoint READ-ONLY.
 * Pública (sem auth) porque é a declaração de cobertura do produto — dados
 * parciais identificados como parciais é promessa pública, não interna.
 * 10/min por IP: a consulta agrega o acervo inteiro.
 */
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { buildCoverageMatrix } from './coverage.service.js';

export const coverageRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get(
    '/coverage',
    {
      config: {
        rateLimit: { max: 10, timeWindow: '1 minute', keyGenerator: (r) => r.ip },
      },
    },
    async (request, reply) => {
      try {
        const q = (request.query as Record<string, string | undefined>) ?? {};
        const pilotOnly = q.pilot === '1' || q.pilot === 'true';
        const matrix = await buildCoverageMatrix(pilotOnly);
        return reply.send({
          data: {
            generatedAt: matrix.generatedAt,
            pilotQids: matrix.pilotQids,
            rows: matrix.rows,
          },
        });
      } catch (err) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' } });
      }
    },
  );
};
