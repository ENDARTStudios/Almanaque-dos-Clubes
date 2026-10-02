/**
 * Middleware de autenticação para rotas protegidas.
 *
 * Tarefa 3.4 — Middleware de Autenticação (`authenticate` preHandler)
 *
 * Fluxo:
 * 1. Extrai access_token do cookie httpOnly
 * 2. Verifica assinatura JWT via app.jwt (Fastify JWT plugin)
 * 3. Popula request.user com AuthUser
 *
 * Segurança:
 * - Nunca aceita refresh token como access token
 * - Token expirado retorna 401 (não 403)
 * - Validação de tipo: previne confusion attacks
 */
import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../../config/env.js';
import { isAccessBlocked } from './access-blocklist.service.js';

/**
 * Payload do access token validado.
 */
interface ValidatedPayload {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
  type: 'access';
}

/**
 * PreHandler para proteger rotas.
 *
 * Uso:
 *   app.get('/protected', { preHandler: authenticate }, handler);
 *
 * Resposta 401 se:
 * - Cookie access_token ausente
 * - Token inválido (assinatura corrompida)
 * - Token expirado
 * - Token type !== 'access' (confusion attack)
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const cookieName = env.isProd ? '__Host-access_token' : 'access_token';
  const accessToken = (request.cookies as Record<string, string | undefined> | undefined)?.[
    cookieName
  ];

  if (!accessToken) {
    return reply.status(401).send({
      error: { code: 'UNAUTHORIZED', message: 'Acesso não autorizado' },
    });
  }

  let payload: ValidatedPayload | null = null;
  try {
    // Usa app.jwt.verify() do @fastify/jwt plugin
    // O app está tipado com JWT via src/types/fastify.d.ts
    const decoded = request.server.jwt.verify(accessToken) as Record<string, unknown>;

    // Defense in depth: rejeita tokens com type != 'access'
    if (decoded.type !== 'access') {
      payload = null;
    } else {
      payload = {
        sub: decoded.sub as string,
        email: decoded.email as string,
        roles: decoded.roles as string[],
        permissions: decoded.permissions as string[],
        type: 'access',
      };
    }
  } catch {
    // Erro de verificação (expirado, assinatura inválida, etc.)
  }

  if (!payload) {
    return reply.status(401).send({
      error: { code: 'UNAUTHORIZED', message: 'Acesso não autorizado' },
    });
  }

  // T470b — blocklist: invalida access tokens já emitidos de conta excluída
  // (stateless não os revoga sozinho). Fail-open na leitura (Redis fora => log).
  if (await isAccessBlocked(payload.sub)) {
    return reply.status(401).send({
      error: { code: 'UNAUTHORIZED', message: 'Acesso não autorizado' },
    });
  }

  // Anexa usuário à request (Fastify tipado em src/types/fastify.d.ts)
  (
    request as { user?: { id: string; email: string; roles: string[]; permissions: string[] } }
  ).user = {
    id: payload.sub,
    email: payload.email,
    roles: payload.roles,
    permissions: payload.permissions,
  };
}

/**
 * PreHandler para verificar permissão específica.
 *
 * Uso:
 *   app.delete('/clubs/:id', { preHandler: [authenticate, requirePermission('clubs:delete')] }, handler);
 *
 * Resposta 403 se:
 * - Usuário não tem a permissão requerida
 */
export function requirePermission(permission: string) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = (
      request as { user?: { id: string; email: string; roles: string[]; permissions: string[] } }
    ).user;

    if (!user) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Acesso não autorizado' },
      });
    }

    if (!user.permissions.includes(permission)) {
      return reply.status(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Permissão negada',
        },
      });
    }
  };
}

/**
 * PreHandler para verificar role específica.
 *
 * Uso:
 *   app.post('/admin/users', { preHandler: [authenticate, requireRole('admin')] }, handler);
 */
export function requireRole(role: string) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = (
      request as { user?: { id: string; email: string; roles: string[]; permissions: string[] } }
    ).user;

    if (!user) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Acesso não autorizado' },
      });
    }

    if (!user.roles.includes(role)) {
      return reply.status(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Acesso negado',
        },
      });
    }
  };
}
