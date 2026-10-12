/**
 * Rota de health check — não expõe detalhes internos.
 * Retorna 200 + timestamp + uptime. Suficiente para probes Kubernetes.
 *
 * T533 — FORA do rate-limit global: o healthcheck do Railway bate AQUI, de dentro do
 * container (localhost), no MESMO balde de IP do limitador global (100 req/min). Uma
 * rajada de chamadas internas esgota o orçamento e o probe recebe 429 — o serviço
 * pode ser marcado unhealthy por causa de um vizinho de IP, não por estar doente.
 */
import type { FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', { config: { rateLimit: false } }, async (request, reply) => {
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
