import { Redis } from 'ioredis';

const redis = new Redis({ host: process.env.REDIS_HOST || 'localhost', port: Number(process.env.REDIS_PORT) || 6379, maxRetriesPerRequest: 3 });

const DEFAULT_TTL_SECONDS = 300;

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try { const raw = await redis.get(key); return raw ? JSON.parse(raw) as T : null; }
    catch { return null; }
  },
  async set(key: string, value: unknown, ttlSeconds = DEFAULT_TTL_SECONDS): Promise<void> {
    try { await redis.setex(key, ttlSeconds, JSON.stringify(value)); } catch { /* ignore */ }
  },
  async invalidate(pattern: string): Promise<void> {
    try { const keys = await redis.keys(pattern); if (keys.length > 0) await redis.del(...keys); } catch { /* ignore */ }
  },
  async remember<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const value = await fetcher();
    await this.set(key, value, ttlSeconds);
    return value;
  },
};
