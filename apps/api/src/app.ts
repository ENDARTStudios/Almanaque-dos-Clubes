/**
 * App Fastify — configuração central.
 * Importado por server.ts (modo dev) e por testes.
 */
import Fastify, { type FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { healthRoutes } from './routes/health.js';
import { clubsRoutes } from './modules/clubs/routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false, // usamos pino separado para ter controle fino
    trustProxy: true,
    bodyLimit: 1024 * 1024, // 1 MiB
  });

  // ---- Plugins de segurança ----
  await app.register(helmet, {
    contentSecurityPolicy: env.isProd
      ? {
          directives: {
            defaultSrc: ["'self'"],
            objectSrc: ["'none'"],
            scriptSrc: ["'self'"],
          },
        }
      : false,
    hsts: env.isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  });

  await app.register(cors, {
    origin: env.isProd ? ['https://almanaque.app'] : true, // dev: permite qualquer origem
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });

  // ---- Auth plugins (Tarefa 3.1) ----
  // @fastify/cookie — para setar/ler cookies httpOnly com refresh token
  await app.register(cookie, {
    secret: env.jwtSecret, // assina cookies signed (uso futuro)
  });

  // @fastify/jwt — para sign/verify de access e refresh tokens
  await app.register(jwt, {
    secret: env.jwtSecret,
    sign: {
      expiresIn: env.jwtExpiresIn,
    },
    verify: {
      algorithms: ['HS256'], // previne algorithm confusion attacks
    },
    cookie: {
      cookieName: 'access_token', // permite app.jwt.verifyFromCookie() no futuro
      signed: false, // não exige cookie signed (usamos httpOnly separado)
    },
  });

  // ---- Prefixo de versão da API ----
  await app.register(
    async (api) => {
      await api.register(healthRoutes);
      await api.register(clubsRoutes);
    },
    { prefix: '/api/v1' },
  );

  // ---- Handler global de erros ----
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
    return reply.status(statusCode).send({
      error: { code, message },
    });
  });

  return app;
}
