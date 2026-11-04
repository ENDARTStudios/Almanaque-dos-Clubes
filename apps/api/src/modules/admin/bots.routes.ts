/**
 * T-24/28 — rotas admin do MONITOR DE BOTS autônomos.
 *
 *   GET  /admin/bots              — 12 bots + resumo (running/ok/failed/staleMs).
 *   GET  /admin/bots/:id/runs     — histórico (limit 1..100, default 20).
 *   POST /admin/bots/:id/run      — enfileira uma rodada manual (`trigger=manual`).
 *
 * Mesmo trio de guardas de TODA superfície interna:
 * `[authenticate, requireRole('admin'), requireOperator]`.
 */
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authenticate, requireRole } from '../auth/authenticate.middleware.js';
import { requireOperator } from '../auth/operator.middleware.js';
import { getBot } from '../bots/registry.js';
import { listBotRuns, runBot, runsSummary } from '../bots/service.js';

function notFound(reply: import('fastify').FastifyReply) {
  return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Bot inexistente' } });
}

export const botsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  const guard = { preHandler: [authenticate, requireRole('admin'), requireOperator] };

  app.get(
    '/admin/bots',
    {
      ...guard,
      config: {
        rateLimit: { max: 60, timeWindow: '1 minute', keyGenerator: (r) => r.user?.id ?? r.ip },
      },
    },
    async (_request, reply) => {
      return reply.send({ data: await runsSummary() });
    },
  );

  app.get<{ Params: { id: string }; Querystring: { limit?: string } }>(
    '/admin/bots/:id/runs',
    {
      ...guard,
      config: {
        rateLimit: { max: 60, timeWindow: '1 minute', keyGenerator: (r) => r.user?.id ?? r.ip },
      },
    },
    async (request, reply) => {
      const bot = getBot(request.params.id);
      if (!bot) return notFound(reply);
      const parsed = Number.parseInt(request.query.limit ?? '20', 10);
      const limit = Number.isFinite(parsed) ? parsed : 20;
      return reply.send({ data: await listBotRuns(bot.id, limit) });
    },
  );

  app.post<{ Params: { id: string } }>(
    '/admin/bots/:id/run',
    {
      ...guard,
      config: {
        rateLimit: { max: 6, timeWindow: '1 minute', keyGenerator: (r) => r.user?.id ?? r.ip },
      },
    },
    async (request, reply) => {
      const bot = getBot(request.params.id);
      if (!bot) return notFound(reply);
      // Disparo manual roda em segundo plano: o lote pode levar minutos e a resposta
      // HTTP não deve pendurar. O resultado aparece em /admin/bots e no histórico.
      setImmediate(() => {
        void runBot(bot.id, 'manual').catch(() => {
          /* falha já registrada em bot_runs/bot_states pelo serviço */
        });
      });
      return reply.status(202).send({ queued: true });
    },
  );
};
