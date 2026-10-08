/**
 * T094/T096 — rota /export/:entityType com plano + quota.
 * (a) FREE autenticado → 403 PLAN_REQUIRED (csv e json)
 * (b) PRO → csv 200; json → 403 (ELITE)
 * (c) ELITE → json 200
 * (d) quota estourada → 429 com Retry-After (exige Redis; local sem Redis pula
 *     com motivo logado — D-2026-09-18)
 *
 * Padrão jobs-observability: app real + JWT de teste; DB probe com guarda.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import { cache } from '../../src/services/cache.js';
import { exportQuotaKey, EXPORT_DAILY_LIMIT } from '../../src/modules/export/entitlement.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let dbOk = true;
let redisOk = false;
let eliteToken = '';

const suffix = Date.now();
const created: string[] = [];

async function makeUser(plan: 'FREE' | 'PRO' | 'ELITE'): Promise<string> {
  const user = await prisma.user.create({
    data: { email: `t094-${plan.toLowerCase()}-${suffix}@test.local`, passwordHash: 'x' },
  });
  created.push(user.id);
  await prisma.subscription.create({
    data: { userId: user.id, plan, status: 'ACTIVE' },
  });
  return app.jwt.sign({
    sub: user.id,
    email: user.email,
    roles: [],
    permissions: ['export:csv'],
    type: 'access',
  });
}

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
  try {
    await cache.set('export:quota:__probe', '1', 10);
    redisOk = (await cache.get<string>('export:quota:__probe')) === '1';
  } catch {
    redisOk = false;
  }
  if (!redisOk) {
    console.warn('[export-entitlement] Redis ausente — teste (d) de quota pulado com motivo');
  }
});

afterAll(async () => {
  if (dbOk && created.length > 0) {
    await prisma.subscription.deleteMany({ where: { userId: { in: created } } });
    await prisma.user.deleteMany({ where: { id: { in: created } } });
  }
  if (app) await app.close();
});

describe('GET /export/:entityType — plano (T094)', () => {
  it('(a) FREE → 403 PLAN_REQUIRED com minPlan', async () => {
    if (!dbOk) return;
    const token = await makeUser('FREE');
    for (const format of ['csv', 'json']) {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/export/clubs?format=${format}`,
        headers: auth(token),
      });
      expect(res.statusCode).toBe(403);
      const body = res.json();
      expect(body.error.code).toBe('PLAN_REQUIRED');
      expect(body.error.minPlan).toBe(format === 'json' ? 'ELITE' : 'PRO');
    }
  });

  it('(b) PRO → csv 200; json 403 ELITE', async () => {
    if (!dbOk) return;
    const token = await makeUser('PRO');
    const csv = await app.inject({
      method: 'GET',
      url: '/api/v1/export/clubs?format=csv',
      headers: auth(token),
    });
    expect(csv.statusCode).toBe(200);
    expect(csv.headers['content-type']).toContain('text/csv');

    const json = await app.inject({
      method: 'GET',
      url: '/api/v1/export/clubs?format=json',
      headers: auth(token),
    });
    expect(json.statusCode).toBe(403);
    expect(json.json().error.minPlan).toBe('ELITE');
  });

  it('(c) ELITE → json 200', async () => {
    if (!dbOk) return;
    eliteToken = await makeUser('ELITE');
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/export/clubs?format=json',
      headers: auth(eliteToken),
    });
    expect(res.statusCode).toBe(200);
  });
});

describe('GET /export/:entityType — quota diária (T096)', () => {
  it('(d) estourou o limite → 429 + Retry-After', async () => {
    if (!dbOk || !redisOk) return; // pulos logados no beforeAll
    // Reusa o usuário ELITE de (c) — criar outro com o mesmo suffix daria P2002.
    const user = await prisma.user.findFirstOrThrow({
      where: { email: `t094-elite-${suffix}@test.local` },
      select: { id: true },
    });
    await cache.set(
      exportQuotaKey(user.id),
      String(EXPORT_DAILY_LIMIT.ELITE),
      secondsUntilUtcMidnightSafe(),
    );
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/export/clubs?format=json',
      headers: auth(eliteToken!),
    });
    expect(res.statusCode).toBe(429);
    expect(res.json().error.code).toBe('EXPORT_QUOTA_EXCEEDED');
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
  });
});

function secondsUntilUtcMidnightSafe(): number {
  const now = new Date();
  const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, Math.ceil((midnight - now.getTime()) / 1000));
}
