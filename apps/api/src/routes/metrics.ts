/**
 * T422 — Rota /api/v1/metrics no formato de exposicao Prometheus.
 * A contagem de requisicoes/5xx/auth fica no hook onResponse do escopo /api/v1 (app.ts).
 */
import type { FastifyPluginAsync } from 'fastify';
import { metrics, renderPrometheus } from '../modules/observability/metrics.js';

export const metricsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/metrics', async (_request, reply) => {
    return reply
      .type('text/plain; version=0.0.4; charset=utf-8')
      .send(renderPrometheus(metrics.all()));
  });
};
