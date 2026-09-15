import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';
import { DomainError } from '@almanaque/domain';
import { CreateFavoriteSchema } from './schema.js';
import { favoritesService } from './service.js';
import { authenticate } from '../auth/authenticate.middleware.js';
import { notifyUser } from '../../services/websocket.js';
import { metrics } from '../../modules/observability/metrics.js';

// T439 — rotas de favoritos. Escrita autenticada + CSRF global + rate-limit
// por usuário (30/min) + eventos WS no canal do próprio usuário.

export const favoritesRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.post(
    '/favorites',
    {
      preHandler: [authenticate],
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
          keyGenerator: (request) => request.user?.id ?? request.ip,
        },
      },
    },
    async (request, reply) => {
      try {
        const userId = request.user!.id;
        const { clubId } = CreateFavoriteSchema.parse(request.body);
        const result = await favoritesService.add(userId, clubId);
        if (result.created) {
          metrics.inc('favorites_events_total', undefined);
          notifyUser(userId, 'favorite_added', { clubId, favoriteId: result.favorite.id });
        }
        return reply.status(200).send({
          data: result.favorite,
          created: result.created,
          reactivated: result.reactivated,
        });
      } catch (err) {
        return handleFavoriteError(err, reply);
      }
    },
  );

  app.delete<{ Params: { clubId: string } }>(
    '/favorites/:clubId',
    {
      preHandler: [authenticate],
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
          keyGenerator: (request) => request.user?.id ?? request.ip,
        },
      },
    },
    async (request, reply) => {
      try {
        const userId = request.user!.id;
        const clubId = request.params.clubId;
        const { removed } = await favoritesService.remove(userId, clubId);
        if (removed) {
          metrics.inc('favorites_events_total', undefined);
          notifyUser(userId, 'favorite_removed', { clubId });
        }
        return reply.send({ data: { clubId }, removed });
      } catch (err) {
        return handleFavoriteError(err, reply);
      }
    },
  );

  app.get('/favorites', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const result = await favoritesService.list(request.user!.id);
      return reply.send(result);
    } catch (err) {
      return handleFavoriteError(err, reply);
    }
  });
};

function handleFavoriteError(err: unknown, reply: import('fastify').FastifyReply) {
  if (err instanceof DomainError)
    return reply.status(err.statusCode).send({ error: { code: err.code, message: err.message } });
  if (err instanceof ZodError)
    return reply
      .status(422)
      .send({ error: { code: 'VALIDATION_ERROR', message: 'Payload inválido' } });
  return reply
    .status(500)
    .send({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' } });
}
