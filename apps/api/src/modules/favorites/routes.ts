import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';
import { DomainError } from '@almanaque/domain';
import { CreateFavoriteSchema, CreateTargetFavoriteSchema } from './schema.js';
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
        // WS-C-12 — payload legado {clubId} OU polymorphic {targetType,targetId}.
        const legacy = CreateFavoriteSchema.safeParse(request.body);
        const modern = CreateTargetFavoriteSchema.safeParse(request.body);
        if (!legacy.success && !modern.success) {
          throw legacy.error;
        }
        const legacyResult = async () => {
          const targetId = legacy.data!.clubId;
          const r = await favoritesService.add(userId, targetId);
          return { ...r, favorite: r.favorite, targetType: 'club' as const, targetId };
        };
        const modernResult = async () => {
          const { targetType, targetId } = modern.data!;
          const r = await favoritesService.addTarget(userId, targetType, targetId);
          return { ...r, targetType, targetId };
        };
        const result = await (legacy.success ? legacyResult() : modernResult());
        if (result.created) {
          metrics.inc('favorites_events_total', undefined);
          notifyUser(userId, 'favorite_added', {
            targetType: result.targetType,
            targetId: result.targetId,
            favoriteId: result.favorite.id,
          });
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

  // WS-C-12 — remove por alvo genérico.
  app.delete<{ Params: { targetType: string; targetId: string } }>(
    '/favorites/:targetType/:targetId',
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
        const { targetType, targetId } = request.params;
        if (targetType !== 'club' && targetType !== 'player' && targetType !== 'competition') {
          return reply.status(400).send({
            error: { code: 'VALIDATION_ERROR', message: 'targetType inválido' },
          });
        }
        const { removed } = await favoritesService.removeTarget(userId, targetType, targetId);
        if (removed) {
          metrics.inc('favorites_events_total', undefined);
          notifyUser(userId, 'favorite_removed', { targetType, targetId });
        }
        return reply.status(204).send();
      } catch (err) {
        return handleFavoriteError(err, reply);
      }
    },
  );

  /**
   * WS-C-12 — contagem PÚBLICA por alvo (SECURITY DEFINER favorites_count;
   * sem auth, sem exposição de linhas de usuários).
   */
  app.get<{ Params: { targetType: string; targetId: string } }>(
    '/favorites/count/:targetType/:targetId',
    async (request, reply) => {
      try {
        const { targetType, targetId } = request.params;
        if (targetType !== 'club' && targetType !== 'player' && targetType !== 'competition') {
          return reply.status(400).send({
            error: { code: 'VALIDATION_ERROR', message: 'targetType inválido' },
          });
        }
        const count = await favoritesService.countTarget(targetType, targetId);
        return reply.send({ data: { targetType, targetId, count } });
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
      // WS-C-6 — paginação offset-based (limit 50 default, teto 100).
      const q = (request.query as Record<string, string | undefined>) ?? {};
      const limit = Math.min(Math.max(parseInt(q.limit ?? '50', 10) || 50, 1), 100);
      const offset = Math.max(parseInt(q.offset ?? '0', 10) || 0, 0);
      // WS-C-12 — ?targetType=player|competition lista os genéricos; sem filtro
      // (ou targetType=club) mantém o contrato legado do painel.
      if (q.targetType === 'player' || q.targetType === 'competition') {
        const result = await favoritesService.listByTarget(request.user!.id, q.targetType, {
          limit,
          offset,
        });
        return reply.send(result);
      }
      const result = await favoritesService.list(request.user!.id, { limit, offset });
      return reply.send(result);
    } catch (err) {
      return handleFavoriteError(err, reply);
    }
  });

  /**
   * GET /favorites/feed — WS-C-6, conquistas recentes dos clubes favoritados
   * (arestas WON vivas, ano DESC, cap 20). Autenticado; RLS owner-only.
   */
  app.get('/favorites/feed', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const result = await favoritesService.feed(request.user!.id);
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
