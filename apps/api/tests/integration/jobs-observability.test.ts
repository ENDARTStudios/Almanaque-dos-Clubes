/**
 * WS-O-1 — Integração: rotas de observabilidade (admin-only).
 * JWT admin de teste (como no T439); 403 para não-admin; shapes dos payloads.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let dbOk = true;
let adminToken = '';
let userToken = '';
let userIds: string[] = [];

function auth(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, cookie: `access_token=${token}` };
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  try {
    await prisma.user.count();
  } catch {
    dbOk = false;
    if (process.env.TEST_REQUIRE_DB === 'true')
      throw new Error('[R1/TEST_REQUIRE_DB] banco ausente no CI — falha, não skip');
    return;
  }
  const suffix = Date.now();
  const admin = await prisma.user.create({
    data: { email: `wso1-admin-${suffix}@test.local`, passwordHash: 'x' },
  });
  const plain = await prisma.user.create({
    data: { email: `wso1-plain-${suffix}@test.local`, passwordHash: 'x' },
  });
  userIds = [admin.id, plain.id];
  adminToken = app.jwt.sign({
    sub: admin.id,
    email: admin.email,
    roles: ['admin'],
    permissions: [],
    type: 'access',
  });
  userToken = app.jwt.sign({
    sub: plain.id,
    email: plain.email,
    roles: [],
    permissions: [],
    type: 'access',
  });
});

afterAll(async () => {
  if (dbOk && userIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
  await app.close();
});

describe('WS-O-1 GET /jobs/health (admin)', () => {
  it('admin: 200 com jobs/alerts/schedulerEnabled', { timeout: 20_000 }, async () => {
    if (!dbOk) return;
    const res = await app.inject({ method: 'GET', url: '/api/v1/jobs/health', headers: auth(adminToken) });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body).data;
    expect(body.schedulerEnabled).toBe(false); // default OFF no ambiente de teste
    expect(body.jobs).toBeDefined();
    expect(body.alerts).toHaveProperty('active');
    expect(body.alerts).toHaveProperty('backlog');
  });

  it('não-admin: 403; sem token: 401', async () => {
    if (!dbOk) return;
    const forbidden = await app.inject({ method: 'GET', url: '/api/v1/jobs/health', headers: auth(userToken) });
    expect(forbidden.statusCode).toBe(403);
    const anon = await app.inject({ method: 'GET', url: '/api/v1/jobs/health' });
    expect(anon.statusCode).toBe(401);
  });
});

describe('WS-O-1 GET /jobs/logs (admin)', () => {
  it('admin: 200 com entries (buffer) e queueJobs (Redis quando disponível)', { timeout: 20_000 }, async () => {
    if (!dbOk) return;
    const res = await app.inject({ method: 'GET', url: '/api/v1/jobs/logs?limit=50', headers: auth(adminToken) });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body).data;
    expect(Array.isArray(body.entries)).toBe(true);
    expect(Array.isArray(body.queueJobs)).toBe(true);
  });
});

describe('WS-O-1 GET /observability/slo (admin)', () => {
  it('admin: 200 com 3 jobs alvo, lastRunAge e successRate', { timeout: 20_000 }, async () => {
    if (!dbOk) return;
    const res = await app.inject({ method: 'GET', url: '/api/v1/observability/slo', headers: auth(adminToken) });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body).data;
    const names = body.slo.map((s: { job: string }) => s.job);
    expect(names).toContain('wikidata-incremental');
    expect(names).toContain('integrity-check');
    expect(names).toContain('ranking:compute');
    for (const s of body.slo) {
      expect(s).toHaveProperty('lastRunAgeHours');
      expect(s).toHaveProperty('sloMet');
    }
  });

  it('não-admin: 403', async () => {
    if (!dbOk) return;
    const res = await app.inject({ method: 'GET', url: '/api/v1/observability/slo', headers: auth(userToken) });
    expect(res.statusCode).toBe(403);
  });
});
