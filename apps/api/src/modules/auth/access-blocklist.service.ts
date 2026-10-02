/**
 * T470b — Blocklist de access token (fecha o gap dos 15 min pós-exclusão de conta).
 *
 * O `authenticate` é stateless puro (só `jwt.verify`, sem DB). Para invalidar um
 * access token já emitido sem quebrar o stateless, mantemos uma blocklist por
 * `userId` no Redis com TTL = 15 min (vida máxima do access token). O DELETE de
 * conta escreve a blocklist ANTES de anonimizar, cobre TODOS os devices e é
 * FAIL-LOUD: se o Redis falhar na escrita, o DELETE NÃO retorna 200 falso.
 * Na LEITURA, Redis indisponível => fail-open COM log alto (não derruba toda a
 * autenticação num outage; reabre o gap só durante o outage).
 */
import { Redis } from 'ioredis';
import { logger } from '../../config/logger.js';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const key = (userId: string) => `auth:blocklist:access:${userId}`;

let client: Redis | null | undefined;

function getClient(): Redis | null {
  if (client !== undefined) return client;
  try {
    const url = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL;
    // enableOfflineQueue default (true): enfileira até conectar — evita falso
    // fail-loud no cold-start; se o Redis estiver REALMENTE fora, os comandos
    // esgotam as tentativas e rejeitam (escrita fail-loud / leitura fail-open).
    client = url
      ? new Redis(url, { maxRetriesPerRequest: 2, connectTimeout: 3000 })
      : new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: Number(process.env.REDIS_PORT) || 6379,
          maxRetriesPerRequest: 2,
          connectTimeout: 3000,
        });
    client.on('error', (e: Error) =>
      logger.warn({ err: e.message }, '[access-blocklist] redis error'),
    );
  } catch (e) {
    logger.warn({ err: (e as Error).message }, '[access-blocklist] cliente indisponível');
    client = null;
  }
  return client;
}

/** Somente para testes: força recriação do cliente na próxima chamada. */
export function resetAccessBlocklistClientForTests(): void {
  client = undefined;
}

/**
 * Bloqueia o access do usuário por 15 min. FAIL-LOUD: propaga erro se o Redis
 * falhar (o chamador DEVE abortar a exclusão — nunca "anonimizei mas não bloqueei").
 */
export async function blockAccessToken(userId: string): Promise<void> {
  const r = getClient();
  if (!r) throw new Error('blocklist indisponível: sem cliente Redis');
  await r.set(key(userId), String(Date.now()), 'EX', ACCESS_TOKEN_TTL_SECONDS);
}

/** true se o access do usuário está bloqueado. Fail-open (com log) se Redis cair. */
export async function isAccessBlocked(userId: string): Promise<boolean> {
  const r = getClient();
  if (!r) return false;
  try {
    return (await r.get(key(userId))) !== null;
  } catch (e) {
    logger.warn(
      { err: (e as Error).message, userId },
      '[access-blocklist] leitura falhou — fail-open',
    );
    return false;
  }
}
