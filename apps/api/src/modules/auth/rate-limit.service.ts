/**
 * Rate limiting específico para rotas /auth/* (Tarefa 3.8).
 *
 * Estratégia em memória (Fase 3):
 * - Login attempt: max 5 por IP a cada 15 minutos
 * - Lockout progressivo: após 5 falhas, próximos 5 retornam 429
 * - Após 10 falhas, lockout de 1 hora
 *
 * Redis (Fase 6):
 * - Usar @fastify/rate-limit com store Redis
 * - Compartilhado entre instâncias
 */

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  lockoutMs: number;
}

const LOGIN_RATE_LIMIT: Record<string, RateLimitConfig> = {
  LOGIN: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 min
    lockoutMs: 60 * 60 * 1000, // 1 hora após 10 falhas
  },
  FORGOT_PASSWORD: {
    maxAttempts: 3,
    windowMs: 15 * 60 * 1000, // 15 min
    lockoutMs: 60 * 60 * 1000, // 1 hora
  },
};

// Cache em memória (fallback quando Redis não disponível)
const memoryStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Incrementa tentativa de autenticação e verifica se deve bloquear.
 * Retorna true se permitido, false se bloqueado.
 */
export async function checkAuthRateLimit(
  key: 'LOGIN' | 'FORGOT_PASSWORD',
  identifier: string, // IP ou email
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const config = LOGIN_RATE_LIMIT[key];
  const now = Date.now();

  // Fallback em memória
  const stored = memoryStore.get(`${key}:${identifier}`);

  if (!stored || stored.resetAt < now) {
    memoryStore.set(`${key}:${identifier}`, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return { allowed: true };
  }

  if (stored.count >= config.maxAttempts) {
    const retryAfter = Math.ceil((stored.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  stored.count++;
  memoryStore.set(`${key}:${identifier}`, stored);

  return { allowed: true };
}

/**
 * Reseta contador após login bem-sucedido.
 */
export async function resetAuthRateLimit(
  key: 'LOGIN' | 'FORGOT_PASSWORD',
  identifier: string,
): Promise<void> {
  memoryStore.delete(`${key}:${identifier}`);
}
