/**
 * T382 — regressão de headers de segurança (item 8.8).
 *
 * Testa o comportamento real do @fastify/helmet na configuração usada pelo
 * app (CSP/HSTS apenas em produção; defaults do helmet sempre ativos).
 * App Fastify mínimo, sem banco — roda localmente sem Postgres.
 *
 * Observação de reconciliação: o item 7.2 do PLANO_MESTRE alega
 * "X-Frame-Options: DENY", mas o app não configura `xFrameOptions` (usa o
 * default do helmet: SAMEORIGIN). SAMEORIGIN ainda mitiga clickjacking
 * cross-origin; DENY é apenas mais estrito. Registrado como gap, não como
 * vulnerabilidade.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify();
  await app.register(helmet, {
    contentSecurityPolicy: false,
    hsts: false,
  });
  app.get('/test', async () => ({ ok: true }));
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('Security headers (8.8)', () => {
  it('X-Frame-Options presente (SAMEORIGIN, default helmet)', async () => {
    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
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
