/**
 * Hardening de superfície de requisição (T385, itens 7.6/7.7) + guarda de
 * produção da flag RATE_LIMIT_DISABLED (gap registrado em T384).
 *
 * 7.6 — Métodos HTTP: apenas o conjunto usado pela API (GET/POST/PUT/PATCH/DELETE).
 *       TRACE e demais métodos não usados (HEAD, CONNECT, PURGE, ...) → 405
 *       padronizado com header `Allow`. OPTIONS passa apenas como preflight CORS
 *       (identificado por Origin + Access-Control-Request-Method); OPTIONS "solto"
 *       também recebe 405.
 *
 * 7.7 — Body limit: 1 MiB padrão (bodyLimit global do Fastify); rotas de upload
 *       (/api/v1/upload, /api/v1/upload/csv) usam override de 50 MiB por rota
 *       (cobre content-types não-multipart; para multipart o gate efetivo é o
 *       fileSize do @fastify/multipart, também 50 MiB via UPLOAD_MAX_BYTES).
 *       Excesso → 413 padronizado, sem stack trace nem detalhes internos.
 *
 * Guarda: RATE_LIMIT_DISABLED=true com NODE_ENV=production falha o boot
 * (assertRateLimitGuard é chamada na carga da config de ambiente).
 */
import type { FastifyReply, FastifyRequest } from 'fastify';

/** Conjunto de métodos HTTP usados pela API (superfície mínima — 7.6). */
export const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

/** 1 MiB — limite padrão de corpo de requisição (7.7). */
export const DEFAULT_BODY_LIMIT_BYTES = 1024 * 1024;

/** 50 MiB — limite por rota para endpoints de upload (7.7). */
export const UPLOAD_BODY_LIMIT_BYTES = 50 * 1024 * 1024;

/** Header `Allow` dos 405: métodos aceitos + OPTIONS de preflight. */
export const ALLOW_HEADER = [...ALLOWED_METHODS, 'OPTIONS'].join(', ');

/** Resposta 413 padronizada (sem stack trace, sem detalhes internos). */
export const PAYLOAD_TOO_LARGE_ERROR = {
  code: 'PAYLOAD_TOO_LARGE',
  message: 'Corpo da requisição excede o limite permitido',
} as const;

/**
 * Preflight CORS é o único OPTIONS aceito: requer Origin e
 * Access-Control-Request-Method (o @fastify/cors responde 204).
 */
export function isCorsPreflight(request: FastifyRequest): boolean {
  return (
    request.method === 'OPTIONS' &&
    request.headers.origin !== undefined &&
    request.headers['access-control-request-method'] !== undefined
  );
}

export function isMethodAllowed(method: string): boolean {
  return (ALLOWED_METHODS as readonly string[]).includes(method);
}

/** 405 padronizado — genérico, sem vazar detalhes internos. */
export function methodNotAllowed(reply: FastifyReply, method: string): FastifyReply {
  return reply
    .header('Allow', ALLOW_HEADER)
    .status(405)
    .send({
      error: { code: 'METHOD_NOT_ALLOWED', message: `Método HTTP ${method} não é aceito pela API` },
    });
}

/**
 * Gate de métodos (7.6) — registrado como primeiro onRequest em buildApp,
 * rejeita antes de qualquer plugin/middleware.
 */
export async function httpMethodGate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (isMethodAllowed(request.method)) return;
  if (isCorsPreflight(request)) return; // preflight é decidido pelo CORS (204)
  methodNotAllowed(reply, request.method);
}

/**
 * Guarda de boot (fecha gap de T384): a flag de desligamento do rate limit é
 * escape hatch de teste/carga e não pode existir em produção.
 * Lança erro claro — o processo não sobe.
 */
export function assertRateLimitGuard(nodeEnv: string, rateLimitDisabled: boolean): void {
  if (nodeEnv === 'production' && rateLimitDisabled) {
    throw new Error(
      'RATE_LIMIT_DISABLED=true não é permitida com NODE_ENV=production: o rate limiting ' +
        'é controle de segurança obrigatório em produção. Remova a flag antes de iniciar.',
    );
  }
}
