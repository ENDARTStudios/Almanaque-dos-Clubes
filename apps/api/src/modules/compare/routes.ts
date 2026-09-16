import type { FastifyInstance, FastifyPluginAsync, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { DomainError } from '@almanaque/domain';
import { CompareQuerySchema, parseCompareIds } from './schema.js';
import { compareClubs, comparePlayers } from './compare.service.js';
import { cache } from '../../services/cache.js';

const COMPARE_TTL_SECONDS = 300; // 5min — comparações são leituras estáveis

export const compareRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get('/compare/clubs', async (request, reply) => {
    try {
      const { ids } = CompareQuerySchema.parse(request.query);
      const key = `compare:clubs:${ids}`;
      const data = await cache.remember(key, COMPARE_TTL_SECONDS, async () => {
        const result = await compareClubs(parseCompareIds(ids));
        // Rankings/clubes têm timestamps próprios; TTL curto cobre frescor.
        return result;
      });
      return reply.send(data);
    } catch (err) {
      return handleCompareError(err, reply);
    }
  });

  app.get('/compare/players', async (request, reply) => {
    try {
      const { ids } = CompareQuerySchema.parse(request.query);
      const key = `compare:players:${ids}`;
      const data = await cache.remember(key, COMPARE_TTL_SECONDS, async () => {
        return comparePlayers(parseCompareIds(ids));
      });
      return reply.send(data);
    } catch (err) {
      return handleCompareError(err, reply);
    }
  });
};

function handleCompareError(err: unknown, reply: FastifyReply) {
  if (err instanceof DomainError)
    return reply.status(err.statusCode).send({ error: { code: err.code, message: err.message } });
  if (err instanceof ZodError)
    return reply
      .status(422)
      .send({ error: { code: 'VALIDATION_ERROR', message: 'Informe exatamente 2 ids válidos' } });
  if (err instanceof Error && err.message.includes('exatamente 2 ids'))
    return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: err.message } });
  return reply
    .status(500)
    .send({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' } });
}
