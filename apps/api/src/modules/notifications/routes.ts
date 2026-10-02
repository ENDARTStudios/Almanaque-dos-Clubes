import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authenticate } from '../auth/authenticate.middleware.js';
import { countUnread, listForUser, markAllRead, markRead } from './notification.service.js';

// WS-C-8 — rotas de notificações. Escrita autenticada + CSRF global +
// rate-limit por usuário (leitura 60/min, marcação 30/min).

export const notificationsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get(
    '/notifications',
    {
      preHandler: [authenticate],
      config: {
        rateLimit: { max: 60, timeWindow: '1 minute', keyGenerator: (r) => r.user?.id ?? r.ip },
      },
    },
    async (request, reply) => {
      const q = (request.query as Record<string, string | undefined>) ?? {};
      const limit = Math.min(Math.max(parseInt(q.limit ?? '20', 10) || 20, 1), 50);
      const offset = Math.max(parseInt(q.offset ?? '0', 10) || 0, 0);
      const unreadOnly = q.unreadOnly === 'true' || q.unreadOnly === '1';
      const result = await listForUser(request.user!.id, { limit, offset, unreadOnly });
      return reply.send(result);
    },
  );

  app.get(
    '/notifications/unread-count',
    {
      preHandler: [authenticate],
      config: {
        rateLimit: { max: 60, timeWindow: '1 minute', keyGenerator: (r) => r.user?.id ?? r.ip },
      },
    },
    async (request, reply) => {
      const count = await countUnread(request.user!.id);
      return reply.send({ count });
    },
  );

  app.patch(
    '/notifications/:id/read',
    {
      preHandler: [authenticate],
      config: {
        rateLimit: { max: 30, timeWindow: '1 minute', keyGenerator: (r) => r.user?.id ?? r.ip },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const marked = await markRead(id, request.user!.id);
      if (!marked) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Notificação não encontrada' },
        });
      }
      return reply.status(204).send();
    },
  );

  app.post(
    '/notifications/read-all',
    {
      preHandler: [authenticate],
      config: {
        rateLimit: { max: 30, timeWindow: '1 minute', keyGenerator: (r) => r.user?.id ?? r.ip },
      },
    },
    async (request, reply) => {
      await markAllRead(request.user!.id);
      return reply.status(204).send();
    },
  );
};
