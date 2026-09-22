/**
 * T470 — WS-L: rotas do processo de direitos do titular + notificação autoral.
 *
 * Todas as rotas de titular exigem autenticação (fluxo automatizado); não-logado
 * recebe orientação nas páginas (canal manual), SEM POST público. CSRF é global;
 * rate-limit por usuário/rota; RBAC admin = USERS_MANAGE (padrão do repo).
 */
import type { FastifyInstance, FastifyPluginAsync, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { DomainError } from '@almanaque/domain';
import { authenticate, requirePermission } from '../auth/authenticate.middleware.js';
import { PERMISSIONS } from '../auth/rbac.service.js';
import { legalService } from './service.js';
import {
  CreateRightsRequestSchema,
  UpdateProfileSchema,
  DeleteAccountSchema,
  ExportQuerySchema,
  CreateNoticeSchema,
  CounterNoticeSchema,
  AdminUpdateDsrSchema,
  AdminUpdateNoticeSchema,
} from './schema.js';

const keyByUser = (request: { user?: { id: string }; ip: string }) =>
  request.user?.id ?? request.ip;

/** CSV flat (section,key,value) — portabilidade legível. */
function exportToCsv(data: unknown): string {
  const rows: string[] = ['section,key,value'];
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const walk = (section: string, value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach((v, i) => walk(`${section}[${i}]`, v));
    } else if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value as Record<string, unknown>))
        walk(`${section}.${k}`, v);
    } else {
      rows.push(`${esc(section)},,${esc(value)}`);
    }
  };
  walk('export', data);
  return rows.join('\n');
}

export const legalRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // ----- Direitos do titular -----
  app.post(
    '/legal/rights/requests',
    {
      preHandler: [authenticate],
      config: { rateLimit: { max: 10, timeWindow: '1 hour', keyGenerator: keyByUser } },
    },
    async (request, reply) => {
      try {
        const input = CreateRightsRequestSchema.parse(request.body);
        const data = await legalService.createRightsRequest(request.user!.id, input);
        return reply.status(201).send({ data });
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  app.get('/legal/rights/requests', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      return reply.send({ data: await legalService.listRightsRequests(request.user!.id) });
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.get<{ Params: { protocol: string } }>(
    '/legal/rights/requests/:protocol',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        return reply.send({
          data: await legalService.getRightsRequest(request.user!.id, request.params.protocol),
        });
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  app.post<{ Params: { protocol: string } }>(
    '/legal/rights/requests/:protocol/cancel',
    {
      preHandler: [authenticate],
      config: { rateLimit: { max: 10, timeWindow: '1 hour', keyGenerator: keyByUser } },
    },
    async (request, reply) => {
      try {
        return reply.send({
          data: await legalService.cancelRightsRequest(request.user!.id, request.params.protocol),
        });
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  app.get(
    '/legal/rights/me/export',
    {
      preHandler: [authenticate],
      config: { rateLimit: { max: 10, timeWindow: '1 hour', keyGenerator: keyByUser } },
    },
    async (request, reply) => {
      try {
        const { format } = ExportQuerySchema.parse(request.query);
        const data = await legalService.exportPersonalData(request.user!.id);
        if (format === 'csv') {
          return reply
            .header('Content-Type', 'text/csv; charset=utf-8')
            .header('Content-Disposition', 'attachment; filename="meus-dados.csv"')
            .send(exportToCsv(data));
        }
        return reply
          .header('Content-Disposition', 'attachment; filename="meus-dados.json"')
          .send({ data });
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  app.delete(
    '/legal/rights/me/account',
    {
      preHandler: [authenticate],
      config: { rateLimit: { max: 3, timeWindow: '1 hour', keyGenerator: keyByUser } },
    },
    async (request, reply) => {
      try {
        const body = DeleteAccountSchema.parse(request.body);
        const result = await legalService.deleteAccount(request.user!.id, body.password);
        return reply.send({ data: result, message: 'Conta anonimizada e sessões revogadas.' });
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  app.patch(
    '/legal/rights/me/profile',
    {
      preHandler: [authenticate],
      config: { rateLimit: { max: 20, timeWindow: '1 hour', keyGenerator: keyByUser } },
    },
    async (request, reply) => {
      try {
        const body = UpdateProfileSchema.parse(request.body);
        return reply.send({ data: await legalService.updateProfile(request.user!.id, body.name) });
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  // ----- Notificação autoral -----
  app.post(
    '/legal/copyright/notices',
    {
      preHandler: [authenticate],
      config: { rateLimit: { max: 10, timeWindow: '1 hour', keyGenerator: keyByUser } },
    },
    async (request, reply) => {
      try {
        const input = CreateNoticeSchema.parse(request.body);
        const data = await legalService.createNotice(request.user!.id, input);
        return reply.status(201).send({ data, message: 'Notificação registrada para análise.' });
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  app.post<{ Params: { protocol: string } }>(
    '/legal/copyright/notices/:protocol/counter',
    {
      preHandler: [authenticate],
      config: { rateLimit: { max: 10, timeWindow: '1 hour', keyGenerator: keyByUser } },
    },
    async (request, reply) => {
      try {
        const input = CounterNoticeSchema.parse(request.body);
        const data = await legalService.createCounterNotice(
          request.user!.id,
          request.params.protocol,
          input,
        );
        return reply
          .status(201)
          .send({ data, message: 'Contranotificação registrada para análise.' });
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  app.get('/legal/copyright/notices', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      return reply.send({ data: await legalService.listNotices(request.user!.id) });
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.get<{ Params: { protocol: string } }>(
    '/legal/copyright/notices/:protocol',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        return reply.send({
          data: await legalService.getNotice(request.user!.id, request.params.protocol),
        });
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  // ----- Admin (RBAC USERS_MANAGE, padrão do repo) -----
  app.get(
    '/admin/legal/rights/requests',
    { preHandler: [authenticate, requirePermission(PERMISSIONS.USERS_MANAGE)] },
    async (request, reply) => {
      const q = (request.query as Record<string, string | undefined>) ?? {};
      const data = await legalService.adminListDsr({
        status: q.status,
        type: q.type,
        jurisdiction: q.jurisdiction,
        limit: Math.min(parseInt(q.limit ?? '50', 10) || 50, 100),
        offset: Math.max(parseInt(q.offset ?? '0', 10) || 0, 0),
      });
      return reply.send({ data });
    },
  );

  app.patch<{ Params: { protocol: string } }>(
    '/admin/legal/rights/requests/:protocol',
    { preHandler: [authenticate, requirePermission(PERMISSIONS.USERS_MANAGE)] },
    async (request, reply) => {
      try {
        const body = AdminUpdateDsrSchema.parse(request.body);
        const data = await legalService.adminUpdateDsr(
          request.params.protocol,
          body,
          request.user!.id,
        );
        return reply.send({ data });
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  app.get(
    '/admin/legal/copyright/notices',
    { preHandler: [authenticate, requirePermission(PERMISSIONS.USERS_MANAGE)] },
    async (request, reply) => {
      const q = (request.query as Record<string, string | undefined>) ?? {};
      const data = await legalService.adminListNotices({
        status: q.status,
        type: q.type,
        limit: Math.min(parseInt(q.limit ?? '50', 10) || 50, 100),
        offset: Math.max(parseInt(q.offset ?? '0', 10) || 0, 0),
      });
      return reply.send({ data });
    },
  );

  app.patch<{ Params: { protocol: string } }>(
    '/admin/legal/copyright/notices/:protocol',
    { preHandler: [authenticate, requirePermission(PERMISSIONS.USERS_MANAGE)] },
    async (request, reply) => {
      try {
        const body = AdminUpdateNoticeSchema.parse(request.body);
        const data = await legalService.adminUpdateNotice(
          request.params.protocol,
          body,
          request.user!.id,
        );
        return reply.send({ data });
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );
};

function handleError(err: unknown, reply: FastifyReply) {
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
