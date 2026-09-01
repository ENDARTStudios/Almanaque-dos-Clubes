import type { FastifyRequest, FastifyReply } from 'fastify';
import { randomBytes } from 'node:crypto';

const CSRF_TOKEN_HEADER = 'x-csrf-token';
const tokenStore = new Map<string, number>();

// Limpa tokens expirados a cada hora (evita crescimento ilimitado do Map)
const cleanupTimer = setInterval(
  () => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const [token, createdAt] of tokenStore) {
      if (createdAt < cutoff) tokenStore.delete(token);
    }
  },
  60 * 60 * 1000,
);
cleanupTimer.unref?.();

/**
 * Gera token CSRF de uso único, válido por 24h.
 * O `userId` identifica o dono do token para fins de auditoria futura
 * (atualmente o token é anônimo — ver csrfMiddleware).
 */
export function generateCsrfToken(userId: string): string {
  const token = randomBytes(32).toString('base64url');
  tokenStore.set(token, Date.now());
  // Auditoria: associação token→usuário pode ser persistida futuramente.
  void userId;
  return token;
}

/**
 * Middleware CSRF (Double-Submit simplificado com token de uso único).
 *
 * Aplicado apenas a métodos de escrita (POST/PUT/PATCH/DELETE).
 * Rotas públicas de auth são exceção — o cliente ainda não possui token
 * (registradas em CSRF_EXEMPT_PREFIXES).
 *
 * Fluxo: cliente autenticado chama GET /api/v1/auth/csrf-token (ou recebe
 * no login) e envia o token no header `x-csrf-token` nas escritas.
 */
const CSRF_EXEMPT_PREFIXES = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/refresh',
  '/api/v1/auth/logout',
  '/api/v1/health',
  '/api/v1/metrics',
  '/api/v1/billing/webhook',
];

export async function csrfMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
  const url = request.raw.url ?? '';
  if (CSRF_EXEMPT_PREFIXES.some((prefix) => url.startsWith(prefix))) return;

  const token = request.headers[CSRF_TOKEN_HEADER] as string | undefined;
  if (!token || !tokenStore.has(token)) {
    reply
      .status(403)
      .send({ error: { code: 'CSRF_INVALID', message: 'CSRF token inválido ou ausente' } });
    return;
  }
  tokenStore.delete(token);
}
