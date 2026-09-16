import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';
import { DomainError } from '@almanaque/domain';
import { authenticate, requireRole } from '../auth/authenticate.middleware.js';
import { assignRole, revokeRole, getUserRoles, listAllRoles } from '../auth/rbac.service.js';
import { withRlsContext } from '../../config/rls-context.js';

export const adminRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get(
    '/admin/users',
    { preHandler: [authenticate, requireRole('admin')] },
    async (_request, reply) => {
      const users = await withRlsContext({ role: 'SERVICE' }, async (tx) =>
        tx.user.findMany({
          select: {
            id: true,
            email: true,
            name: true,
            status: true,
            createdAt: true,
            lastLoginAt: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
      );
      return reply.send({ data: users });
    },
  );

  app.get<{ Params: { id: string } }>(
    '/admin/users/:id',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const user = await withRlsContext({ role: 'SERVICE' }, async (tx) =>
        tx.user.findUnique({
          where: { id: request.params.id },
          select: {
            id: true,
            email: true,
            name: true,
            status: true,
            createdAt: true,
            lastLoginAt: true,
          },
        }),
      );
      if (!user)
        return reply
          .status(404)
          .send({ error: { code: 'NOT_FOUND', message: 'Usuário não encontrado' } });
      const roles = await getUserRoles(user.id);
      return reply.send({ data: { ...user, roles: roles.map((r) => r.name) } });
    },
  );

  app.post<{ Params: { id: string } }>(
    '/admin/users/:id/suspend',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const user = await withRlsContext({ role: 'SERVICE' }, async (tx) =>
        tx.user.update({ where: { id: request.params.id }, data: { status: 'SUSPENDED' } }),
      );
      return reply.send({ data: { id: user.id, status: user.status } });
    },
  );

  app.post<{ Params: { id: string } }>(
    '/admin/users/:id/reactivate',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const user = await withRlsContext({ role: 'SERVICE' }, async (tx) =>
        tx.user.update({ where: { id: request.params.id }, data: { status: 'ACTIVE' } }),
      );
      return reply.send({ data: { id: user.id, status: user.status } });
    },
  );

  app.post<{ Params: { id: string } }>(
    '/admin/users/:id/roles',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      try {
        const { role } = request.body as { role: string };
        await assignRole(request.params.id, role);
        return reply.send({ message: `Role "${role}" atribuída` });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  app.delete<{ Params: { id: string; role: string } }>(
    '/admin/users/:id/roles/:role',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      try {
        await revokeRole(request.params.id, request.params.role);
        return reply.send({ message: `Role "${request.params.role}" revogada` });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  app.get(
    '/admin/roles',
    { preHandler: [authenticate, requireRole('admin')] },
    async (_request, reply) => {
      const roles = await listAllRoles();
      return reply.send({ data: roles });
    },
  );
};

function handleDomainError(err: unknown, reply: import('fastify').FastifyReply) {
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
