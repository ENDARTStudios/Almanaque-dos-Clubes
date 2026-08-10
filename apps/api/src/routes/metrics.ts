import type { FastifyPluginAsync } from 'fastify';
import { env } from '../config/env.js';

export const metricsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/metrics', async (_request, reply) => {
    const memory = process.memoryUsage();
    const cpu = process.cpuUsage();
    return reply.status(200).send({
      uptime: process.uptime(),
      memory: {
        rss: memory.rss,
        heapTotal: memory.heapTotal,
        heapUsed: memory.heapUsed,
        external: memory.external,
      },
      cpu: {
        user: cpu.user,
        system: cpu.system,
      },
      nodeVersion: process.version,
      environment: env.nodeEnv,
      timestamp: new Date().toISOString(),
    });
  });
};
