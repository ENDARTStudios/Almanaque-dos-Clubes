import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import compress from '@fastify/compress';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { rateLimitByUserOrIp, AUTH_WINDOW } from './config/rate-limit.js';
import {
  DEFAULT_BODY_LIMIT_BYTES,
  PAYLOAD_TOO_LARGE_ERROR,
  httpMethodGate,
} from './config/http-hardening.js';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from './config/env.js';
import { helmetOptions } from './config/security.js';
import { logger } from './config/logger.js';
import { metrics } from './modules/observability/metrics.js';
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
import { etlRoutes } from './modules/etl/routes.js';
import { consentRoutes } from './modules/consent/routes.js';
import { privacyRoutes } from './modules/privacy/privacy.routes.js';
import { copyrightRoutes } from './modules/copyright/copyright.routes.js';
import { favoritesRoutes } from './modules/favorites/routes.js';
import { wsTicketRoutes } from './routes/ws-ticket.js';
import { compareRoutes } from './modules/compare/routes.js';
import { championsRoutes } from './modules/champions/routes.js';
import { backupRoutes } from './modules/admin/backup.routes.js';
import { idempotencyMiddleware } from './middleware/idempotency.js';
import { csrfMiddleware } from './middleware/csrf.js';

export async function buildApp(): Promise<FastifyInstance> {
  // Handler de erro único, registrado ANTES das rotas em cada escopo: o Fastify
  // captura o errorHandler da instância no momento do registro de cada rota (e
  // instâncias filhas não herdam o handler do pai).
  const errorHandler = (err: unknown, _request: FastifyRequest, reply: FastifyReply) => {
    const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
    // 413 padronizado (T385, item 7.7): sem stack trace, sem detalhes internos.
    if (statusCode === 413) {
      logger.warn({ message: err instanceof Error ? err.message : 'payload too large' }, '413');
      return reply.status(413).send({ error: PAYLOAD_TOO_LARGE_ERROR });
    }
    logger.error({ err }, 'Unhandled error');
    const code = (err as { code?: string }).code ?? 'INTERNAL_ERROR';
    const message =
      statusCode >= 500 && env.isProd
        ? 'Erro interno do servidor'
        : err instanceof Error
          ? err.message
          : 'Erro desconhecido';
    return reply.status(statusCode).send({ error: { code, message } });
  };

  const app = Fastify({
    logger: false,
    trustProxy: true,
    bodyLimit: DEFAULT_BODY_LIMIT_BYTES,
  });

  // Escopo root (swagger /docs): erro padronizado também fora do prefixo /api/v1.
  app.setErrorHandler(errorHandler);

  // Hardening de superfície (T385, item 7.6): 405 padronizado para métodos fora
  // do conjunto usado. Primeiro onRequest — rejeita antes de qualquer plugin.
  await app.addHook('onRequest', httpMethodGate);

  // Rate-limit global por IP (item 1.3/7.3). Desabilitável via RATE_LIMIT_DISABLED
  // para testes de carga k6 de máquina única. NÃO afeta o brute-force de /auth/login.
  if (!env.rateLimitDisabled) {
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
  }

  // Rate limiting avançado (7.3): janela deslizante por usuário+IP em /auth/*
  // (complementa o brute-force por IP+email do login — rate-limit.service.ts).
  if (!env.rateLimitDisabled) {
    app.addHook('onRequest', async (request, reply) => {
      const url = request.raw.url ?? '';
      if (!url.startsWith('/api/v1/auth/')) return;
      await rateLimitByUserOrIp(AUTH_WINDOW)(request, reply);
    });
  }

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

  await app.register(compress, {
    global: true,
    threshold: 1024,
    encodings: ['gzip', 'deflate', 'br'],
  });

  await app.register(helmet, helmetOptions(env.isProd));

  await app.register(cors, {
    origin: async (origin: string | undefined) => {
      if (!origin) return true; // server-to-server (ex.: webhook Stripe)
      const prod = ['https://almanaquedosclubes.com', 'https://www.almanaquedosclubes.com'];
      const isVercelPreview = /^https:\/\/[\w-]+\.vercel\.app$/.test(origin);
      if (
        prod.includes(origin) ||
        isVercelPreview ||
        origin === 'http://localhost:3000' ||
        origin === 'http://localhost:3001'
      )
        return true;
      throw new Error('Not allowed by CORS');
    },
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
  await app.addHook('onRequest', csrfMiddleware);

  await app.register(
    async (api) => {
      // Escopo /api/v1: TODAS as rotas da API capturam este handler no registro
      // (instâncias filhas não herdam o do root — ver buildErrorHandler do Fastify).
      api.setErrorHandler(errorHandler);

      // T422: observabilidade — contagem de requisicoes/5xx/auth em todas as rotas /api/v1.
      api.addHook('onResponse', async (request, reply) => {
        const status = reply.statusCode;
        const rawUrl = request.raw.url ?? '';
        metrics.inc('http_requests_total', { method: request.method, status: String(status) });
        if (status >= 500) metrics.inc('http_5xx_total', {});
        if ((status === 401 || status === 403) && rawUrl.includes('/auth/'))
          metrics.inc('auth_failures_total', {});
      });

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
      await api.register(etlRoutes);
      await api.register(authRoutes);
      await api.register(clubsRoutes);
      await api.register(consentRoutes);
      await api.register(privacyRoutes);
      await api.register(copyrightRoutes);
      await api.register(favoritesRoutes);
      await api.register(wsTicketRoutes);
      await api.register(compareRoutes);
      await api.register(championsRoutes);
      await api.register(backupRoutes);
    },
    { prefix: '/api/v1' },
  );

  return app;
}
