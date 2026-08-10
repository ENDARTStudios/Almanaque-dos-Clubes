import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';
import { DomainError } from '@almanaque/domain';
import { seasonsService } from './service.js';
import { authenticate, requirePermission } from '../auth/authenticate.middleware.js';
import { PERMISSIONS } from '../auth/rbac.service.js';

export const seasonsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.post(
    '/seasons',
    { preHandler: [authenticate, requirePermission(PERMISSIONS.COMPETITIONS_MANAGE)] },
    async (request, reply) => {
      try {
        return reply.status(201).send({ data: await seasonsService.create(request.body) });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );
  app.get('/seasons', async (request, reply) => {
    const q = (request.query as Record<string, string | undefined>) ?? {};
    return reply.send(
      await seasonsService.list({
        status: q.status,
        search: q.search,
        limit: Math.min(Math.max(parseInt(q.limit ?? '50', 10) || 50, 1), 100),
        offset: Math.max(parseInt(q.offset ?? '0', 10) || 0, 0),
      }),
    );
  });
  app.get<{ Params: { id: string } }>('/seasons/:id', async (request, reply) => {
    try {
      return reply.send({ data: await seasonsService.getById(request.params.id) });
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });
  app.put<{ Params: { id: string } }>(
    '/seasons/:id',
    { preHandler: [authenticate, requirePermission(PERMISSIONS.COMPETITIONS_MANAGE)] },
    async (request, reply) => {
      try {
        return reply.send({ data: await seasonsService.update(request.params.id, request.body) });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );
  app.delete<{ Params: { id: string } }>(
    '/seasons/:id',
    { preHandler: [authenticate, requirePermission(PERMISSIONS.COMPETITIONS_MANAGE)] },
    async (request, reply) => {
      try {
        await seasonsService.remove(request.params.id);
        return reply.status(204).send();
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );
};

function handleDomainError(err: unknown, reply: import('fastify').FastifyReply) {
  if (err instanceof DomainError)
    return reply.status(err.statusCode).send({ error: { code: err.code, message: err.message } });
  if (err instanceof ZodError)
    return reply.status(422).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Payload inválido',
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    });
  return reply
    .status(500)
    .send({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' } });
}
