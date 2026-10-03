import { Redis } from 'ioredis';
import { logger } from '../config/logger.js';

function createRedisClient() {
  // lazyConnect=false (conecta no boot) + enableOfflineQueue default (true):
  // a combinação anterior (lazyConnect:true + enableOfflineQueue:false) deixava
  // o client em DEAD-SILENT em produção — todo get/set falhava sem log e o
  // cache inteiro operava como no-op (T451: marcador de new-titles nunca
  // gravado; T471: inventário de cache sempre 0). Falha agora é logada.
  const options = {
    maxRetriesPerRequest: 3,
    connectTimeout: 10_000,
  };
  const url = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL;
  const client = url
    ? new Redis(url, options)
    : new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        ...options,
      });
  let warned = false;
  client.on('error', (err) => {
    if (!warned) {
      warned = true;
      logger.warn(
        { err: err.message },
        '[cache] erro de Redis (warn único; fallback ao banco permanece)',
      );
    }
  });
  return client;
}

let redis: Redis | null = createRedisClient();

const DEFAULT_TTL_SECONDS = 300;
/**
 * Offline queue (default pós-#313) enfileira comandos com Redis inalcançável
 * em vez de rejeitar — sem este teto, cache.remember pendura o request até o
 * fim (p.ex. dev local sem Redis, ou outage real em produção). 1.5s e fallback
 * ao banco, sempre.
 */
const COMMAND_TIMEOUT_MS = 1500;
function withTimeout<T>(p: Promise<T>): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`cache: redis timeout ${COMMAND_TIMEOUT_MS}ms`)),
        COMMAND_TIMEOUT_MS,
      ),
    ),
  ]);
}

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
      const raw = await withTimeout(redis.get(key));
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  async set(key: string, value: unknown, ttlSeconds = DEFAULT_TTL_SECONDS): Promise<void> {
    if (!redis) return;
    try {
      await withTimeout(redis.setex(key, ttlSeconds, JSON.stringify(value)));
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
      const keys = await withTimeout(redis.keys(pattern));
      if (keys.length > 0) await withTimeout(redis.del(...keys));
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
