/**
 * Rotas de autenticação:
 *   POST /api/v1/auth/register — cria usuário + auto-login
 *   POST /api/v1/auth/login     — autentica e seta cookies
 *   POST /api/v1/auth/logout    — revoga sessão + limpa cookies
 *
 * Cookies:
 *   access_token (httpOnly) — 15min
 *   refresh_token (httpOnly) — 7d, rotação em cada /refresh
 *
 * Mensagens de erro genéricas para login (não revela se email existe).
 */
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import {
  register,
  login,
  logout,
  refreshSession,
  extractMetadata,
  AuthError,
  ConflictAuthError,
  ValidationAuthError,
} from './auth.service.js';
import { RegisterSchema, LoginSchema, RefreshSchema } from './auth.schemas.js';
import {
  createJwtService,
  getAccessCookieName,
  getRefreshCookieName,
  getCookieOptions,
  ACCESS_TOKEN_MAX_AGE_SECONDS,
  REFRESH_TOKEN_MAX_AGE_SECONDS,
} from './jwt.service.js';
import { env } from '../../config/env.js';

export const authRoutes: FastifyPluginAsync = async (app) => {
  const jwt = createJwtService(app);

  /**
   * Helper: setar cookies httpOnly com access e refresh tokens.
   */
  function setAuthCookies(reply: FastifyReply, accessToken: string, refreshToken: string): void {
    const isProd = env.isProd;
    reply.setCookie(
      getAccessCookieName(isProd),
      accessToken,
      getCookieOptions(isProd, ACCESS_TOKEN_MAX_AGE_SECONDS),
    );
    reply.setCookie(
      getRefreshCookieName(isProd),
      refreshToken,
      getCookieOptions(isProd, REFRESH_TOKEN_MAX_AGE_SECONDS),
    );
  }

  /**
   * Helper: limpar cookies (logout).
   */
  function clearAuthCookies(reply: FastifyReply): void {
    const isProd = env.isProd;
    reply.clearCookie(getAccessCookieName(isProd), { path: '/' });
    reply.clearCookie(getRefreshCookieName(isProd), { path: '/' });
  }

  /**
   * Helper: extrair refresh token do cookie OU do body (para testes).
   */
  function getRefreshTokenFromRequest(request: FastifyRequest): string | undefined {
    const isProd = env.isProd;
    const cookieName = getRefreshCookieName(isProd);
    const fromCookie = (request.cookies as Record<string, string | undefined> | undefined)?.[
      cookieName
    ];
    if (fromCookie) return fromCookie;
    // Fallback: body (para testes)
    const body = request.body as { refreshToken?: string } | undefined;
    return body?.refreshToken;
  }

  /**
   * Helper: handler de erro padronizado.
   */
  function handleAuthError(err: unknown, reply: FastifyReply): void {
    if (err instanceof ZodError) {
      reply.status(422).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Payload inválido',
          details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
      });
      return;
    }

    if (err instanceof ValidationAuthError) {
      reply.status(err.statusCode).send({
        error: { code: err.code, message: err.message, details: err.details },
      });
      return;
    }

    if (err instanceof ConflictAuthError) {
      reply.status(err.statusCode).send({
        error: { code: err.code, message: err.message },
      });
      return;
    }

    if (err instanceof AuthError) {
      reply.status(err.statusCode).send({
        error: { code: err.code, message: err.message },
      });
      return;
    }

    // Erro inesperado — não vazar stack trace em produção

    console.error('[auth] Erro inesperado:', err);
    reply.status(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' },
    });
  }

  // -----------------------------------------------------------------
  // POST /auth/register
  // -----------------------------------------------------------------
  app.post('/auth/register', async (request, reply) => {
    try {
      const input = RegisterSchema.parse(request.body);
      const metadata = extractMetadata(request);

      const result = await register(input, metadata);

      // Gera access token (15min)
      const { accessToken } = jwt.signTokens(result.user, result.sessionId);

      // Seta cookies
      setAuthCookies(reply, accessToken, result.refreshToken);

      // Resposta (sem expor passwordHash)
      return reply.status(201).send({
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            roles: result.user.roles,
          },
        },
      });
    } catch (err) {
      handleAuthError(err, reply);
    }
  });

  // -----------------------------------------------------------------
  // POST /auth/login
  // -----------------------------------------------------------------
  app.post('/auth/login', async (request, reply) => {
    try {
      const input = LoginSchema.parse(request.body);
      const metadata = extractMetadata(request);

      const result = await login(input, metadata);

      const { accessToken } = jwt.signTokens(result.user, result.sessionId);
      setAuthCookies(reply, accessToken, result.refreshToken);

      return reply.status(200).send({
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            roles: result.user.roles,
          },
        },
      });
    } catch (err) {
      handleAuthError(err, reply);
    }
  });

  // -----------------------------------------------------------------
  // POST /auth/logout
  // -----------------------------------------------------------------
  app.post('/auth/logout', async (request, reply) => {
    try {
      const refreshToken = getRefreshTokenFromRequest(request);
      await logout(refreshToken);
      clearAuthCookies(reply);
      return reply.status(200).send({
        data: { message: 'Logout realizado com sucesso' },
      });
    } catch (err) {
      // Mesmo em erro, limpa cookies (client-side state)
      clearAuthCookies(reply);
      handleAuthError(err, reply);
    }
  });

  // -----------------------------------------------------------------
  // POST /auth/refresh
  // -----------------------------------------------------------------
  app.post('/auth/refresh', async (request, reply) => {
    try {
      RefreshSchema.parse(request.body);

      const oldRefreshToken = getRefreshTokenFromRequest(request);
      if (!oldRefreshToken) {
        throw new AuthError('Credenciais inválidas');
      }

      const metadata = extractMetadata(request);
      const result = await refreshSession(oldRefreshToken, metadata);

      const { accessToken } = jwt.signTokens(result.user, result.sessionId);
      setAuthCookies(reply, accessToken, result.refreshToken);

      return reply.status(200).send({
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            roles: result.user.roles,
          },
        },
      });
    } catch (err) {
      handleAuthError(err, reply);
    }
  });
};
