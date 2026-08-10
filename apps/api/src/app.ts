import Fastify, { type FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { healthRoutes } from './routes/health.js';
import { metricsRoutes } from './routes/metrics.js';
import { clubsRoutes } from './modules/clubs/routes.js';
import { playersRoutes } from './modules/players/routes.js';
import { competitionsRoutes } from './modules/competitions/routes.js';
import { rankingsRoutes } from './modules/rankings/routes.js';
import { seasonsRoutes } from './modules/seasons/routes.js';
import { matchesRoutes } from './modules/matches/routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { billingRoutes } from './modules/billing/routes.js';
import { adminRoutes } from './modules/admin/routes.js';
import { uploadRoutes } from './modules/upload/routes.js';
import { graphRoutes } from './modules/graph/routes.js';
import { ragRoutes } from './modules/rag/routes.js';
import { exportRoutes } from './modules/export/routes.js';
import { idempotencyMiddleware } from './middleware/idempotency.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
    trustProxy: true,
    bodyLimit: 1024 * 1024,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (request: { ip: string }) => request.ip,
    errorResponseBuilder: (_request: unknown, context: { max: number; after: string }) => ({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Muitas requisições. Limite de ${context.max} a cada ${context.after}`,
        retryAfter: context.after,
      },
    }),
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Almanaque dos Clubes API',
        description: 'API de pesquisa e análise histórica do futebol mundial',
        version: '0.1.0',
      },
      servers: [{ url: `http://localhost:${env.port}`, description: 'Desenvolvimento' }],
      components: {
        securitySchemes: {
          cookieAccess: { type: 'apiKey', in: 'cookie', name: 'access_token' },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: true },
  });

  await app.register(helmet, {
    contentSecurityPolicy: env.isProd
      ? { directives: { defaultSrc: ["'self'"], objectSrc: ["'none'"], scriptSrc: ["'self'"] } }
      : false,
    hsts: env.isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  });

  await app.register(cors, {
    origin: env.isProd ? ['https://almanaque.app'] : true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });

  await app.register(multipart, { limits: { fileSize: env.uploadMaxBytes, files: 1 } });

  await app.register(cookie, { secret: env.jwtSecret });

  await app.register(jwt, {
    secret: env.jwtSecret,
    sign: { expiresIn: env.jwtExpiresIn },
    verify: { algorithms: ['HS256'] },
    cookie: { cookieName: 'access_token', signed: false },
  });

  await app.addHook('onRequest', idempotencyMiddleware);

  await app.register(
    async (api) => {
      await api.register(healthRoutes);
      await api.register(metricsRoutes);
      await api.register(playersRoutes);
      await api.register(competitionsRoutes);
      await api.register(rankingsRoutes);
      await api.register(seasonsRoutes);
      await api.register(matchesRoutes);
      await api.register(billingRoutes);
      await api.register(adminRoutes);
      await api.register(uploadRoutes);
      await api.register(graphRoutes);
      await api.register(ragRoutes);
      await api.register(exportRoutes);
      await api.register(authRoutes);
      await api.register(clubsRoutes);
    },
    { prefix: '/api/v1' },
  );

  app.setErrorHandler((err, _request, reply) => {
    logger.error({ err }, 'Unhandled error');
    const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
    const code = (err as { code?: string }).code ?? 'INTERNAL_ERROR';
    const message =
      statusCode >= 500 && env.isProd
        ? 'Erro interno do servidor'
        : err instanceof Error
          ? err.message
          : 'Erro desconhecido';
    return reply.status(statusCode).send({ error: { code, message } });
  });

  return app;
}
