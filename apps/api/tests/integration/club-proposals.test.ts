/**
 * WS-C-10 — propostas de descrição (comunidade colaborativa).
 *
 * Fluxo: user A propõe (pending) → editor B lista → aprova (descrição aplicada
 * + cache invalidado + notificação) e rejeita (com note, sem aplicar).
 * Moderação: 409 segundo pending, 403 auto-revisão, 403 não-editor.
 * proposalStatus aparece no GET /clubs/:id do proponente.
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
let userA = ''; // proponente
let userB = ''; // editor (owner)
let userC = ''; // terceiro
let clubId = '';
let tokenA = '';
let tokenB = '';
let tokenC = '';

function auth(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, cookie: `access_token=${token}` };
}

function csrf(): Record<string, string> {
  return { 'x-csrf-token': generateCsrfToken('test-proposals') };
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  try {
    await prisma.clubDescriptionProposal.count();
  } catch {
    dbOk = false;
    if (process.env.TEST_REQUIRE_DB === 'true')
      throw new Error('[R1/TEST_REQUIRE_DB] banco ausente no CI — falha, não skip (D-2026-09-18)');
    return;
  }
  const suffix = Date.now();
  const [a, b, c] = await Promise.all([
    prisma.user.create({ data: { email: `prop-a-${suffix}@test.local`, passwordHash: 'x' } }),
    prisma.user.create({ data: { email: `prop-b-${suffix}@test.local`, passwordHash: 'x' } }),
    prisma.user.create({ data: { email: `prop-c-${suffix}@test.local`, passwordHash: 'x' } }),
  ]);
  userA = a.id;
  userB = b.id;
  userC = c.id;
  const club = await prisma.club.create({ data: { name: 'Proposals FC', country: 'BR' } });
  clubId = club.id;
  const mk = (id: string, email: string) =>
    app.jwt.sign({ sub: id, email, roles: [], permissions: [], type: 'access' });
  tokenA = mk(userA, a.email);
  tokenB = mk(userB, b.email);
  tokenC = mk(userC, c.email);
  // B é editor do clube
  await app.inject({
    method: 'POST',
    url: `/api/v1/clubs/${clubId}/own`,
    headers: { ...auth(tokenB), ...csrf() },
  });
});

afterAll(async () => {
  if (dbOk) {
    await prisma.clubDescriptionProposal.deleteMany({ where: { clubId } });
    await prisma.notification.deleteMany({
      where: { userId: { in: [userA, userB, userC] } },
    });
    await prisma.clubOwnership.deleteMany({ where: { userId: { in: [userA, userB, userC] } } });
    await prisma.club.deleteMany({ where: { id: clubId } });
    await prisma.user.deleteMany({ where: { id: { in: [userA, userB, userC] } } });
  }
  await app.close();
});

describe.skipIf(!dbOk || !isPostgres)('WS-C-10 propostas', () => {
  it('não-editor propõe → 201 pending; segunda pending → 409', async () => {
    const r1 = await app.inject({
      method: 'POST',
      url: `/api/v1/clubs/${clubId}/description/proposals`,
      headers: { ...auth(tokenA), ...csrf() },
      payload: { userDescription: 'Texto proposto pela comunidade (10+ chars).' },
    });
    expect(r1.statusCode).toBe(201);
    expect(r1.json().data.status).toBe('pending');

    const r2 = await app.inject({
      method: 'POST',
      url: `/api/v1/clubs/${clubId}/description/proposals`,
      headers: { ...auth(tokenA), ...csrf() },
      payload: { userDescription: 'Segunda proposta pendente (10+ chars).' },
    });
    expect(r2.statusCode).toBe(409);
    expect(r2.json().error.code).toBe('PROPOSAL_ALREADY_PENDING');
  });

  it('GET propostas por não-editor → 403; por editor → 200 com proposerName', async () => {
    const forbidden = await app.inject({
      method: 'GET',
      url: `/api/v1/clubs/${clubId}/description/proposals`,
      headers: auth(tokenC),
    });
    expect(forbidden.statusCode).toBe(403);

    const ok = await app.inject({
      method: 'GET',
      url: `/api/v1/clubs/${clubId}/description/proposals`,
      headers: auth(tokenB),
    });
    expect(ok.statusCode).toBe(200);
    const proposals = ok.json().data.proposals;
    expect(proposals.length).toBe(1);
    expect(proposals[0].proposerName).toBeNull(); // user sem name — nunca userId
  });

  it('GET /clubs/:id do proponente → proposalStatus pending; editor → pendingProposalsCount', async () => {
    const forA = await app.inject({
      method: 'GET',
      url: `/api/v1/clubs/${clubId}`,
      headers: auth(tokenA),
    });
    expect(forA.json().data.proposalStatus).toBe('pending');
    const forB = await app.inject({
      method: 'GET',
      url: `/api/v1/clubs/${clubId}`,
      headers: auth(tokenB),
    });
    expect(forB.json().data.pendingProposalsCount).toBe(1);
  });

  it('PATCH por não-editor → 403', async () => {
    const prop = await prisma.clubDescriptionProposal.findFirst({
      where: { clubId, proposedBy: userA },
    });
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/clubs/${clubId}/description/proposals/${prop!.id}`,
      headers: { ...auth(tokenC), ...csrf() },
      payload: { action: 'approve' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('aprovação pelo editor → 200, descrição aplicada no GET imediato, notificação criada', async () => {
    const prop = await prisma.clubDescriptionProposal.findFirst({
      where: { clubId, proposedBy: userA, status: 'pending' },
    });
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/clubs/${clubId}/description/proposals/${prop!.id}`,
      headers: { ...auth(tokenB), ...csrf() },
      payload: { action: 'approve' },
    });
    expect(res.statusCode).toBe(200);

    // cache invalidado: o GET imediato reflete o texto aprovado
    const club = await app.inject({
      method: 'GET',
      url: `/api/v1/clubs/${clubId}`,
      headers: auth(tokenA),
    });
    expect(club.json().data.userDescription).toContain('Texto proposto pela comunidade');
    expect(club.json().data.proposalStatus).toBe('approved');

    const notif = await prisma.notification.findFirst({
      where: { userId: userA, type: 'proposal_reviewed' },
      orderBy: { createdAt: 'desc' },
    });
    expect(notif).not.toBeNull();
    expect((notif!.payload as { status?: string }).status).toBe('approved');
  });

  it('rejeição com reviewNote → notificação carrega a note; descrição NÃO muda', async () => {
    const before = await app.inject({ method: 'GET', url: `/api/v1/clubs/${clubId}` });
    const descBefore = before.json().data.userDescription;

    const propose = await app.inject({
      method: 'POST',
      url: `/api/v1/clubs/${clubId}/description/proposals`,
      headers: { ...auth(tokenA), ...csrf() },
      payload: { userDescription: 'Proposta que será rejeitada (10+ chars).' },
    });
    expect(propose.statusCode).toBe(201);

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/clubs/${clubId}/description/proposals/${
        (await prisma.clubDescriptionProposal.findFirst({
          where: { clubId, proposedBy: userA, status: 'pending' },
        }))!.id
      }`,
      headers: { ...auth(tokenB), ...csrf() },
      payload: { action: 'reject', reviewNote: 'Precisa de fontes.' },
    });
    expect(res.statusCode).toBe(200);

    const after = await app.inject({ method: 'GET', url: `/api/v1/clubs/${clubId}` });
    expect(after.json().data.userDescription).toBe(descBefore);

    const notif = await prisma.notification.findFirst({
      where: { userId: userA, type: 'proposal_reviewed' },
      orderBy: { createdAt: 'desc' },
    });
    expect((notif!.payload as { status?: string; reviewNote?: string }).status).toBe('rejected');
    expect((notif!.payload as { reviewNote?: string }).reviewNote).toBe('Precisa de fontes.');
  });

  it('auto-revisão bloqueada: editor que vira owner depois de propor não revisa a própria', async () => {
    // C propõe e DEPOIS vira editor do clube → a proposta pending fica de C
    await app.inject({
      method: 'POST',
      url: `/api/v1/clubs/${clubId}/description/proposals`,
      headers: { ...auth(tokenC), ...csrf() },
      payload: { userDescription: 'Proposta do futuro editor (10+ chars).' },
    });
    await app.inject({
      method: 'POST',
      url: `/api/v1/clubs/${clubId}/own`,
      headers: { ...auth(tokenC), ...csrf() },
    });
    const prop = await prisma.clubDescriptionProposal.findFirst({
      where: { clubId, proposedBy: userC, status: 'pending' },
    });
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/clubs/${clubId}/description/proposals/${prop!.id}`,
      headers: { ...auth(tokenC), ...csrf() },
      payload: { action: 'approve' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('SELF_REVIEW_FORBIDDEN');
    // B (outro editor) pode aprovar
    const ok = await app.inject({
      method: 'PATCH',
      url: `/api/v1/clubs/${clubId}/description/proposals/${prop!.id}`,
      headers: { ...auth(tokenB), ...csrf() },
      payload: { action: 'approve' },
    });
    expect(ok.statusCode).toBe(200);
  });

  it('Zod: <10 chars e >2000 chars → 422', async () => {
    const short = await app.inject({
      method: 'POST',
      url: `/api/v1/clubs/${clubId}/description/proposals`,
      headers: { ...auth(tokenA), ...csrf() },
      payload: { userDescription: 'curta' },
    });
    expect(short.statusCode).toBe(422);
    const long = await app.inject({
      method: 'POST',
      url: `/api/v1/clubs/${clubId}/description/proposals`,
      headers: { ...auth(tokenA), ...csrf() },
      payload: { userDescription: 'a'.repeat(2001) },
    });
    expect(long.statusCode).toBe(422);
  });
});
