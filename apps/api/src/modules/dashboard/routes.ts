/**
 * WS-C-14 — rotas do dashboard do usuário (dados agregados read-only).
 * GET /dashboard — 30/min por usuário. Zero escrita em rankings.
 */
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authenticate } from '../auth/authenticate.middleware.js';
import { getDashboard } from './dashboard.service.js';

export const dashboardRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get(
    '/dashboard',
    {
      preHandler: [authenticate],
      config: {
        rateLimit: { max: 30, timeWindow: '1 minute', keyGenerator: (r) => r.user?.id ?? r.ip },
      },
    },
    async (request, reply) => {
      try {
        const data = await getDashboard(request.user!.id);
        return reply.send({ data });
      } catch (err) {
        if ((err as { code?: string }).code === 'P2025') {
          return reply
            .status(404)
            .send({ error: { code: 'NOT_FOUND', message: 'Usuário não encontrado' } });
        }
        return reply
          .status(500)
          .send({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' } });
      }
    },
  );

  /** WS-C-14 — atividade detalhada: PREPARADO mas DESATIVADO até WS-L. */
  app.get('/dashboard/activity', async (_request, reply) => {
    if (env.userTrackingEnabled !== true) {
      return reply.status(404).send({
        error: {
          code: 'TRACKING_DISABLED',
          message:
            'Tracking de atividade desativado até a publicação das políticas de cookies (WS-L).',
        },
      });
    }
    return reply.status(200).send({
      data: { pageViews: 0, searches: 0, topClubs: [], topCompetitions: [], recentSearches: [] },
    });
  });
};

import { env } from '../../config/env.js';
