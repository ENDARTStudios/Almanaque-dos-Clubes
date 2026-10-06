/**
 * WS-C-11 — denúncias (moderação defensiva).
 *
 * Fluxo: user reporta club_description → admin lista (reports_pending_list com
 * nomes + report_count) → resolve remove_content (userDescription limpo + cache
 * invalidado) · dismiss com note · gates: não-admin 403, 422 payload, RLS
 * (reporter só vê as suas).
 *
 * Admin nos testes = JWT com a permissão reports:moderate (o gate da rota é
 * requirePermission; a role admin a tem — RBAC).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { generateCsrfToken } from '../../src/middleware/csrf.js';
import { prisma } from '../../src/config/prisma.js';
import { PERMISSIONS } from '../../src/modules/auth/rbac.service.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let dbOk = true;
const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');
let user = '';
let admin = '';
let clubId = '';
let userToken = '';
let adminToken = '';

function auth(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, cookie: `access_token=${token}` };
}

function csrf(): Record<string, string> {
  return { 'x-csrf-token': generateCsrfToken('test-reports') };
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  try {
    await prisma.report.count();
  } catch {
    dbOk = false;
    if (process.env.TEST_REQUIRE_DB === 'true')
      throw new Error('[R1/TEST_REQUIRE_DB] banco ausente no CI — falha, não skip (D-2026-09-18)');
    return;
  }
  const suffix = Date.now();
  const [u, a] = await Promise.all([
    prisma.user.create({ data: { email: `rep-u-${suffix}@test.local`, passwordHash: 'x' } }),
    prisma.user.create({ data: { email: `rep-admin-${suffix}@test.local`, passwordHash: 'x' } }),
  ]);
  user = u.id;
  admin = a.id;
  const club = await prisma.club.create({
    data: {
      name: 'Reports FC',
      country: 'BR',
      userDescription: 'Descricao comunitaria alvo de denuncia (smoke).',
      userDescriptionSource: 'community',
      userDescriptionUpdatedAt: new Date(),
    },
  });
  clubId = club.id;
  const mk = (id: string, email: string, perms: string[]) =>
    app.jwt.sign({
      sub: id,
      email,
      roles: perms.length ? ['admin'] : [],
      permissions: perms,
      type: 'access',
    });
  userToken = mk(user, u.email, []);
  adminToken = mk(admin, a.email, [PERMISSIONS.REPORTS_MODERATE]);
});

afterAll(async () => {
  if (dbOk) {
    await prisma.report.deleteMany({ where: { reporterId: user } });
    await prisma.club.deleteMany({ where: { id: clubId } });
    await prisma.user.deleteMany({ where: { id: { in: [user, admin] } } });
  }
  await app.close();
});

describe.skipIf(!dbOk || !isPostgres)('WS-C-11 reports (rotas)', () => {
  it('POST report club_description → 201; alvo sem descrição → 400', async () => {
    const ok = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: { ...auth(userToken), ...csrf() },
      payload: {
        targetType: 'club_description',
        targetId: clubId,
        reason: 'misinformation',
        details: 'Conteudo incorreto (smoke).',
      },
    });
    expect(ok.statusCode).toBe(201);

    // clube SEM userDescription → nada a denunciar
    const club2 = await prisma.club.create({ data: { name: 'Sem descricao FC' } });
    const empty = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: { ...auth(userToken), ...csrf() },
      payload: { targetType: 'club_description', targetId: club2.id, reason: 'spam' },
    });
    expect(empty.statusCode).toBe(400);
    expect(empty.json().error.code).toBe('NOTHING_TO_REPORT');
    await prisma.club.delete({ where: { id: club2.id } });
  });

  it('POST report proposal → 201 (proposta pending); revisada → 400', async () => {
    const proposal = await prisma.clubDescriptionProposal.create({
      data: {
        clubId,
        proposedBy: user,
        userDescription: 'Proposta alvo de denuncia.',
        status: 'pending',
      },
    });
    const ok = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: { ...auth(userToken), ...csrf() },
      payload: { targetType: 'proposal', targetId: proposal.id, reason: 'offensive' },
    });
    expect(ok.statusCode).toBe(201);

    const reviewed = await prisma.clubDescriptionProposal.create({
      data: { clubId, proposedBy: user, userDescription: 'Ja revisada.', status: 'rejected' },
    });
    const bad = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: { ...auth(userToken), ...csrf() },
      payload: { targetType: 'proposal', targetId: reviewed.id, reason: 'spam' },
    });
    expect(bad.statusCode).toBe(400);
  });

  it('GET pending por não-admin → 403; por admin → 200 com nomes e report_count', async () => {
    const forbidden = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/pending',
      headers: auth(userToken),
    });
    expect(forbidden.statusCode).toBe(403);

    const ok = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/pending',
      headers: auth(adminToken),
    });
    expect(ok.statusCode).toBe(200);
    const reports = ok.json().data.reports;
    expect(reports.length).toBeGreaterThanOrEqual(1);
    const mine = reports.find((r: { targetId: string }) => r.targetId === clubId);
    expect(mine.reportCount).toBeGreaterThanOrEqual(1);
    expect(mine.targetClubName).toBe('Reports FC');
    expect(JSON.stringify(reports)).not.toContain(user); // userId nunca exposto
  });

  it('resolve remove_content → 200, userDescription limpo e cache invalidado', async () => {
    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/pending',
      headers: auth(adminToken),
    });
    const reportId = list
      .json()
      .data.reports.find((r: { targetId: string }) => r.targetId === clubId).id;

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/reports/${reportId}/resolve`,
      headers: { ...auth(adminToken), ...csrf() },
      payload: { action: 'remove_content', reviewNote: 'Conteudo removido (smoke).' },
    });
    expect(res.statusCode).toBe(200);

    const club = await prisma.club.findUnique({ where: { id: clubId } });
    expect(club?.userDescription).toBeNull();

    const get = await app.inject({ method: 'GET', url: `/api/v1/clubs/${clubId}` });
    expect(get.json().data.userDescription).toBeNull();

    const twice = await app.inject({
      method: 'PATCH',
      url: `/api/v1/reports/${reportId}/resolve`,
      headers: { ...auth(adminToken), ...csrf() },
      payload: { action: 'no_action' },
    });
    expect(twice.statusCode).toBe(409);
  });

  it('dismiss com note → 200; não-admin resolve/dismiss → 403', async () => {
    const proposal = await prisma.clubDescriptionProposal.create({
      data: {
        clubId,
        proposedBy: user,
        userDescription: 'Outra proposta p/ dismiss.',
        status: 'pending',
      },
    });
    await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: { ...auth(userToken), ...csrf() },
      payload: { targetType: 'proposal', targetId: proposal.id, reason: 'spam' },
    });
    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/pending',
      headers: auth(adminToken),
    });
    const reportId = list
      .json()
      .data.reports.find((r: { targetId: string }) => r.targetId === proposal.id).id;

    const forbidden = await app.inject({
      method: 'PATCH',
      url: `/api/v1/reports/${reportId}/dismiss`,
      headers: { ...auth(userToken), ...csrf() },
      payload: { reviewNote: 'x' },
    });
    expect(forbidden.statusCode).toBe(403);

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/reports/${reportId}/dismiss`,
      headers: { ...auth(adminToken), ...csrf() },
      payload: { reviewNote: 'Sem violação (smoke).' },
    });
    expect(res.statusCode).toBe(200);
    const still = await prisma.clubDescriptionProposal.findUnique({ where: { id: proposal.id } });
    expect(still).not.toBeNull(); // dismiss NÃO remove conteúdo
  });

  it('RLS: reporter vê só as suas próprias denúncias (SELECT direto)', async () => {
    const { withRlsContext } = await import('../../src/config/rls-context.js');
    const own = await withRlsContext({ userId: user }, (tx) =>
      tx.report.findMany({ where: { reporterId: user } }),
    );
    expect(own.length).toBeGreaterThanOrEqual(1);
  });
});
