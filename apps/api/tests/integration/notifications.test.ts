/**
 * WS-C-8 — Integração (Postgres real + RLS no CI): notificações.
 * Fluxo completo: favoritar → gerador cria new_title → usuário vê → marca lida.
 * Isolamento RLS (A não vê B), markRead cross-user → 404, agregação diária.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { generateCsrfToken } from '../../src/middleware/csrf.js';
import { prisma } from '../../src/config/prisma.js';
import {
  generateTitleNotifications,
  buildTitleEvents,
} from '../../src/modules/notifications/title-notification.generator.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let dbOk = true;
let userA = '';
let userB = '';
let clubC = '';
let compK = '';
let tokenA = '';
let tokenB = '';

function auth(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, cookie: `access_token=${token}` };
}

function post(url: string, token: string, payload?: unknown) {
  return app.inject({
    method: 'POST',
    url,
    payload,
    headers: { ...auth(token), 'x-csrf-token': generateCsrfToken('test-notifications') },
  });
}

function patch(url: string, token: string) {
  return app.inject({
    method: 'PATCH',
    url,
    headers: { ...auth(token), 'x-csrf-token': generateCsrfToken('test-notifications') },
  });
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
  const [a, b] = await Promise.all([
    prisma.user.create({ data: { email: `wsc8-a-${suffix}@test.local`, passwordHash: 'x' } }),
    prisma.user.create({ data: { email: `wsc8-b-${suffix}@test.local`, passwordHash: 'x' } }),
  ]);
  userA = a.id;
  userB = b.id;
  const c = await prisma.club.create({
    data: { name: `WSC8 FC ${suffix}`, country: 'ZZ', qid: null },
  });
  clubC = c.id;
  const k = await prisma.competition.create({
    data: { name: `WSC8 Cup ${suffix}`, qid: null, country: 'ZZ' },
  });
  compK = k.id;
  tokenA = app.jwt.sign({ sub: userA, email: a.email, roles: [], permissions: [], type: 'access' });
  tokenB = app.jwt.sign({ sub: userB, email: b.email, roles: [], permissions: [], type: 'access' });

  // A favorita o clube C (B não)
  await post('/api/v1/favorites', tokenA, { clubId: clubC });
});

afterAll(async () => {
  if (dbOk) {
    await prisma.notification.deleteMany({ where: { userId: { in: [userA, userB] } } });
    await prisma.favorite.deleteMany({ where: { clubId: clubC } });
    await prisma.knowledgeGraph.deleteMany({ where: { targetId: compK } });
    await prisma.club.deleteMany({ where: { id: clubC } });
    await prisma.competition.deleteMany({ where: { id: compK } });
    await prisma.user.deleteMany({ where: { id: { in: [userA, userB] } } });
  }
  await app.close();
});

describe('WS-C-8 — geração via gerador (ETL hook)', () => {
  it('favoritar → novo título → notificação para A apenas', { timeout: 20_000 }, async () => {
    const edges = [
      { sourceId: clubC, targetId: compK, metadata: { year: 2026, hierarchy: 'nacional' } },
    ];
    const events = buildTitleEvents(edges, new Map([[compK, { name: 'WSC8 Cup', qid: null }]]));
    const out = await generateTitleNotifications(events);
    expect(out.notificationsCreated).toBe(1); // só A favorita
    expect(out.usersNotified).toBe(1);

    // A vê; B não vê nada
    const listA = JSON.parse(
      (await app.inject({ method: 'GET', url: '/api/v1/notifications', headers: auth(tokenA) }))
        .body,
    );
    expect(listA.total).toBe(1);
    expect(listA.unreadCount).toBe(1);
    const n = listA.notifications[0];
    expect(n.type).toBe('new_title');
    expect(n.payload.clubId).toBe(clubC);
    expect(n.payload.titles).toHaveLength(1);
    expect(n.payload.titles[0].year).toBe(2026);

    const listB = JSON.parse(
      (await app.inject({ method: 'GET', url: '/api/v1/notifications', headers: auth(tokenB) }))
        .body,
    );
    expect(listB.total).toBe(0);
  });

  it(
    'agregação diária: segundo título no mesmo dia mescla (1 notificação, 2 títulos)',
    { timeout: 20_000 },
    async () => {
      const edges = [
        { sourceId: clubC, targetId: compK, metadata: { year: 2025, hierarchy: 'continental' } },
      ];
      const events = buildTitleEvents(edges, new Map([[compK, { name: 'WSC8 Cup', qid: null }]]));
      const out = await generateTitleNotifications(events);
      expect(out.notificationsCreated).toBe(0);
      expect(out.notificationsMerged).toBe(1);

      const listA = JSON.parse(
        (await app.inject({ method: 'GET', url: '/api/v1/notifications', headers: auth(tokenA) }))
          .body,
      );
      expect(listA.total).toBe(1); // continua 1 notificação
      expect(listA.notifications[0].payload.titles).toHaveLength(2);
    },
  );

  it('clube sem favoritantes → skippedNoFavorites', { timeout: 20_000 }, async () => {
    const otherClub = await prisma.club.create({
      data: { name: `WSC8 orphan ${Date.now()}`, country: 'ZZ', qid: null },
    });
    const edges = [{ sourceId: otherClub.id, targetId: compK, metadata: { year: 2026 } }];
    const events = buildTitleEvents(edges, new Map([[compK, { name: 'WSC8 Cup', qid: null }]]));
    const out = await generateTitleNotifications(events);
    expect(out.skippedNoFavorites).toBe(1);
    await prisma.club.delete({ where: { id: otherClub.id } });
  });
});

describe('WS-C-8 — marcação de leitura + isolamento', () => {
  it(
    'markRead cross-user → 404; unreadCount cai após leitura; read-all zera',
    { timeout: 20_000 },
    async () => {
      const listA = JSON.parse(
        (await app.inject({ method: 'GET', url: '/api/v1/notifications', headers: auth(tokenA) }))
          .body,
      );
      const notifId = listA.notifications[0].id;

      // B tenta marcar a notificação de A → 404 (RLS owner-only)
      const cross = await patch(`/api/v1/notifications/${notifId}/read`, tokenB);
      expect(cross.statusCode).toBe(404);

      // A marca → 204; unread cai
      const mine = await patch(`/api/v1/notifications/${notifId}/read`, tokenA);
      expect(mine.statusCode).toBe(204);
      const countAfter = JSON.parse(
        (
          await app.inject({
            method: 'GET',
            url: '/api/v1/notifications/unread-count',
            headers: auth(tokenA),
          })
        ).body,
      );
      expect(countAfter.count).toBe(0);

      // unreadOnly filtra lidas
      const unreadOnly = JSON.parse(
        (
          await app.inject({
            method: 'GET',
            url: '/api/v1/notifications?unreadOnly=true',
            headers: auth(tokenA),
          })
        ).body,
      );
      expect(unreadOnly.total).toBe(0);
    },
  );

  it(
    'read-all → 204 e zera unread (com nova notificação não lida)',
    { timeout: 20_000 },
    async () => {
      // nova notificação não lida
      const edges = [{ sourceId: clubC, targetId: compK, metadata: { year: 2024 } }];
      await generateTitleNotifications(
        buildTitleEvents(edges, new Map([[compK, { name: 'WSC8 Cup', qid: null }]])),
      );
      // a agregação mescla na notificação existente e REABRE (read=false, readAt=null)
      const count = JSON.parse(
        (
          await app.inject({
            method: 'GET',
            url: '/api/v1/notifications/unread-count',
            headers: auth(tokenA),
          })
        ).body,
      );
      expect(count.count).toBe(1);
      const res = await post('/api/v1/notifications/read-all', tokenA);
      expect(res.statusCode).toBe(204);
      const after = JSON.parse(
        (
          await app.inject({
            method: 'GET',
            url: '/api/v1/notifications/unread-count',
            headers: auth(tokenA),
          })
        ).body,
      );
      expect(after.count).toBe(0);
    },
  );

  it('401 sem token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/notifications' });
    expect(res.statusCode).toBe(401);
  });
});
