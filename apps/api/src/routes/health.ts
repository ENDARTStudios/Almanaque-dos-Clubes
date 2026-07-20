/**
 * Rota de health check — não expõe detalhes internos.
 * Retorna 200 + timestamp + uptime. Suficiente para probes Kubernetes.
 */
import type { FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async (_request, reply) => {
    return reply.status(200).send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });
};
