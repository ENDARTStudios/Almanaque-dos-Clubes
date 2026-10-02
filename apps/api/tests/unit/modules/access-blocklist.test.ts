import { describe, it, expect, vi, beforeEach } from 'vitest';

// T470b — blocklist: escrita FAIL-LOUD, leitura fail-open (com log).
const h = vi.hoisted(() => ({ fail: false, store: new Map<string, string>() }));

vi.mock('ioredis', () => ({
  Redis: class {
    on() {
      /* noop */
    }
    async set(k: string, v: string) {
      if (h.fail) throw new Error('redis down');
      h.store.set(k, v);
    }
    async get(k: string) {
      if (h.fail) throw new Error('redis down');
      return h.store.get(k) ?? null;
    }
  },
}));

import {
  blockAccessToken,
  isAccessBlocked,
} from '../../../src/modules/auth/access-blocklist.service.js';

beforeEach(() => {
  h.fail = false;
  h.store.clear();
});

describe('T470b — blocklist de access token', () => {
  it('bloqueia, reconhece e não afeta outros usuários', async () => {
    expect(await isAccessBlocked('u1')).toBe(false);
    await blockAccessToken('u1');
    expect(await isAccessBlocked('u1')).toBe(true);
    expect(await isAccessBlocked('u2')).toBe(false);
  });

  it('FAIL-LOUD: escrita lança quando o Redis falha (o DELETE não pode dar 200 falso)', async () => {
    h.fail = true;
    await expect(blockAccessToken('u1')).rejects.toThrow();
  });

  it('fail-open: leitura retorna false quando o Redis falha (não derruba a auth)', async () => {
    h.fail = true;
    expect(await isAccessBlocked('u1')).toBe(false);
  });
});
