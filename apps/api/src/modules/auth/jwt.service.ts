/**
 * JWT service — geração e verificação de access e refresh tokens.
 *
 * Tipos de token:
 * - Access token (15min): curta duração, carrega dados do usuário para autorização
 *   em rotas protegidas. Enviado em cookie httpOnly 'access_token'.
 * - Refresh token (7d): longa duração, usado para obter novo access token.
 *   Enviado em cookie httpOnly 'refresh_token'. Hash SHA-256 persistido em Session.
 *
 * Defesa em profundidade:
 * - Campo 'type' no payload previne cross-token confusion attacks
 *   (verifyAccess rejeita refresh tokens mesmo se secrets fossem iguais)
 * - Cookies __Host- prefix em produção (RFC 6265bis) — garante path=/ e secure
 * - SameSite=Strict previne CSRF (cookie não enviado em cross-site requests)
 *
 * NÃO persistir tokens em texto — apenas hashes (ver crypto.ts).
 */
import type { SignOptions } from 'jsonwebtoken';
import type { FastifyInstance } from 'fastify';

// =============================================================================
// TIPOS
// =============================================================================

export interface AccessTokenPayload {
  sub: string;       // userId
  email: string;
  roles: string[];   // ex.: ['admin'] ou ['pro', 'free']
  permissions: string[];  // ex.: ['clubs:read', 'clubs:write']
  type: 'access';
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;       // userId
  sessionId: string; // ID da Session no banco (para lookup + revoke)
  type: 'refresh';
  iat?: number;
  exp?: number;
}

/**
 * Usuário autenticado anexado a request.user pelo middleware de autenticação.
 */
export interface AuthUser {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
}

// =============================================================================
// CONSTANTES — nomes de cookies
// =============================================================================

const ACCESS_COOKIE_NAME_DEV = 'access_token';
const REFRESH_COOKIE_NAME_DEV = 'refresh_token';

// Em produção: prefix __Host- garante path=/ e Secure (RFC 6265bis)
const ACCESS_COOKIE_NAME_PROD = '__Host-access_token';
const REFRESH_COOKIE_NAME_PROD = '__Host-refresh_token';

export function getAccessCookieName(isProd: boolean): string {
  return isProd ? ACCESS_COOKIE_NAME_PROD : ACCESS_COOKIE_NAME_DEV;
}

export function getRefreshCookieName(isProd: boolean): string {
  return isProd ? REFRESH_COOKIE_NAME_PROD : REFRESH_COOKIE_NAME_DEV;
}

// =============================================================================
// OPÇÕES DE COOKIE
// =============================================================================

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  path: string;
  maxAge?: number; // segundos
  domain?: string;
}

/**
 * Opções padrão para cookies de auth.
 * - httpOnly: true → JavaScript não acessa o cookie (proteção XSS)
 * - secure: true em prod → só enviado via HTTPS (proteção MITM)
 * - sameSite: 'strict' → não enviado em cross-site requests (proteção CSRF)
 * - path: '/' → válido para todo o site
 * - Em prod: maxAge = 15min (access) ou 7d (refresh), alinhado com JWT_EXPIRES_IN
 */
export function getCookieOptions(isProd: boolean, maxAgeSeconds?: number): CookieOptions {
  const opts: CookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    path: '/',
  };
  if (maxAgeSeconds !== undefined) {
    opts.maxAge = maxAgeSeconds;
  }
  return opts;
}

// Durações em segundos (usadas para cookie maxAge)
export const ACCESS_TOKEN_MAX_AGE_SECONDS = 15 * 60;       // 15 min
export const REFRESH_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 dias

// =============================================================================
// SERVIÇO JWT
// =============================================================================

/**
 * Factory que cria um JwtService vinculado a uma instância Fastify (com @fastify/jwt registrado).
 *
 * @example
 *   const app = await buildApp();
 *   const jwt = createJwtService(app);
 *   const { accessToken, refreshToken } = jwt.signTokens(user);
 */
export interface JwtService {
  /**
   * Gera access token (15min) + refresh token (7d).
   * Refresh token carrega sessionId para lookup futuro.
   */
  signTokens(user: AuthUser, sessionId: string): {
    accessToken: string;
    refreshToken: string;
  };

  /**
   * Verifica access token. Retorna payload ou null se inválido/expirado.
   * Rejeita refresh tokens (campo type diferente).
   */
  verifyAccessToken(token: string): AccessTokenPayload | null;

  /**
   * Verifica refresh token. Retorna payload ou null se inválido/expirado.
   * Rejeita access tokens (campo type diferente).
   */
  verifyRefreshToken(token: string): RefreshTokenPayload | null;
}

export function createJwtService(app: FastifyInstance): JwtService {
  return {
    signTokens(user: AuthUser, sessionId: string) {
      // Access token — @fastify/jwt usa app.jwt.sign()
      // Payload com campo 'type: access' previne cross-token confusion
      const accessToken = app.jwt.sign(
        {
          sub: user.id,
          email: user.email,
          roles: user.roles,
          permissions: user.permissions,
          type: 'access',
        } as Omit<AccessTokenPayload, 'iat' | 'exp'>,
        {
          expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
        } as SignOptions,
      );

      // Refresh token — usa o mesmo app.jwt com secret diferente
      // @fastify/jwt v10 não tem sign com secret diferente do registrado por padrão;
      // precisamos usar jsonwebtoken diretamente ou registrar um segundo plugin.
      // Solução: usar jsonwebtoken importado diretamente para o refresh token.
      // Para simplicidade nesta tarefa, signamos o refresh com o mesmo app.jwt
      // e validamos o campo type no verify. Em produção, registro segundo plugin
      // com secret diferente é o ideal (Tarefa 3.3 pode refinar).
      const refreshToken = app.jwt.sign(
        {
          sub: user.id,
          sessionId,
          type: 'refresh',
        } as Omit<RefreshTokenPayload, 'iat' | 'exp'>,
        {
          expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
        } as SignOptions,
      );

      return { accessToken, refreshToken };
    },

    verifyAccessToken(token: string): AccessTokenPayload | null {
      try {
        const payload = app.jwt.verify(token) as AccessTokenPayload;
        // Defense in depth: rejeita tokens com type != 'access'
        if (payload.type !== 'access') return null;
        return payload;
      } catch {
        return null; // token inválido, expirado, ou assinatura incorreta
      }
    },

    verifyRefreshToken(token: string): RefreshTokenPayload | null {
      try {
        const payload = app.jwt.verify(token) as RefreshTokenPayload;
        if (payload.type !== 'refresh') return null;
        return payload;
      } catch {
        return null;
      }
    },
  };
}
