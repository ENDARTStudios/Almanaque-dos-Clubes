/**
 * T382/T383 — regressão de headers de segurança (item 8.8 + 7.2).
 *
 * Usa a CONFIG REAL exportada (`helmetOptions` de config/security.ts), nunca
 * uma réplica — evita drift entre o app e o teste. Sem banco.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import { helmetOptions } from '../../src/config/security.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify();
  await app.register(helmet, helmetOptions(false));
  app.get('/test', async () => ({ ok: true }));
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('Security headers (8.8 + 7.2)', () => {
  it('X-Frame-Options: DENY (item 7.2)', async () => {
    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.headers['x-frame-options']).toBe('DENY');
  });

  it('X-Content-Type-Options: nosniff', async () => {
    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('X-Powered-By ausente (hidePoweredBy)', async () => {
    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('CSP ausente em ambiente não-prod (prod-only)', async () => {
    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.headers['content-security-policy']).toBeUndefined();
  });
});
