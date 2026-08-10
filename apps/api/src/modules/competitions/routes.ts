import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';
import { DomainError } from '@almanaque/domain';
import { competitionsService } from './service.js';
import { authenticate, requirePermission } from '../auth/authenticate.middleware.js';
import { PERMISSIONS } from '../auth/rbac.service.js';

export const competitionsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.post(
    '/competitions',
    { preHandler: [authenticate, requirePermission(PERMISSIONS.COMPETITIONS_MANAGE)] },
    async (request, reply) => {
      try {
        const competition = await competitionsService.create(request.body);
        return reply.status(201).send({ data: competition });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  app.get('/competitions', async (request, reply) => {
    const query = (request.query as Record<string, string | undefined>) ?? {};
    const limit = Math.min(Math.max(parseInt(query.limit ?? '50', 10) || 50, 1), 100);
    const offset = Math.max(parseInt(query.offset ?? '0', 10) || 0, 0);
    const result = await competitionsService.list({
      country: query.country,
      type: query.type,
      search: query.search,
      limit,
      offset,
    });
    return reply.send(result);
  });

  app.get<{ Params: { id: string } }>('/competitions/:id', async (request, reply) => {
    try {
      const competition = await competitionsService.getById(request.params.id);
      return reply.send({ data: competition });
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  app.put<{ Params: { id: string } }>(
    '/competitions/:id',
    { preHandler: [authenticate, requirePermission(PERMISSIONS.COMPETITIONS_MANAGE)] },
    async (request, reply) => {
      try {
        const competition = await competitionsService.update(request.params.id, request.body);
        return reply.send({ data: competition });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/competitions/:id',
    { preHandler: [authenticate, requirePermission(PERMISSIONS.COMPETITIONS_MANAGE)] },
    async (request, reply) => {
      try {
        await competitionsService.remove(request.params.id);
        return reply.status(204).send();
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );
};

function handleDomainError(err: unknown, reply: import('fastify').FastifyReply) {
  if (err instanceof DomainError) {
    return reply.status(err.statusCode).send({ error: { code: err.code, message: err.message } });
  }
  if (err instanceof ZodError) {
    return reply.status(422).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Payload inválido',
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    });
  }
  return reply
    .status(500)
    .send({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' } });
}
