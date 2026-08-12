import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';
import { DomainError, CreateGraphEdgeSchema } from '@almanaque/domain';
import { graphService } from './service.js';
import { authenticate, requirePermission } from '../auth/authenticate.middleware.js';
import { PERMISSIONS } from '../auth/rbac.service.js';

export const graphRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get('/graph', async (_request, reply) => {
    try {
      return reply.send({ data: await graphService.getGraph() });
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.get<{ Params: { entityType: string; entityId: string } }>(
    '/graph/:entityType/:entityId',
    async (request, reply) => {
      try {
        return reply.send({
          data: await graphService.getEdgesForEntity(
            request.params.entityId,
            request.params.entityType,
          ),
        });
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  app.post(
    '/graph',
    { preHandler: [authenticate, requirePermission(PERMISSIONS.CLUBS_MANAGE)] },
    async (request, reply) => {
      try {
        const parsed = CreateGraphEdgeSchema.parse(request.body);
        const edge = await graphService.addEdge(parsed);
        return reply.status(201).send({ data: edge });
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );
};

function handleError(err: unknown, reply: import('fastify').FastifyReply) {
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
