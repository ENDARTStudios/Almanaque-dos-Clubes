import { Redis } from 'ioredis';
import { logger } from '../config/logger.js';

function createRedisClient() {
  const url = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL;
  if (url) {
    try {
      const client = new Redis(url, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        enableOfflineQueue: false,
      });
      client.on('error', () => {
        /* fallback silencioso */
      });
      return client;
    } catch {
      logger.warn('[cache] REDIS_URL inválida — cache desabilitado');
      return null;
    }
  }
  try {
    const client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    client.on('error', () => {
      /* fallback silencioso */
    });
    return client;
  } catch {
    logger.warn('[cache] Redis indisponível — cache desabilitado');
    return null;
  }
}

let redis: Redis | null = createRedisClient();

const DEFAULT_TTL_SECONDS = 300;

export interface CacheInvalidationResult {
  ok: boolean;
  keysDeleted: number;
  /** Presente quando ok=false — NUNCA silenciado: também logado em warn aqui. */
  error?: Error;
}

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    if (!redis) return null;
    try {
      const raw = await redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  async set(key: string, value: unknown, ttlSeconds = DEFAULT_TTL_SECONDS): Promise<void> {
    if (!redis) return;
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  },
  /**
   * T448d — fail-loud: invalidação é caminho de ESCRITA/consistência de dado
   * público — falha de Redis aqui deixou a vitrine de campeões velha por 2
   * rodadas porque o catch engolia (mesma classe do logout-400 #156 e do
   * refund-skip #146). Regra permanente: write/invalidation paths nunca
   * engolem erro — o erro volta estruturado E é logado em warn aqui.
   */
  async invalidate(pattern: string): Promise<CacheInvalidationResult> {
    if (!redis) return { ok: true, keysDeleted: 0 };
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) await redis.del(...keys);
      return { ok: true, keysDeleted: keys.length };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.warn(
        { pattern, error: error.message },
        '[cache] falha ao invalidar — dado pode ficar stale',
      );
      return { ok: false, keysDeleted: 0, error };
    }
  },
  async remember<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const value = await fetcher();
    await this.set(key, value, ttlSeconds);
    return value;
  },
};
