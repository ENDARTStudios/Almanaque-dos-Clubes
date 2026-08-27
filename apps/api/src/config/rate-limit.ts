/**
 * Rate limiting avançado (T384, item 7.3) — janela deslizante por usuário+IP.
 *
 * - Chave: usuário autenticado → `u:<userId>`; anônimo → `ip:<ip>`.
 * - Store: Redis (ZADD + ZREMRANGEBYSCORE, janela deslizante real) quando
 *   REDIS_URL/REDIS_HOST disponível; fallback em memória por instância
 *   (single-instance dev / falha do Redis — a proteção nunca desaparece).
 * - 429 com header `Retry-After`, sem dados internos no corpo.
 */
import { Redis } from 'ioredis';
import type { FastifyRequest, FastifyReply } from 'fastify';

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  prefix: string;
}

const memoryStore = new Map<string, number[]>();

const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, arr] of memoryStore) {
    if (arr.every((t) => t <= now - 24 * 60 * 60 * 1000)) memoryStore.delete(key);
  }
}, CLEANUP_INTERVAL_MS);
cleanupTimer.unref?.();

function createRedisClient(): Redis | null {
  const url = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL;
  try {
    const client = url
      ? new Redis(url, { maxRetriesPerRequest: 1, enableOfflineQueue: false, lazyConnect: true })
      : new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: Number(process.env.REDIS_PORT) || 6379,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          lazyConnect: true,
        });
    client.on('error', () => {
      /* fallback silencioso */
    });
    return client;
  } catch {
    return null;
  }
}

let redis: Redis | null = createRedisClient();

function memoryConsume(key: string, now: number, windowMs: number): number {
  const cutoff = now - windowMs;
  const arr = (memoryStore.get(key) ?? []).filter((t) => t > cutoff);
  arr.push(now);
  memoryStore.set(key, arr);
  return arr.length;
}

async function redisConsume(key: string, now: number, windowMs: number): Promise<number> {
  if (!redis) return memoryConsume(key, now, windowMs);
  const member = `${now}:${Math.random().toString(36).slice(2)}`;
  try {
    const fullKey = `rl:${key}`;
    const pipeline = redis.pipeline();
    pipeline.zadd(fullKey, now, member);
    pipeline.zremrangebyscore(fullKey, '-inf', now - windowMs);
    pipeline.zcard(fullKey);
    pipeline.pexpire(fullKey, windowMs);
    const results = await pipeline.exec();
    const count = (results?.[2]?.[1] as number | undefined) ?? memoryConsume(key, now, windowMs);
    return count;
  } catch {
    return memoryConsume(key, now, windowMs);
  }
}

export function createSlidingWindowLimiter(options: RateLimitOptions) {
  return {
    async consume(key: string, now = Date.now()) {
      const count = await redisConsume(`${options.prefix}:${key}`, now, options.windowMs);
      return {
        allowed: count <= options.max,
        retryAfterMs: options.windowMs,
        count,
      };
    },
  };
}

/**
 * Middleware (preHandler/onRequest) com chave usuário+IP.
 * Usuário autenticado → `u:<userId>`; anônimo → `ip:<ip>`.
 */
export function rateLimitByUserOrIp(options: RateLimitOptions) {
  const limiter = createSlidingWindowLimiter(options);
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = (request as { user?: { id: string } }).user;
    const key = user ? `u:${user.id}` : `ip:${request.ip}`;
    const { allowed, retryAfterMs } = await limiter.consume(key);
    if (!allowed) {
      reply.header('Retry-After', Math.ceil(retryAfterMs / 1000));
      await reply.status(429).send({
        error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Muitas requisições' },
      });
    }
  };
}

export const AUTH_WINDOW = { windowMs: 60 * 1000, max: 20, prefix: 'auth' };
