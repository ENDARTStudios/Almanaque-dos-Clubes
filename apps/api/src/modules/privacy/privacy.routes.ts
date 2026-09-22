/**
 * T445 — Rotas de direitos do titular (LGPD art. 18).
 *
 * Público: criação (com ou sem login — token para não-usuários) e
 * acompanhamento por token. Admin: listagem + transições (USERS_MANAGE).
 * Sem DELETE em nenhuma rota — soft-delete sempre (HANDOFF-T445).
 */
import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z, ZodError } from 'zod';
import { DomainError, NotFoundError } from '@almanaque/domain';
import { env } from '../../config/env.js';
import { authenticate, requirePermission } from '../auth/authenticate.middleware.js';
import { PERMISSIONS } from '../auth/rbac.service.js';
import { InvalidTransitionError } from './state-machine.js';
import {
  DecisionRequiresNotesError,
  RequestNotFoundError,
  createPrivacyRequest,
  getRequestStatusByToken,
  isKnownRightType,
  listPrivacyRequests,
  transitionPrivacyRequest,
} from './privacy.service.js';
import {
  ClaimNotFoundError,
  DecisionRequiresResolutionError,
} from '../copyright/copyright.service.js';

/** Auth opcional: anexa request.user quando houver access_token válido. */
export async function optionalAuthenticate(request: FastifyRequest): Promise<void> {
  const cookieName = env.isProd ? '__Host-access_token' : 'access_token';
  const accessToken = (request.cookies as Record<string, string | undefined> | undefined)?.[
    cookieName
  ];
  if (!accessToken) return;
  try {
    const decoded = request.server.jwt.verify(accessToken) as Record<string, unknown>;
    if (decoded.type !== 'access') return;
    (
      request as { user?: { id: string; email: string; roles: string[]; permissions: string[] } }
    ).user = {
      id: decoded.sub as string,
      email: decoded.email as string,
      roles: decoded.roles as string[],
      permissions: decoded.permissions as string[],
    };
  } catch {
    // token inválido/expirado → segue anônimo (direito do titular não exige login)
  }
}

const CreateSchema = z.object({
  rightType: z.string().min(1).max(40),
  email: z.string().email().max(200),
  notes: z.string().max(2000).optional(),
});

const TransitionSchema = z.object({
  to: z.enum(['recebido', 'em_andamento', 'atendido', 'indeferido']),
  notes: z.string().max(2000).optional(),
  // art. 18 §3 — prazo prorrogado (ISO). Aceito apenas em em_andamento.
  deferredUntil: z.string().datetime().optional(),
});

export const privacyRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // Criação — pública (titular com ou sem conta). Autenticação opcional
  // apenas para vincular requesterId.
  app.post('/privacy-requests', { preHandler: [optionalAuthenticate] }, async (request, reply) => {
    try {
      const body = CreateSchema.parse(request.body);
      if (!isKnownRightType(body.rightType)) {
        return reply.status(422).send({
          error: {
            code: 'INVALID_RIGHT_TYPE',
            message: `rightType desconhecido: ${body.rightType}`,
          },
        });
      }
      const requesterId = (request as { user?: { id: string } }).user?.id ?? null;
      const created = await createPrivacyRequest({
        rightType: body.rightType,
        email: body.email,
        requesterId,
        notes: body.notes ?? null,
      });
      return reply.status(201).send({ data: created });
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Acompanhamento público por token (credencial do titular).
  app.get('/privacy-requests/:token', async (request, reply) => {
    const { token } = request.params as { token: string };
    const status = await getRequestStatusByToken(token);
    if (!status) throw new NotFoundError('Solicitação', token);
    return reply.send({ data: status });
  });

  // Admin — listagem.
  app.get(
    '/admin/privacy-requests',
    { preHandler: [authenticate, requirePermission(PERMISSIONS.USERS_MANAGE)] },
    async (request, reply) => {
      const q = (request.query as Record<string, string | undefined>) ?? {};
      const rows = await listPrivacyRequests({
        status: q.status,
        limit: parseInt(q.limit ?? '50', 10) || 50,
        offset: parseInt(q.offset ?? '0', 10) || 0,
      });
      return reply.send({ data: rows });
    },
  );

  // Admin — transição (triagem → decisão motivada) + fulfillment.
  app.post(
    '/admin/privacy-requests/:id/transition',
    { preHandler: [authenticate, requirePermission(PERMISSIONS.USERS_MANAGE)] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = TransitionSchema.parse(request.body);
        const adminUserId = (request as { user: { id: string } }).user.id;
        const updated = await transitionPrivacyRequest({
          id,
          to: body.to,
          adminUserId,
          notes: body.notes ?? null,
          deferredUntil: body.deferredUntil ? new Date(body.deferredUntil) : null,
        });
        return reply.send({ data: updated });
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );
};

export function handleError(err: unknown, reply: import('fastify').FastifyReply) {
  if (err instanceof z.ZodError || err instanceof ZodError)
    return reply.status(422).send({
      error: { code: 'VALIDATION_ERROR', message: 'Payload inválido', details: err.issues },
    });
  if (err instanceof DomainError)
    return reply.status(err.statusCode).send({ error: { code: err.code, message: err.message } });
  if (err instanceof InvalidTransitionError)
    return reply.status(409).send({ error: { code: 'INVALID_TRANSITION', message: err.message } });
  if (err instanceof DecisionRequiresNotesError || err instanceof DecisionRequiresResolutionError)
    return reply.status(422).send({
      error: { code: err.name, message: err.message },
    });
  if (err instanceof RequestNotFoundError || err instanceof ClaimNotFoundError)
    return reply.status(404).send({
      error: { code: err.name, message: err.message },
    });
  return reply
    .status(500)
    .send({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' } });
}
