import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';
import { DomainError } from '@almanaque/domain';
import { matchesService } from './service.js';
import { authenticate, requirePermission } from '../auth/authenticate.middleware.js';
import { PERMISSIONS } from '../auth/rbac.service.js';

export const matchesRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.post(
    '/matches',
    { preHandler: [authenticate, requirePermission(PERMISSIONS.CLUBS_WRITE)] },
    async (request, reply) => {
      try {
        return reply.status(201).send({ data: await matchesService.create(request.body) });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );
  app.get('/matches', async (request, reply) => {
    const q = (request.query as Record<string, string | undefined>) ?? {};
    // T548 — data inválida vira 400 com mensagem clara. Antes, `dateFrom=2026-13-45`
    // descia até o Prisma e estourava 500 (regressão do T541, quando os filtros de
    // data passaram a valer de verdade).
    for (const campo of ['dateFrom', 'dateTo'] as const) {
      const bruto = q[campo];
      if (bruto !== undefined && !isIsoDate(bruto)) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_DATE',
            message: `${campo} deve ser uma data ISO (YYYY-MM-DD); recebido: "${bruto}"`,
          },
        });
      }
    }
    return reply.send(
      await matchesService.list({
        homeClubId: q.homeClubId,
        awayClubId: q.awayClubId,
        competitionId: q.competitionId,
        seasonId: q.seasonId,
        status: q.status,
        dateFrom: q.dateFrom,
        dateTo: q.dateTo,
        limit: Math.min(Math.max(parseInt(q.limit ?? '50', 10) || 50, 1), 100),
        offset: Math.max(parseInt(q.offset ?? '0', 10) || 0, 0),
      }),
    );
  });
  // T541 — facets ANTES de '/matches/:id' (senão 'facets' casaria como id).
  app.get('/matches/facets', async (_request, reply) => {
    return reply.send(await matchesService.facets());
  });
  app.get<{ Params: { id: string } }>('/matches/:id', async (request, reply) => {
    try {
      return reply.send({ data: await matchesService.getById(request.params.id) });
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });
  app.put<{ Params: { id: string } }>(
    '/matches/:id',
    { preHandler: [authenticate, requirePermission(PERMISSIONS.CLUBS_WRITE)] },
    async (request, reply) => {
      try {
        return reply.send({ data: await matchesService.update(request.params.id, request.body) });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );
  app.delete<{ Params: { id: string } }>(
    '/matches/:id',
    { preHandler: [authenticate, requirePermission(PERMISSIONS.CLUBS_DELETE)] },
    async (request, reply) => {
      try {
        await matchesService.remove(request.params.id);
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

/**
 * T548 — data ISO (YYYY-MM-DD) ESTRITA e de calendário real: `2026-13-45` e
 * `2026-02-30` são rejeitados (o `new Date` sozinho aceita o primeiro como Invalid
 * Date e o segundo como 2 de março).
 */
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [ano, mes, dia] = value.split('-').map(Number) as [number, number, number];
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}
