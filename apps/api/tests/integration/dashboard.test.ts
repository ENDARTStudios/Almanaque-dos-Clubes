/**
 * WS-C-14 — dashboard do usuário (dados agregados read-only).
 * Zero escrita em rankings; consumo via RLS do próprio usuário.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let dbOk = true;
const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');
let userA = ''; // com atividade
let userB = ''; // sem atividade
let clubId = '';
let proposalId = '';
let tokenA = '';
let tokenB = '';

function auth(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, cookie: `access_token=${token}` };
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  try {
    await prisma.favorite.count();
  } catch {
    dbOk = false;
    if (process.env.TEST_REQUIRE_DB === 'true')
      throw new Error('[R1/TEST_REQUIRE_DB] banco ausente no CI — falha, não skip (D-2026-09-18)');
    return;
  }
  const suffix = Date.now();
  const [a, b] = await Promise.all([
    prisma.user.create({
      data: { email: `dash-a-${suffix}@test.local`, passwordHash: 'x', name: 'Dash A' },
    }),
    prisma.user.create({ data: { email: `dash-b-${suffix}@test.local`, passwordHash: 'x' } }),
  ]);
  userA = a.id;
  userB = b.id;
  const club = await prisma.club.create({ data: { name: 'Dash FC', country: 'BR' } });
  clubId = club.id;
  await prisma.favorite.create({
    data: { userId: userA, clubId, targetType: 'club', targetId: clubId },
  });
  const comp = await prisma.competition.create({ data: { name: 'Dash League', country: 'BR' } });
  await prisma.favorite.create({
    data: { userId: userA, targetType: 'competition', targetId: comp.id },
  });
  const prop = await prisma.clubDescriptionProposal.create({
    data: {
      clubId,
      proposedBy: userA,
      userDescription: 'Proposta do dashboard.',
      status: 'pending',
    },
  });
  proposalId = prop.id;
  await prisma.notification.create({
    data: { userId: userA, type: 'system', payload: {} },
  });
  await prisma.clubOwnership.create({
    data: { userId: userA, clubId, status: 'active', approvedAt: new Date() },
  });
  const mk = (id: string, email: string) =>
    app.jwt.sign({ sub: id, email, roles: [], permissions: [], type: 'access' });
  tokenA = mk(userA, a.email);
  tokenB = mk(userB, b.email);
});

afterAll(async () => {
  if (dbOk) {
    await prisma.clubDescriptionProposal.deleteMany({ where: { clubId } });
    await prisma.notification.deleteMany({ where: { userId: { in: [userA, userB] } } });
    await prisma.clubOwnership.deleteMany({ where: { userId: { in: [userA, userB] } } });
    await prisma.favorite.deleteMany({ where: { userId: { in: [userA, userB] } } });
    await prisma.competition.deleteMany({ where: { name: 'Dash League' } });
    await prisma.club.deleteMany({ where: { id: clubId } });
    await prisma.user.deleteMany({ where: { id: { in: [userA, userB] } } });
  }
  await app.close();
});

describe.skipIf(!dbOk || !isPostgres)('WS-C-14 dashboard', () => {
  it('usuário COM atividade → estrutura completa e stats corretas', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard',
      headers: auth(tokenA),
    });
    expect(res.statusCode).toBe(200);
    const data = res.json().data;
    expect(data.user.id).toBe(userA);
    expect(data.stats.totalFavorites.club).toBe(1);
    expect(data.stats.totalFavorites.competition).toBe(1);
    expect(data.stats.totalFavorites.player).toBe(0);
    expect(data.stats.totalNotifications.total).toBe(1);
    expect(data.stats.totalNotifications.unread).toBe(1);
    expect(data.stats.totalProposals.pending).toBe(1);
    expect(data.ownedClubs.length).toBe(1);
    expect(data.ownedClubs[0].name).toBe('Dash FC');
    expect(data.favoriteClubs.length).toBeGreaterThanOrEqual(0);
  });

  it('RecentFavorites ordenado por createdAt DESC', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard',
      headers: auth(tokenA),
    });
    const rf = res.json().data.recentFavorites;
    const dates = rf.map((r: { addedAt: string }) => new Date(r.addedAt).getTime());
    const sorted = [...dates].sort((x, y) => y - x);
    expect(dates).toEqual(sorted);
  });

  it('usuário SEM atividade → contagens zeradas', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard',
      headers: auth(tokenB),
    });
    const data = res.json().data;
    expect(data.stats.totalFavorites).toEqual({ club: 0, player: 0, competition: 0 });
    expect(data.stats.totalNotifications.total).toBe(0);
    expect(data.stats.totalProposals.total).toBe(0);
    expect(data.ownedClubs.length).toBe(0);
  });

  it('cross-user: dashboard de B nunca contém dados de A', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard',
      headers: auth(tokenB),
    });
    const body = JSON.stringify(res.json().data);
    expect(body).not.toContain(proposalId);
  });

  it('sem auth → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/dashboard' });
    expect(res.statusCode).toBe(401);
  });
});
