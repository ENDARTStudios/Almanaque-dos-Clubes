/**
 * WS-C-9 Modo Clube — gates C1–C4 nas ROTAS (integração de verdade no CI).
 *
 * A) Gates do claim: FREE → 422 PLAN_REQUIRED; Elite sem evidência → 422
 *    EVIDENCE_REQUIRED; Elite+evidência → 201 com status 'pending' (NUNCA
 *    'active'); seleção nacional → 403 MANUAL_CURATION_REQUIRED; 4ª posse do
 *    clube → 409 CLUB_EDITORS_FULL; claim em clube inexistente → 404.
 * B) Moderação: admin aprova (→ active + reviewedBy) e aí PATCH description
 *    publica (200, HTML sanitizado); propose() do editor → auto-aprova.
 * C) C1 na publicação: Elite perdido → 403 OWNERSHIP_SUSPENDED + posse
 *    'suspended'; Elite renovado → publica de novo ("até renovar").
 * D) Contrato público: GET /clubs/:id expõe ownershipStatus; owners público
 *    sem userId; DELETE own → 204.
 *
 * Local sem Postgres/Redis → skip honesto; CI (TEST_REQUIRE_DB) valida de
 * verdade (D-2026-09-18).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { generateCsrfToken } from '../../src/middleware/csrf.js';
import { prisma } from '../../src/config/prisma.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let dbOk = true;
const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');
let userA = ''; // Elite (editor em teste)
let userB = ''; // FREE
let operadorId = ''; // Operador (linha real — FK da auditoria)
let clubId = '';
let clubNacional = '';
let clubFull = '';
let tokenA = '';
let tokenB = '';
let tokenOperador = '';

function authHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, cookie: `access_token=${token}` };
}

function csrf(): Record<string, string> {
  return { 'x-csrf-token': generateCsrfToken('test-ownership-gates') };
}

/** Elite ativo (pago ou concedido — mesmo formato do changePlan). */
function eliteFixture(userId: string, daysAhead = 30) {
  return {
    userId,
    plan: 'ELITE' as const,
    status: 'ACTIVE' as const,
    startedAt: new Date(),
    currentPeriodEnd: new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000),
  };
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
  const [a, b, operador] = await prisma.$transaction([
    prisma.user.create({
      data: { email: `own-gates-a-${suffix}@test.local`, passwordHash: 'x' },
    }),
    prisma.user.create({
      data: { email: `own-gates-b-${suffix}@test.local`, passwordHash: 'x' },
    }),
    // Operador com LINHA REAL em users: a auditoria tem FK p/ users
    // (audit_logs_userId_fkey) — userId inexistente quebra o approve em teste.
    prisma.user.create({
      data: { email: `own-gates-op-${suffix}@test.local`, passwordHash: 'x' },
    }),
  ]);
  userA = a.id;
  userB = b.id;
  operadorId = operador.id;
  await prisma.subscription.create({ data: eliteFixture(userA) });
  const club = await prisma.club.create({
    data: { name: 'Ownership Gates FC', city: 'São Paulo', country: 'BR' },
  });
  clubId = club.id;
  const nacional = await prisma.club.create({
    data: { name: 'Seleção Gates', country: 'BR', kind: 'national_team' },
  });
  clubNacional = nacional.id;
  const full = await prisma.club.create({
    data: { name: 'Clube Lotado FC', country: 'BR' },
  });
  clubFull = full.id;
  tokenA = app.jwt.sign({ sub: userA, email: a.email, roles: [], permissions: [], type: 'access' });
  tokenB = app.jwt.sign({ sub: userB, email: b.email, roles: [], permissions: [], type: 'access' });
  // Operador: sub = usuário REAL (FK da auditoria) + e-mail na allowlist
  // default (env.ts) + papel admin.
  tokenOperador = app.jwt.sign({
    sub: operadorId,
    email: 'endart.studios@gmail.com',
    roles: ['admin'],
    permissions: [],
    type: 'access',
  });
});

afterAll(async () => {
  if (dbOk) {
    await prisma.clubOwnership.deleteMany({
      where: { clubId: { in: [clubId, clubNacional, clubFull] } },
    });
    await prisma.subscription.deleteMany({
      where: { userId: { in: [userA, userB, operadorId] } },
    });
    await prisma.club.deleteMany({ where: { id: { in: [clubId, clubNacional, clubFull] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userA, userB, operadorId] } } });
  }
  await app.close();
});

describe.skipIf(!dbOk || !isPostgres)('WS-C-9 gates C1–C4 (rotas)', () => {
  it('FREE claim → 422 PLAN_REQUIRED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/clubs/${clubId}/own`,
      headers: { ...authHeader(tokenB), ...csrf() },
      payload: { evidenceNote: 'sou torcedor organizado' },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().error.code).toBe('PLAN_REQUIRED');
  });

  it('Elite sem evidência → 422 EVIDENCE_REQUIRED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/clubs/${clubId}/own`,
      headers: { ...authHeader(tokenA), ...csrf() },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().error.code).toBe('EVIDENCE_REQUIRED');
  });

  it('Elite + evidência → 201 com status pending; approvedBy continua nulo', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/clubs/${clubId}/own`,
      headers: { ...authHeader(tokenA), ...csrf() },
      payload: {
        evidenceUrl: 'https://clube.com.br/diretoria',
        evidenceNote: 'diretor de comunicação',
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data).toMatchObject({ created: true, status: 'pending' });
    const row = await prisma.clubOwnership.findUnique({
      where: { userId_clubId: { userId: userA, clubId } },
    });
    expect(row?.status).toBe('pending');
    expect(row?.approvedBy).toBeNull();
    expect(row?.evidenceUrl).toBe('https://clube.com.br/diretoria');
  });

  it('GET /clubs/:id do solicitante → isOwner false + ownershipStatus pending', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/clubs/${clubId}`,
      headers: authHeader(tokenA),
    });
    expect(res.json().data.isOwner).toBe(false);
    expect(res.json().data.ownershipStatus).toBe('pending');
  });

  it('PATCH description com posse pending → 409 OWNERSHIP_PENDING_REVIEW', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/clubs/${clubId}/description`,
      headers: { ...authHeader(tokenA), ...csrf() },
      payload: { userDescription: 'publicando antes da aprovação' },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('OWNERSHIP_PENDING_REVIEW');
  });

  it('claim em seleção nacional → 403 MANUAL_CURATION_REQUIRED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/clubs/${clubNacional}/own`,
      headers: { ...authHeader(tokenA), ...csrf() },
      payload: { evidenceUrl: 'https://cbf.com.br/comissao' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('MANUAL_CURATION_REQUIRED');
  });

  it('clube com 4 posses (1 editor + 3 curadores) → nova claim 409 CLUB_EDITORS_FULL', async () => {
    // 4 terceiros já ocupam (pending/active/suspended contam; revogada não) →
    // o teto C4 (1 editor + 3 curadores) está cheio e a claim de A é bloqueada.
    const suffix = Date.now();
    const others = await prisma.user.createMany({
      data: [1, 2, 3, 4].map((i) => ({
        email: `own-full-${suffix}-${i}@test.local`,
        passwordHash: 'x',
      })),
    });
    expect(others.count).toBe(4);
    const users = await prisma.user.findMany({
      where: { email: { startsWith: `own-full-${suffix}-` } },
      select: { id: true },
    });
    expect(users.length).toBe(4);
    try {
      await prisma.clubOwnership.createMany({
        data: users.map((u, i) => ({
          userId: u.id,
          clubId: clubFull,
          status: ['active', 'pending', 'pending', 'suspended'][i], // 1 editor + 3 curadores
        })),
      });
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/clubs/${clubFull}/own`,
        headers: { ...authHeader(tokenA), ...csrf() },
        payload: { evidenceUrl: 'https://clube.com.br/eu' },
      });
      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe('CLUB_EDITORS_FULL');
    } finally {
      await prisma.clubOwnership.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
      await prisma.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
    }
  });

  it('moderação: aprovar → active + reviewedBy; aí PATCH publica e owners lista', async () => {
    const row = await prisma.clubOwnership.findUnique({
      where: { userId_clubId: { userId: userA, clubId } },
    });
    const approve = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/club-ownerships/${row!.id}/approve`,
      headers: { ...authHeader(tokenOperador), ...csrf() },
    });
    expect(approve.statusCode).toBe(200);
    expect(approve.json().data.status).toBe('active');

    const updated = await prisma.clubOwnership.findUnique({
      where: { userId_clubId: { userId: userA, clubId } },
    });
    expect(updated?.approvedBy).toBe(operadorId);
    expect(updated?.reviewedBy).toBe(operadorId);
    expect(updated?.approvedAt).not.toBeNull();

    // Editor aprovado publica (HTML sanitizado) — e propose auto-aprova.
    const patch = await app.inject({
      method: 'PATCH',
      url: `/api/v1/clubs/${clubId}/description`,
      headers: { ...authHeader(tokenA), ...csrf() },
      payload: { userDescription: ' Clube da comunidade — <script>x</script>história viva. ' },
    });
    expect(patch.statusCode).toBe(200);

    const get = await app.inject({
      method: 'GET',
      url: `/api/v1/clubs/${clubId}`,
      headers: authHeader(tokenA),
    });
    expect(get.json().data.isOwner).toBe(true);
    expect(get.json().data.userDescription).toBe('Clube da comunidade — xhistória viva.');

    const owners = await app.inject({ method: 'GET', url: `/api/v1/clubs/${clubId}/owners` });
    expect(owners.statusCode).toBe(200);
    expect(JSON.stringify(owners.json())).not.toContain(userA);
  });

  it('propose() do editor aprovado → auto-aprova (200 approved)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/clubs/${clubId}/description/proposals`,
      headers: { ...authHeader(tokenA), ...csrf() },
      payload: { userDescription: 'Editor aprovado publica direto (10+ chars).' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe('approved');
  });

  it('C1 na publicação: Elite perdido → 403 OWNERSHIP_SUSPENDED + posse suspended', async () => {
    await prisma.subscription.update({
      where: { userId: userA },
      data: { currentPeriodEnd: new Date(Date.now() - 60 * 1000) },
    });
    const patch = await app.inject({
      method: 'PATCH',
      url: `/api/v1/clubs/${clubId}/description`,
      headers: { ...authHeader(tokenA), ...csrf() },
      payload: { userDescription: 'publicando sem elite' },
    });
    expect(patch.statusCode).toBe(403);
    expect(patch.json().error.code).toBe('OWNERSHIP_SUSPENDED');

    const row = await prisma.clubOwnership.findUnique({
      where: { userId_clubId: { userId: userA, clubId } },
    });
    expect(row?.status).toBe('suspended'); // histórico preservado
    expect(row?.approvedBy).not.toBeNull();

    const get = await app.inject({
      method: 'GET',
      url: `/api/v1/clubs/${clubId}`,
      headers: authHeader(tokenA),
    });
    expect(get.json().data.ownershipStatus).toBe('suspended');
  });

  it('Elite renovado → publica de novo ("até renovar") e posse volta a active', async () => {
    await prisma.subscription.update({
      where: { userId: userA },
      data: { currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    });
    const patch = await app.inject({
      method: 'PATCH',
      url: `/api/v1/clubs/${clubId}/description`,
      headers: { ...authHeader(tokenA), ...csrf() },
      payload: { userDescription: 'Elite renovado, publicando de novo.' },
    });
    expect(patch.statusCode).toBe(200);
    const row = await prisma.clubOwnership.findUnique({
      where: { userId_clubId: { userId: userA, clubId } },
    });
    expect(row?.status).toBe('active');
  });

  it('POST own idempotente: 2ª chamada → 200 (já pending/active)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/clubs/${clubId}/own`,
      headers: { ...authHeader(tokenA), ...csrf() },
      payload: { evidenceNote: 'de novo' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('DELETE own → 204; depois PATCH → 403 (sem posse)', async () => {
    const del = await app.inject({
      method: 'DELETE',
      url: `/api/v1/clubs/${clubId}/own`,
      headers: { ...authHeader(tokenA), ...csrf() },
    });
    expect(del.statusCode).toBe(204);
    const patch = await app.inject({
      method: 'PATCH',
      url: `/api/v1/clubs/${clubId}/description`,
      headers: { ...authHeader(tokenA), ...csrf() },
      payload: { userDescription: 'ainda sou owner?' },
    });
    expect(patch.statusCode).toBe(403);
  });

  it('POST own em clube inexistente → 404', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/clubs/00000000-0000-4000-8000-000000000000/own',
      headers: { ...authHeader(tokenB), ...csrf() },
      payload: { evidenceNote: 'x' },
    });
    expect(res.statusCode).toBe(404);
  });
});
