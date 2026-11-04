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
import { BOT_TIMEOUT_MS, listBotRuns, runsSummary } from '../bots/service.js';
import { enqueueBotRun } from '../../jobs/bots.scheduler.js';

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
      // Entra na mesma fila/worker dos agendados (trigger manual); a resposta não
      // pendura o HTTP e o resultado aparece em /admin/bots e no histórico.
      try {
        await enqueueBotRun(bot.id, 'manual', { deadline: Date.now() + BOT_TIMEOUT_MS });
      } catch {
        return reply.status(503).send({
          error: { code: 'QUEUE_UNAVAILABLE', message: 'Fila de bots indisponível' },
        });
      }
      return reply.status(202).send({ queued: true });
    },
  );
};
