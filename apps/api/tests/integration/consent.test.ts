import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { generateCsrfToken } from '../../src/middleware/csrf.js';
import { prisma } from '../../src/config/prisma.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

const VALID_PAYLOAD = {
  visitorId: 'visitor-t436-00000001',
  version: '1.0',
  categories: {
    necessary: true,
    preferences: false,
    analytics: true,
    personalization: false,
    marketing: false,
  },
};

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await prisma.cookieConsent.deleteMany({ where: { visitorId: VALID_PAYLOAD.visitorId } });
  await app.close();
});

// Token CSRF é de uso único — cada POST precisa de um token fresco.
function post(payload: unknown, ip = '203.0.113.10') {
  return app.inject({
    method: 'POST',
    url: '/api/v1/consent',
    payload,
    headers: { 'x-csrf-token': generateCsrfToken('test-consent'), 'x-forwarded-for': ip },
  });
}

describe('POST /api/v1/consent (T436 — prova de consentimento)', () => {
  it('grava prova persistida e retorna 201 com id/version/consentedAt', async () => {
    const res = await post(VALID_PAYLOAD);
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.id).toBeTruthy();
    expect(body.data.version).toBe('1.0');
    expect(body.data.categories).toMatchObject({ necessary: true, analytics: true });
    expect(body.data.consentedAt).toBeTruthy();

    const row = await prisma.cookieConsent.findUnique({ where: { id: body.data.id } });
    expect(row).not.toBeNull();
    expect(row!.visitorId).toBe(VALID_PAYLOAD.visitorId);
  });

  it('nunca persiste IP em claro — apenas hash SHA-256 (LGPD)', async () => {
    const res = await post(VALID_PAYLOAD);
    const body = JSON.parse(res.body);
    const row = await prisma.cookieConsent.findUnique({ where: { id: body.data.id } });
    expect(row!.ipHash).toMatch(/^[a-f0-9]{64}$/);
    expect(row!.ipHash).not.toContain('203.0.113.10');
  });

  it('exige CSRF (403 sem token)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/consent',
      payload: VALID_PAYLOAD,
    });
    expect(res.statusCode).toBe(403);
  });

  it('rejeita categories.necessary=false com 422 (necessários não são recusáveis)', async () => {
    const res = await post({
      ...VALID_PAYLOAD,
      categories: { ...VALID_PAYLOAD.categories, necessary: false },
    });
    expect(res.statusCode).toBe(422);
  });

  it('rejeita visitorId curto demais com 422', async () => {
    const res = await post({ ...VALID_PAYLOAD, visitorId: 'abc' });
    expect(res.statusCode).toBe(422);
  });
});

describe('GET /api/v1/consent/current', () => {
  it('retorna o consentimento mais recente não revogado do visitante', async () => {
    await post(VALID_PAYLOAD);
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/consent/current?visitorId=${VALID_PAYLOAD.visitorId}`,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).not.toBeNull();
    expect(body.data.version).toBe('1.0');
    expect(body.data.revokedAt).toBeNull();
  });

  it('retorna data: null para visitante sem consentimento', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/consent/current?visitorId=sem-consentimento-0001',
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data).toBeNull();
  });

  it('retorna 422 sem visitorId', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/consent/current' });
    expect(res.statusCode).toBe(422);
  });
});
