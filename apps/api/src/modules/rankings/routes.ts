import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';
import { DomainError } from '@almanaque/domain';
import { rankingsService } from './service.js';
import { authenticate, requirePermission } from '../auth/authenticate.middleware.js';
import { PERMISSIONS } from '../auth/rbac.service.js';

export const rankingsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // --- CRUD Ranking ---

  app.post(
    '/rankings',
    { preHandler: [authenticate, requirePermission(PERMISSIONS.RANKINGS_WRITE)] },
    async (request, reply) => {
      try {
        const ranking = await rankingsService.create(request.body);
        return reply.status(201).send({ data: ranking });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  app.get('/rankings', async (request, reply) => {
    const query = (request.query as Record<string, string | undefined>) ?? {};
    const limit = Math.min(Math.max(parseInt(query.limit ?? '50', 10) || 50, 1), 100);
    const offset = Math.max(parseInt(query.offset ?? '0', 10) || 0, 0);
    const published =
      query.published === 'true' ? true : query.published === 'false' ? false : undefined;
    const result = await rankingsService.list({
      competitionId: query.competitionId,
      season: query.season,
      published,
      search: query.search,
      limit,
      offset,
    });
    return reply.send(result);
  });

  // --- T438 — leitura pública otimizada (cursor-based) ---

  app.get('/rankings/entries', async (request, reply) => {
    const query = (request.query as Record<string, string | undefined>) ?? {};
    const limit = Math.min(Math.max(parseInt(query.limit ?? '50', 10) || 50, 1), 100);
    const cursorRaw = parseInt(query.cursor ?? '', 10);
    const result = await rankingsService.getLatestRankedEntries({
      year: query.year,
      competitionId: query.competitionId,
      gender: query.gender,
      country: query.country,
      state: query.state,
      city: query.city,
      limit,
      cursor: Number.isFinite(cursorRaw) ? cursorRaw : null,
    });
    return reply.send(result);
  });

  app.get<{ Params: { clubId: string } }>('/rankings/clube/:clubId', async (request, reply) => {
    try {
      const query = (request.query as Record<string, string | undefined>) ?? {};
      const result = await rankingsService.getClubHistory(request.params.clubId, query.year);
      return reply.send(result);
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  app.get<{ Params: { id: string } }>('/rankings/:id', async (request, reply) => {
    try {
      const ranking = await rankingsService.getById(request.params.id);
      return reply.send({ data: ranking });
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  app.put<{ Params: { id: string } }>(
    '/rankings/:id',
    { preHandler: [authenticate, requirePermission(PERMISSIONS.RANKINGS_WRITE)] },
    async (request, reply) => {
      try {
        const ranking = await rankingsService.update(request.params.id, request.body);
        return reply.send({ data: ranking });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/rankings/:id',
    { preHandler: [authenticate, requirePermission(PERMISSIONS.RANKINGS_WRITE)] },
    async (request, reply) => {
      try {
        await rankingsService.remove(request.params.id);
        return reply.status(204).send();
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  // --- Publish ---

  app.post<{ Params: { id: string } }>(
    '/rankings/:id/publish',
    { preHandler: [authenticate, requirePermission(PERMISSIONS.RANKINGS_PUBLISH)] },
    async (request, reply) => {
      try {
        const ranking = await rankingsService.publish(request.params.id);
        return reply.send({ data: ranking });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  // --- Entries ---

  app.get<{ Params: { id: string } }>('/rankings/:id/entries', async (request, reply) => {
    try {
      const entries = await rankingsService.getEntries(request.params.id);
      return reply.send({ data: entries });
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  app.post<{ Params: { id: string } }>(
    '/rankings/:id/entries',
    { preHandler: [authenticate, requirePermission(PERMISSIONS.RANKINGS_WRITE)] },
    async (request, reply) => {
      try {
        const entry = await rankingsService.addEntry(request.params.id, request.body);
        return reply.status(201).send({ data: entry });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  app.put<{ Params: { id: string; entryId: string } }>(
    '/rankings/:id/entries/:entryId',
    { preHandler: [authenticate, requirePermission(PERMISSIONS.RANKINGS_WRITE)] },
    async (request, reply) => {
      try {
        const entry = await rankingsService.updateEntry(
          request.params.id,
          request.params.entryId,
          request.body,
        );
        return reply.send({ data: entry });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  app.delete<{ Params: { id: string; entryId: string } }>(
    '/rankings/:id/entries/:entryId',
    { preHandler: [authenticate, requirePermission(PERMISSIONS.RANKINGS_WRITE)] },
    async (request, reply) => {
      try {
        await rankingsService.removeEntry(request.params.id, request.params.entryId);
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
