/**
 * WS-C-11 — rotas de denúncias (moderação defensiva).
 * POST /reports — criar (autenticado, 5/h anti-spam).
 * GET /reports/pending · PATCH /reports/:id/resolve · PATCH /reports/:id/dismiss
 * — moderação (permissão reports:moderate, role admin).
 */
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authenticate, requirePermission } from '../auth/authenticate.middleware.js';
import { PERMISSIONS } from '../auth/rbac.service.js';
import { extractMetadata } from '../auth/auth.service.js';
import { DomainError } from '@almanaque/domain';
import { createReport, dismissReport, listPending, resolveReport } from './report.service.js';

function handleDomainError(err: unknown, reply: import('fastify').FastifyReply) {
  // Rate-limit de rota excede como DomainError — 429 com Retry-After (não 500).
  const maybeRl = err as { code?: string; statusCode?: number; message?: string };
  if (maybeRl?.code === 'RATE_LIMIT_EXCEEDED') {
    return reply.status(429).send({
      error: { code: 'RATE_LIMIT_EXCEEDED', message: maybeRl.message ?? 'Muitas requisições' },
    });
  }
  if (err instanceof DomainError) {
    return reply.status(err.statusCode).send({
      error: { code: err.code, message: err.message },
    });
  }
  if (err instanceof z.ZodError) {
    return reply.status(422).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Payload inválido',
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    });
  }
  request_log_error(err);
  return reply.status(500).send({
    error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' },
  });
}

function request_log_error(err: unknown) {
  console.error('[unhandled]', err);
}

export const reportsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  const MODERATE = { preHandler: [authenticate, requirePermission(PERMISSIONS.REPORTS_MODERATE)] };

  /** POST /reports — criar denúncia (5/h por usuário, anti-spam). */
  app.post(
    '/reports',
    {
      preHandler: [authenticate],
      config: {
        rateLimit: { max: 5, timeWindow: '1 hour', keyGenerator: (r) => r.user?.id ?? r.ip },
      },
    },
    async (request, reply) => {
      try {
        const userId = request.user!.id;
        const body = z
          .object({
            targetType: z.enum(['club_description', 'proposal']),
            targetId: z.string().uuid(),
            reason: z.enum(['spam', 'offensive', 'misinformation', 'copyright', 'other']),
            details: z.string().max(1000).optional(),
          })
          .parse(request.body);
        const result = await createReport(userId, body, extractMetadata(request));
        return reply.status(201).send({ data: result });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  /** GET /reports/pending — pendentes (admin). */
  app.get(
    '/reports/pending',
    { ...MODERATE, config: { rateLimit: { max: 60, timeWindow: '1 minute' } } },
    async (_request, reply) => {
      try {
        const result = await listPending();
        return reply.send({ data: result });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  /** PATCH /reports/:id/resolve — resolver com action (admin). */
  app.patch<{ Params: { id: string } }>(
    '/reports/:id/resolve',
    { ...MODERATE, config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (request, reply) => {
      try {
        const adminId = request.user!.id;
        const body = z
          .object({
            action: z.enum(['remove_content', 'warn_user', 'suspend_user', 'no_action']),
            reviewNote: z.string().max(500).optional(),
          })
          .parse(request.body);
        const result = await resolveReport(
          adminId,
          request.params.id,
          body.action,
          body.reviewNote ?? null,
          extractMetadata(request),
        );
        return reply.status(200).send({ data: result });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  /** PATCH /reports/:id/dismiss — descartar (admin). */
  app.patch<{ Params: { id: string } }>(
    '/reports/:id/dismiss',
    { ...MODERATE, config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (request, reply) => {
      try {
        const adminId = request.user!.id;
        const body = z
          .object({ reviewNote: z.string().max(500).optional() })
          .parse(request.body ?? {});
        const result = await dismissReport(
          adminId,
          request.params.id,
          body.reviewNote ?? null,
          extractMetadata(request),
        );
        return reply.status(200).send({ data: result });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );
};
