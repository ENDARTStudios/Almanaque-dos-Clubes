import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { DomainError } from '@almanaque/domain';
import { stadiumsService } from './service.js';

/**
 * ESTÁDIOS — rotas públicas de leitura.
 *
 * `/estadiums/facets` vem ANTES de `/stadiums/:id` por necessidade de roteamento: o Fastify
 * resolve por especificidade, mas manter a ordem explícita evita que uma futura rota paramétrica
 * engula o literal.
 *
 * Todos os limites são grampeados aqui, e não no serviço: é a borda que recebe texto do cliente
 * e é ali que ele precisa ser contido (`limit` entre 1 e 100, `offset` nunca negativo).
 */
export const stadiumsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get('/stadiums', async (request, reply) => {
    const q = (request.query as Record<string, string | undefined>) ?? {};
    return reply.send(
      await stadiumsService.list({
        search: q.search?.trim() || undefined,
        country: q.country?.trim() || undefined,
        clubId: q.clubId?.trim() || undefined,
        limit: Math.min(Math.max(parseInt(q.limit ?? '50', 10) || 50, 1), 100),
        offset: Math.max(parseInt(q.offset ?? '0', 10) || 0, 0),
      }),
    );
  });

  app.get('/stadiums/facets', async (_request, reply) => {
    return reply.send({ data: { countries: await stadiumsService.countries() } });
  });

  app.get<{ Params: { id: string } }>('/stadiums/:id', async (request, reply) => {
    try {
      return reply.send({ data: await stadiumsService.getById(request.params.id) });
    } catch (err) {
      if (err instanceof DomainError)
        return reply
          .status(err.statusCode)
          .send({ error: { code: err.code, message: err.message } });
      return reply
        .status(500)
        .send({ error: { code: 'INTERNAL', message: 'Falha ao ler o estádio' } });
    }
  });
};
