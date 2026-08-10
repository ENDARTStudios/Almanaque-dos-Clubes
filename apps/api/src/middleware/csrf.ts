import type { FastifyRequest, FastifyReply } from 'fastify';
import { randomBytes } from 'node:crypto';

const CSRF_TOKEN_HEADER = 'x-csrf-token';
const tokenStore = new Map<string, number>();

export function generateCsrfToken(userId: string): string {
  const token = randomBytes(32).toString('base64url');
  tokenStore.set(token, Date.now());
  setTimeout(() => tokenStore.delete(token), 24 * 60 * 60 * 1000);
  return token;
}

export async function csrfMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
  const token = request.headers[CSRF_TOKEN_HEADER] as string | undefined;
  if (!token || !tokenStore.has(token)) {
    reply.status(403).send({ error: { code: 'CSRF_INVALID', message: 'CSRF token inválido ou ausente' } });
    return;
  }
  tokenStore.delete(token);
}
