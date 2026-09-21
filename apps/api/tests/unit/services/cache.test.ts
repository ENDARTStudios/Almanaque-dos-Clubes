/**
 * T448d — Unit: cache fail-loud. Invalidação é caminho de escrita/consistência
 * de dado público: Redis lançando NÃO pode virar "sucesso" silencioso (a
 * vitrine de campeões ficou stale por 2 rodadas por causa disso). O erro volta
 * estruturado ({ok:false, error}) E é logado em warn.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const redisState = vi.hoisted(() => ({
  impl: {
    keys: async (_pattern: string) => [] as string[],
    del: async (..._keys: string[]) => 0,
  },
}));

vi.mock('ioredis', () => {
  const MockRedis = class {
    on() {
      /* sem handlers no mock */
    }
    keys = (pattern: string) => redisState.impl.keys(pattern);
    del = (...keys: string[]) => redisState.impl.del(...keys);
  };
  return { Redis: MockRedis, default: MockRedis };
});

vi.mock('../../../src/config/logger.js', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

const { cache } = await import('../../../src/services/cache.js');
const { logger } = await import('../../../src/config/logger.js');

describe('T448d — cache.invalidate fail-loud', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisState.impl.keys = async () => [];
    redisState.impl.del = async () => 0;
  });

  it('caminho feliz: deleta as chaves e reporta ok com o contador', async () => {
    redisState.impl.keys = async () => ['champions:all', 'champions:men'];
    redisState.impl.del = async (...keys: string[]) => keys.length;
    const result = await cache.invalidate('champions:*');
    expect(result).toMatchObject({ ok: true, keysDeleted: 2 });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('Redis lança em keys → resultado estruturado com erro + warn (não silencia)', async () => {
    redisState.impl.keys = async () => {
      throw new Error('Redis connection lost');
    };
    const result = await cache.invalidate('champions:*');
    expect(result.ok).toBe(false);
    expect(result.keysDeleted).toBe(0);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toContain('Redis connection lost');
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ pattern: 'champions:*' }),
      expect.stringContaining('falha ao invalidar'),
    );
  });

  it('Redis lança em del → resultado estruturado com erro + warn', async () => {
    redisState.impl.keys = async () => ['champions:all'];
    redisState.impl.del = async () => {
      throw new Error('READONLY You cannot write against a read only replica');
    };
    const result = await cache.invalidate('champions:*');
    expect(result.ok).toBe(false);
    expect(result.error?.message).toContain('READONLY');
    expect(logger.warn).toHaveBeenCalled();
  });

  it('nunca retorna ok=true em falso quando houve erro', async () => {
    redisState.impl.keys = async () => {
      throw new Error('boom');
    };
    const result = await cache.invalidate('champions:*');
    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
  });
});
