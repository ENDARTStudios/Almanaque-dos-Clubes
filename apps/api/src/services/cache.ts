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
  async invalidate(pattern: string): Promise<void> {
    if (!redis) return;
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) await redis.del(...keys);
    } catch {
      /* ignore */
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
