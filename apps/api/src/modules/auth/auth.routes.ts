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
import {
  RegisterSchema,
  LoginSchema,
  RefreshSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
} from './auth.schemas.js';
import {
  checkLoginAttempt,
  registerLoginFailure,
  registerLoginSuccess,
  loginRateLimitKey,
} from './rate-limit.service.js';
import {
  createJwtService,
  getAccessCookieName,
  getRefreshCookieName,
  getCookieOptions,
  ACCESS_TOKEN_MAX_AGE_SECONDS,
  REFRESH_TOKEN_MAX_AGE_SECONDS,
} from './jwt.service.js';
import { env } from '../../config/env.js';
import { generateCsrfToken } from '../../middleware/csrf.js';
import { withRlsContext } from '../../config/rls-context.js';
import { authenticate } from './authenticate.middleware.js';
import { getUserRoles } from './rbac.service.js';
import { sendWelcomeEmail } from '../../services/email.js';
import { mailerService } from '../mailer/mailer.service.js';
import {
  createPasswordResetToken,
  consumePasswordResetToken,
  resetPassword as resetPasswordService,
} from './password-reset.service.js';
import {
  createEmailVerificationToken,
  consumeEmailVerificationToken,
} from './email-verification.service.js';

export const authRoutes: FastifyPluginAsync = async (app) => {
  const jwt = createJwtService(app);

  /**
   * GET /auth/csrf-token — emite token CSRF de uso único (24h).
   * Cliente deve enviá-lo no header `x-csrf-token` em rotas de escrita.
   */
  app.get('/auth/csrf-token', async (request, reply) => {
    const userId = (request.user as { sub?: string } | undefined)?.sub ?? 'anonymous';
    const token = generateCsrfToken(userId);
    return reply.status(200).send({ data: { csrfToken: token } });
  });

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
   * T452 — os atributos PRECISAM espelhar a criação: browsers (Chrome) rejeitam
   * Set-Cookie com prefixo __Host- sem Secure/SameSite — sem isso o logout
   * não apaga o cookie no browser (logout cosmético, incidente 2026-09-20).
   */
  function clearAuthCookies(reply: FastifyReply): void {
    const isProd = env.isProd;
    const base = { path: '/', httpOnly: true, secure: isProd, sameSite: 'strict' as const };
    reply.clearCookie(getAccessCookieName(isProd), base);
    reply.clearCookie(getRefreshCookieName(isProd), base);
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

      // Enfileira email de boas-vindas (não bloqueia resposta)
      sendWelcomeEmail(result.user.email, result.user.email.split('@')[0]).catch(() => {
        /* falha de email não quebra registro */
      });

      // Emite token de verificação e envia email (T342) — não bloqueia resposta
      const verificationToken = await createEmailVerificationToken(result.user.id);
      if (verificationToken) {
        mailerService
          .sendVerificationEmail(
            result.user.email,
            result.user.email.split('@')[0],
            verificationToken,
          )
          .catch(() => {
            /* falha de email não quebra registro */
          });
      }

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
  // GET /auth/me (T439 — ProtectedRoute): perfil resumido do usuário da
  // sessão atual. 401 sem token; nunca expõe passwordHash.
  // -----------------------------------------------------------------
  app.get('/auth/me', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user!.id;
    const user = await withRlsContext({ userId, role: 'USER' }, async (tx) =>
      tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          emailVerified: true,
          createdAt: true,
        },
      }),
    );
    if (!user || user.status !== 'ACTIVE') {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Sessão inválida' },
      });
    }
    const roles = (await getUserRoles(userId)).map((r) => r.name);
    return reply.send({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified != null,
        createdAt: user.createdAt,
        roles,
      },
    });
  });

  // -----------------------------------------------------------------
  // POST /auth/login
  // -----------------------------------------------------------------
  app.post('/auth/login', async (request, reply) => {
    try {
      const input = LoginSchema.parse(request.body);
      const metadata = extractMetadata(request);

      // Proteção contra força bruta (item 3.8): 5 tentativas/15min, lockout 1h
      const rlKey = loginRateLimitKey(metadata.ipAddress ?? request.ip, input.email);
      const check = await checkLoginAttempt(rlKey);
      if (!check.allowed) {
        return reply.status(429).send({
          error: {
            code: 'RATE_LIMIT_LOCKOUT',
            message: 'Muitas tentativas de login. Conta temporariamente bloqueada.',
            lockedUntil: check.lockedUntil?.toISOString(),
          },
        });
      }

      try {
        const result = await login(input, metadata);
        await registerLoginSuccess(rlKey);

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
      } catch (loginErr) {
        // Só conta falha de credencial (AuthError 401); erros de validação não contam
        if (loginErr instanceof AuthError && loginErr.statusCode === 401) {
          await registerLoginFailure(rlKey);
        }
        throw loginErr;
      }
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

  // -----------------------------------------------------------------
  // POST /auth/forgot-password
  // -----------------------------------------------------------------
  app.post('/auth/forgot-password', async (request, reply) => {
    try {
      const { email } = ForgotPasswordSchema.parse(request.body);
      const result = await createPasswordResetToken(email);

      if (result) {
        mailerService.sendPasswordResetEmail(result.email, result.name, result.token).catch(() => {
          /* falha de email não quebra o fluxo */
        });
      }

      // Sempre retorna 200 (não revela se email existe)
      return reply.status(200).send({
        data: { message: 'Se o email existir, você receberá um link de redefinição.' },
      });
    } catch (err) {
      handleAuthError(err, reply);
    }
  });

  // -----------------------------------------------------------------
  // POST /auth/reset-password
  // -----------------------------------------------------------------
  app.post('/auth/reset-password', async (request, reply) => {
    try {
      const { token, password } = ResetPasswordSchema.parse(request.body);
      const userId = await consumePasswordResetToken(token);
      if (!userId) {
        throw new AuthError('Token inválido ou expirado');
      }
      await resetPasswordService(userId, password);
      return reply.status(200).send({
        data: { message: 'Senha redefinida com sucesso.' },
      });
    } catch (err) {
      handleAuthError(err, reply);
    }
  });

  // -----------------------------------------------------------------
  // POST /auth/verify-email
  // -----------------------------------------------------------------
  app.post('/auth/verify-email', async (request, reply) => {
    try {
      const { token } = VerifyEmailSchema.parse(request.body);
      const userId = await consumeEmailVerificationToken(token);
      if (!userId) {
        throw new AuthError('Token inválido ou expirado');
      }
      return reply.status(200).send({
        data: { message: 'Email verificado com sucesso.' },
      });
    } catch (err) {
      handleAuthError(err, reply);
    }
  });
};
