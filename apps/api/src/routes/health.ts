/**
 * Rota de health check — não expõe detalhes internos.
 * Retorna 200 + timestamp + uptime. Suficiente para probes Kubernetes.
 */
import type { FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async (request, reply) => {
    // Beacon de diagnóstico do CI (T375): loga marcador se presente.
    // Apenas strings fixas m/st; sem PII, token ou segredo.
    const q = (request.query ?? {}) as Record<string, string | undefined>;
    if (q.m) {
      process.stdout.write(
        `[ci-beacon] m=${q.m} st=${q.st ?? '-'} ts=${new Date().toISOString()}\n`,
      );
    }
    return reply.status(200).send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });
};
