/**
 * T596 — rotas do TIME DO CORAÇÃO (área do usuário).
 *
 * PUT    /users/me/heart-club  { clubId } — define/substitui (idempotente)
 * DELETE /users/me/heart-club             — remove a declaração (idempotente)
 * GET    /users/me/heart-club             — a declaração atual, ou null
 *
 * Autenticado + CSRF global + rate-limit por usuário (30/min, mesmo padrão dos
 * favoritos T439). Escrita em `users` sob RLS owner — ninguém toca no vínculo
 * de outro usuário.
 */
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';
import { DomainError } from '@almanaque/domain';
import { authenticate } from '../auth/authenticate.middleware.js';
import { SetHeartClubSchema } from './heart-club.schema.js';
import { heartClubService } from './heart-club.service.js';

export const usersRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  const limiteUsuario = {
    rateLimit: {
      max: 30,
      timeWindow: '1 minute',
      keyGenerator: (request: { user?: { id?: string } | null; ip: string }) =>
        request.user?.id ?? request.ip,
    },
  } as const;

  app.get(
    '/users/me/heart-club',
    { preHandler: [authenticate], config: limiteUsuario },
    async (request, reply) => {
      try {
        const heartClub = await heartClubService.get(request.user!.id);
        return reply.send({ data: heartClub });
      } catch (err) {
        return handleHeartClubError(err, reply);
      }
    },
  );

  app.put(
    '/users/me/heart-club',
    { preHandler: [authenticate], config: limiteUsuario },
    async (request, reply) => {
      try {
        const parsed = SetHeartClubSchema.safeParse(request.body);
        if (!parsed.success) throw parsed.error;
        const heartClub = await heartClubService.set(request.user!.id, parsed.data.clubId);
        return reply.send({ data: heartClub });
      } catch (err) {
        return handleHeartClubError(err, reply);
      }
    },
  );

  app.delete(
    '/users/me/heart-club',
    { preHandler: [authenticate], config: limiteUsuario },
    async (request, reply) => {
      try {
        const { removed } = await heartClubService.clear(request.user!.id);
        return reply.status(200).send({ removed });
      } catch (err) {
        return handleHeartClubError(err, reply);
      }
    },
  );
};

function handleHeartClubError(err: unknown, reply: import('fastify').FastifyReply) {
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
