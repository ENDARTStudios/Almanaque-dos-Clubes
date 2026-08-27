/**
 * T384 — rate limiting avançado (item 7.3): janela deslizante por usuário+IP.
 *
 * Testa o limiter (Redis quando disponível, fallback em memória) com janela
 * deslizante explícita (timestamps controlados) e o middleware 429 + Retry-After.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { createSlidingWindowLimiter, rateLimitByUserOrIp } from '../../src/config/rate-limit.js';

describe('sliding window limiter', () => {
  it('permite até max e bloqueia o excedente', async () => {
    const limiter = createSlidingWindowLimiter({ windowMs: 1000, max: 3, prefix: 't1' });
    expect((await limiter.consume('k')).allowed).toBe(true);
    expect((await limiter.consume('k')).allowed).toBe(true);
    expect((await limiter.consume('k')).allowed).toBe(true);
    expect((await limiter.consume('k')).allowed).toBe(false);
  });

  it('libera após a janela deslizante', async () => {
    const limiter = createSlidingWindowLimiter({ windowMs: 100, max: 1, prefix: 't2' });
    expect((await limiter.consume('k2', 1000)).allowed).toBe(true);
    expect((await limiter.consume('k2', 1000)).allowed).toBe(false);
    expect((await limiter.consume('k2', 1101)).allowed).toBe(true);
  });

  it('isola chaves distintas (usuário vs IP)', async () => {
    const limiter = createSlidingWindowLimiter({ windowMs: 1000, max: 1, prefix: 't3' });
    expect((await limiter.consume('u:a', 1000)).allowed).toBe(true);
    expect((await limiter.consume('u:b', 1000)).allowed).toBe(true);
    expect((await limiter.consume('u:a', 1000)).allowed).toBe(false);
  });
});

describe('rateLimitByUserOrIp (429)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    app.post(
      '/limited',
      { preHandler: rateLimitByUserOrIp({ windowMs: 1000, max: 1, prefix: 'm' }) },
      async () => ({ ok: true }),
    );
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('retorna 429 com Retry-After após estourar o limite', async () => {
    const first = await app.inject({ method: 'POST', url: '/limited', payload: {} });
    expect(first.statusCode).toBe(200);

    const second = await app.inject({ method: 'POST', url: '/limited', payload: {} });
    expect(second.statusCode).toBe(429);
    expect(second.headers['retry-after']).toBeDefined();
    expect(JSON.parse(second.body)).toHaveProperty('error');
  });
});
