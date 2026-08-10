import type { FastifyRequest, FastifyReply } from 'fastify';

const idempotencyStore = new Map<string, { status: number; body: unknown }>();
const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000;

export async function idempotencyMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (request.method === 'GET' || request.method === 'DELETE') return;
  const key = request.headers['idempotency-key'] as string | undefined;
  if (!key) return;
  const existing = idempotencyStore.get(key);
  if (existing) {
    reply.status(existing.status).send(existing.body);
    return;
  }
  const originalSend = reply.send.bind(reply);
  reply.send = (payload: unknown) => {
    idempotencyStore.set(key, { status: reply.statusCode, body: payload });
    setTimeout(() => idempotencyStore.delete(key), IDEMPOTENCY_TTL);
    return originalSend(payload);
  };
}
