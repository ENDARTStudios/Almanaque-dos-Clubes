import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';
import { ChampionsQuerySchema } from './schema.js';
import { getChampions } from './champions.service.js';
import { getCarousel } from './carousel.service.js';

export const championsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  /**
   * GET /champions/carousel — WS-C-1, carrossel determinístico (KG WON ativas com
   * proveniência; ambíguo/ausente = omitido). Declarada ANTES de /champions (estática).
   */
  app.get('/champions/carousel', async (_request, reply) => {
    try {
      return reply.send(await getCarousel());
    } catch {
      return reply
        .status(500)
        .send({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' } });
    }
  });

  app.get('/champions', async (request, reply) => {
    try {
      const { gender } = ChampionsQuerySchema.parse(request.query);
      const data = await getChampions(gender);
      return reply.send(data);
    } catch (err) {
      if (err instanceof ZodError)
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'gender inválido (use men|women)' },
        });
      return reply
        .status(500)
        .send({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' } });
    }
  });
};
