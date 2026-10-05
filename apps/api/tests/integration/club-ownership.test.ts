/**
 * WS-C-9 Modo Clube — ownerships e descrição comunitária.
 *
 * A) Rotas: POST own idempotente (201→200), PATCH description com ownership
 *    (200) e sem ownership (403), teto de 2000 chars (422 via Zod max),
 *    sanitização de HTML, GET :id expõe userDescription + isOwner,
 *    GET owners público (sem userId), DELETE own → 204, login por senha em
 *    conta só-social não se aplica aqui (ver google-oauth.test).
 * B) Fluxo completo: usuário → own → edit → descrição visível no GET;
 *    usuário B sem ownership → 403 (cross-user).
 * C) Dados oficiais intactos: userDescription é aditivo — name/city não mudam.
 *
 * Local sem Postgres → skip honesto; CI (TEST_REQUIRE_DB) valida de verdade.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { generateCsrfToken } from '../../src/middleware/csrf.js';
import { prisma } from '../../src/config/prisma.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let dbOk = true;
const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');
let userA = '';
let userB = '';
let clubId = '';
let tokenA = '';
let tokenB = '';

function authHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, cookie: `access_token=${token}` };
}

function csrf(): Record<string, string> {
  return { 'x-csrf-token': generateCsrfToken('test-ownership') };
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  try {
    await prisma.clubOwnership.count();
  } catch {
    dbOk = false;
    if (process.env.TEST_REQUIRE_DB === 'true')
      throw new Error('[R1/TEST_REQUIRE_DB] banco ausente no CI — falha, não skip (D-2026-09-18)');
    return;
  }
  const suffix = Date.now();
  const a = await prisma.user.create({
    data: { email: `own-a-${suffix}@test.local`, passwordHash: 'x' },
  });
  const b = await prisma.user.create({
    data: { email: `own-b-${suffix}@test.local`, passwordHash: 'x' },
  });
  userA = a.id;
  userB = b.id;
  const club = await prisma.club.create({
    data: { name: 'Ownership FC', city: 'São Paulo', country: 'BR' },
  });
  clubId = club.id;
  tokenA = app.jwt.sign({ sub: userA, email: a.email, roles: [], permissions: [], type: 'access' });
  tokenB = app.jwt.sign({ sub: userB, email: b.email, roles: [], permissions: [], type: 'access' });
});

afterAll(async () => {
  if (dbOk) {
    await prisma.clubOwnership.deleteMany({ where: { userId: { in: [userA, userB] } } });
    await prisma.club.deleteMany({ where: { id: clubId } });
    await prisma.user.deleteMany({ where: { id: { in: [userA, userB] } } });
  }
  await app.close();
});

describe.skipIf(!dbOk || !isPostgres)('WS-C-9 ownership (rotas)', () => {
  it('POST own → 201 na 1ª, 200 na 2ª (idempotente)', async () => {
    const r1 = await app.inject({
      method: 'POST',
      url: `/api/v1/clubs/${clubId}/own`,
      headers: { ...authHeader(tokenA), ...csrf() },
    });
    expect(r1.statusCode).toBe(201);
    const r2 = await app.inject({
      method: 'POST',
      url: `/api/v1/clubs/${clubId}/own`,
      headers: { ...authHeader(tokenA), ...csrf() },
    });
    expect(r2.statusCode).toBe(200);
  });

  it('PATCH description com ownership → 200; HTML é sanitizado', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/clubs/${clubId}/description`,
      headers: { ...authHeader(tokenA), ...csrf() },
      payload: {
        userDescription: '  Clube da comunidade — <script>alert(1)</script>história viva.  ',
      },
    });
    expect(res.statusCode).toBe(200);
    const saved = await prisma.club.findUnique({ where: { id: clubId } });
    expect(saved?.userDescription).toBe('Clube da comunidade — alert(1)história viva.');
    expect(saved?.userDescriptionSource).toBe('community');
    expect(saved?.userDescriptionUpdatedAt).not.toBeNull();
  });

  it('PATCH description SEM ownership (usuário B) → 403 e nada muda', async () => {
    const before = await prisma.club.findUnique({ where: { id: clubId } });
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/clubs/${clubId}/description`,
      headers: { ...authHeader(tokenB), ...csrf() },
      payload: { userDescription: 'vandalismo' },
    });
    expect(res.statusCode).toBe(403);
    const after = await prisma.club.findUnique({ where: { id: clubId } });
    expect(after?.userDescription).toBe(before?.userDescription);
  });

  it('PATCH com > 2000 chars → 422 (Zod max)', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/clubs/${clubId}/description`,
      headers: { ...authHeader(tokenA), ...csrf() },
      payload: { userDescription: 'a'.repeat(2001) },
    });
    expect(res.statusCode).toBe(422);
  });

  it('GET /clubs/:id anônimo → userDescription visível, isOwner false', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/v1/clubs/${clubId}` });
    expect(res.statusCode).toBe(200);
    const body = res.json().data;
    expect(body.userDescription).toContain('Clube da comunidade');
    expect(body.isOwner).toBe(false);
    // dados oficiais intactos (aditivo, não substitutivo)
    expect(body.name).toBe('Ownership FC');
    expect(body.city).toBe('São Paulo');
  });

  it('GET /clubs/:id autenticado como owner → isOwner true', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/clubs/${clubId}`,
      headers: authHeader(tokenA),
    });
    expect(res.json().data.isOwner).toBe(true);
  });

  it('GET /clubs/:id/owners público — sem userId exposto', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/v1/clubs/${clubId}/owners` });
    expect(res.statusCode).toBe(200);
    const owners = res.json().data.owners;
    expect(owners.length).toBe(1);
    expect(owners[0].role).toBe('editor');
    expect(JSON.stringify(owners)).not.toContain(userA);
  });

  it('DELETE own → 204; depois PATCH → 403 de novo', async () => {
    const del = await app.inject({
      method: 'DELETE',
      url: `/api/v1/clubs/${clubId}/own`,
      headers: { ...authHeader(tokenA), ...csrf() },
    });
    expect(del.statusCode).toBe(204);
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/clubs/${clubId}/description`,
      headers: { ...authHeader(tokenA), ...csrf() },
      payload: { userDescription: 'ainda sou owner?' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('POST own em clube inexistente → 404', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/clubs/00000000-0000-4000-8000-000000000000/own',
      headers: { ...authHeader(tokenB), ...csrf() },
    });
    expect(res.statusCode).toBe(404);
  });
});
