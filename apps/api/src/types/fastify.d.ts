/**
 * Augmentation de tipos do Fastify — adiciona:
 * - app.jwt (instância JWT do plugin @fastify/jwt)
 * - request.user (AuthUser anexado pelo middleware de autenticação)
 * - FastifyJWT.payload (tipo do payload decodificado)
 *
 * Este arquivo é automaticamente carregado pelo TypeScript (declaration merging).
 */
import type { JWT } from '@fastify/jwt';
import type { AccessTokenPayload, RefreshTokenPayload, AuthUser } from '../modules/auth/jwt.service.js';

declare module 'fastify' {
  interface FastifyInstance {
    jwt: JWT;
  }

  interface FastifyRequest {
    /**
     * Usuário autenticado. Definido pelo hook `authenticate` (Tarefa 3.4).
     * Undefined em rotas públicas.
     */
    user?: AuthUser;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AccessTokenPayload | RefreshTokenPayload;
    user: AuthUser;
  }
}
