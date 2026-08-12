/**
 * Rate limiting específico para /auth/* — proteção contra força bruta.
 *
 * Política (PLANO_MESTRE.md item 3.8 / 7.5):
 *   - Máx. 5 tentativas falhas por janela de 15 minutos (por chave IP+email)
 *   - Ao estourar: lockout de 1 hora
 *
 * Store: Redis quando disponível; fallback em memória (single-instance dev).
 * O store em memória é aceitável em dev e em produção single-instance
 * (DECISOES.md 2026-07-20 — cache RBAC em memória, mesmo trade-off).
 */
import { Redis } from 'ioredis';
import { logger } from '../../config/logger.js';

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  lockoutMs: number;
}

export const LOGIN_RATE_LIMIT: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 min
  lockoutMs: 60 * 60 * 1000, // 1 h
};

interface AttemptRecord {
  count: number;
  windowStart: number;
  lockedUntil: number | null;
}

const memoryStore = new Map<string, AttemptRecord>();

// Limpa registros expirados a cada 10 min (evita crescimento ilimitado)
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, rec] of memoryStore) {
    const windowExpired = now - rec.windowStart > LOGIN_RATE_LIMIT.windowMs;
    const lockExpired = rec.lockedUntil === null || now > rec.lockedUntil;
    if (windowExpired && lockExpired) memoryStore.delete(key);
  }
}, CLEANUP_INTERVAL_MS);
cleanupTimer.unref?.();

let redis: Redis | null = null;
try {
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
  });
  redis.on('error', () => {
    /* fallback silencioso para memória */
  });
} catch {
  redis = null;
  logger.warn('[rate-limit] Redis indisponível — usando store em memória');
}

const REDIS_PREFIX = 'rl:auth:';

async function redisGet(key: string): Promise<AttemptRecord | null> {
  if (!redis) return null;
  try {
    const raw = await redis.get(REDIS_PREFIX + key);
    return raw ? (JSON.parse(raw) as AttemptRecord) : null;
  } catch {
    return null;
  }
}

async function redisSet(key: string, rec: AttemptRecord): Promise<void> {
  if (!redis) return;
  try {
    const ttlMs = Math.max(
      LOGIN_RATE_LIMIT.windowMs,
      rec.lockedUntil !== null ? rec.lockedUntil - Date.now() : 0,
    );
    await redis.set(REDIS_PREFIX + key, JSON.stringify(rec), 'PX', Math.max(ttlMs, 1000));
  } catch {
    /* ignore */
  }
}

async function getRecord(key: string): Promise<AttemptRecord> {
  const fromRedis = await redisGet(key);
  if (fromRedis) return fromRedis;
  return memoryStore.get(key) ?? { count: 0, windowStart: Date.now(), lockedUntil: null };
}

async function setRecord(key: string, rec: AttemptRecord): Promise<void> {
  memoryStore.set(key, rec);
  await redisSet(key, rec);
}

export interface RateLimitCheckResult {
  allowed: boolean;
  lockedUntil: Date | null;
  remainingAttempts: number;
}

/**
 * Verifica se a chave (ex.: `ip:email`) pode tentar autenticar agora.
 */
export async function checkLoginAttempt(key: string): Promise<RateLimitCheckResult> {
  const now = Date.now();
  const rec = await getRecord(key);

  if (rec.lockedUntil !== null && now < rec.lockedUntil) {
    return { allowed: false, lockedUntil: new Date(rec.lockedUntil), remainingAttempts: 0 };
  }

  // Janela expirada → reset suave
  if (now - rec.windowStart > LOGIN_RATE_LIMIT.windowMs) {
    rec.count = 0;
    rec.windowStart = now;
    rec.lockedUntil = null;
    await setRecord(key, rec);
  }

  return {
    allowed: true,
    lockedUntil: null,
    remainingAttempts: LOGIN_RATE_LIMIT.maxAttempts - rec.count,
  };
}

/**
 * Registra falha de login. Ao atingir o limite, aplica lockout.
 */
export async function registerLoginFailure(key: string): Promise<RateLimitCheckResult> {
  const now = Date.now();
  const rec = await getRecord(key);

  if (now - rec.windowStart > LOGIN_RATE_LIMIT.windowMs) {
    rec.count = 0;
    rec.windowStart = now;
    rec.lockedUntil = null;
  }

  rec.count += 1;
  if (rec.count >= LOGIN_RATE_LIMIT.maxAttempts) {
    rec.lockedUntil = now + LOGIN_RATE_LIMIT.lockoutMs;
    logger.warn({ key }, '[rate-limit] Lockout aplicado após %d tentativas', rec.count);
  }

  await setRecord(key, rec);
  return {
    allowed: rec.lockedUntil === null,
    lockedUntil: rec.lockedUntil !== null ? new Date(rec.lockedUntil) : null,
    remainingAttempts: Math.max(0, LOGIN_RATE_LIMIT.maxAttempts - rec.count),
  };
}

/**
 * Login bem-sucedido → zera contadores.
 */
export async function registerLoginSuccess(key: string): Promise<void> {
  memoryStore.delete(key);
  if (redis) {
    try {
      await redis.del(REDIS_PREFIX + key);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Helper: chave composta IP+email (normalizada).
 */
export function loginRateLimitKey(ip: string, email: string): string {
  return `${ip}:${email.toLowerCase().trim()}`;
}
