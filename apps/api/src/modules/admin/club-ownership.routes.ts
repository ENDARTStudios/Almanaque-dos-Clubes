/**
 * WS-C-9 — moderação de posses de clube (critério C3, docs/
 * EDITORES-DE-CLUBES-CRITERIOS.md): fila de pendentes, aprovar, revogar.
 * A regra vive em modules/clubs/ownership-moderation.service.ts — aqui só HTTP.
 *
 * Mesmo trio de guardas de TODA superfície interna (T-ADMIN/T565):
 * `[authenticate, requireRole('admin'), requireOperator]` — logado, papel admin
 * E na allowlist do operador.
 */
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z, ZodError } from 'zod';
import { DomainError } from '@almanaque/domain';
import { authenticate, requireRole } from '../auth/authenticate.middleware.js';
import { requireOperator } from '../auth/operator.middleware.js';
import {
  approveOwnership,
  listOwnershipsForModeration,
  revokeOwnership,
} from '../clubs/ownership-moderation.service.js';

const PAGE_MAX = 100;

function intParam(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'string' ? Number.parseInt(value, 10) : Number.NaN;
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

export const clubOwnershipAdminRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  /**
   * GET /admin/club-ownerships?status=pending&limit&offset — fila de moderação
   * (default: pendentes + ativas + suspensas). Responde { data, total }.
   */
  app.get(
    '/admin/club-ownerships',
    { preHandler: [authenticate, requireRole('admin'), requireOperator] },
    async (request, reply) => {
      const q = (request.query as Record<string, string | undefined>) ?? {};
      const { items, total } = await listOwnershipsForModeration({
        status: q.status,
        limit: intParam(q.limit, 25, 1, PAGE_MAX),
        offset: intParam(q.offset, 0, 0, Number.MAX_SAFE_INTEGER),
      });
      return reply.send({ data: items, total });
    },
  );

  /** POST /admin/club-ownerships/:id/approve — pendente → ativo (quem aprovou fica registrado). */
  app.post<{ Params: { id: string } }>(
    '/admin/club-ownerships/:id/approve',
    { preHandler: [authenticate, requireRole('admin'), requireOperator] },
    async (request, reply) => {
      try {
        const data = await approveOwnership(request.user!.id, request.params.id);
        return reply.send({ data });
      } catch (err) {
        return handleAdminError(err, reply);
      }
    },
  );

  /** POST /admin/club-ownerships/:id/revoke — revogação imediata com motivo (C4). */
  app.post<{ Params: { id: string } }>(
    '/admin/club-ownerships/:id/revoke',
    { preHandler: [authenticate, requireRole('admin'), requireOperator] },
    async (request, reply) => {
      try {
        const body = z.object({ reason: z.string().trim().min(3).max(500) }).parse(request.body);
        const data = await revokeOwnership(request.user!.id, request.params.id, body.reason);
        return reply.send({ data });
      } catch (err) {
        return handleAdminError(err, reply);
      }
    },
  );
};

function handleAdminError(err: unknown, reply: import('fastify').FastifyReply) {
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
