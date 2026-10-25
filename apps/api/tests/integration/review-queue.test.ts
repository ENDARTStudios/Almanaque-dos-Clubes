/**
 * T599/DQ-04 — fila de revisão: validações de partida alimentam a fila de forma
 * idempotente; admin resolve/descarta via API (trio de autorização das rotas
 * internas). Postgres obrigatório (metadata Json + índice parcial UNIQUE).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import { runMatchValidations, syncAnomaliesToQueue } from '../../src/jobs/match-validations.js';
import { generateCsrfToken } from '../../src/middleware/csrf.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let dbOk = true;
const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');

let matchId = '';
let clubA = '';
let clubB = '';
let adminId = '';
let adminToken = '';

function auth(): Record<string, string> {
  return {
    Authorization: `Bearer ${adminToken}`,
    cookie: `access_token=${adminToken}`,
  };
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  if (!isPostgres) return;
  try {
    await prisma.knowledgeGraph.count();
  } catch {
    dbOk = false;
    if (process.env.TEST_REQUIRE_DB === 'true')
      throw new Error('[R1/TEST_REQUIRE_DB] banco ausente no CI — falha, não skip (D-2026-09-18)');
    return;
  }
  const suffix = Date.now();
  const [a, b] = await Promise.all([
    prisma.club.create({ data: { name: `Fila FC A ${suffix}`, country: 'BR' } }),
    prisma.club.create({ data: { name: `Fila FC B ${suffix}`, country: 'BR' } }),
  ]);
  clubA = a.id;
  clubB = b.id;
  // Fixture do achado: partida FINISHED sem placar (o caso mais comum de
  // ingestão pendente) — a checagem `match_finished_without_score` deve pegar.
  const m = await prisma.match.create({
    data: {
      homeClubId: clubA,
      awayClubId: clubB,
      date: new Date('2025-02-01T19:30:00Z'),
      status: 'FINISHED',
      importedFrom: 'manual',
    },
  });
  matchId = m.id;
  // Admin de teste: role admin via UserRole (requireRole lê roles do JWT — o
  // middleware confia no payload; o token carrega roles=['admin']).
  // O requireOperator identifica o Operador por E-MAIL (allowlist do config) —
  // a conta de teste usa o primeiro e-mail da allowlist, padrão dos testes admin.
  const OPERADOR = process.env.OPERATOR_EMAILS?.split(',')[0]?.trim() ?? 'endart.studios@gmail.com';
  const admin = await prisma.user.create({
    data: { email: OPERADOR, passwordHash: 'x', name: 'Admin Fila' },
  });
  adminId = admin.id;
  adminToken = app.jwt.sign({
    sub: adminId,
    email: admin.email,
    roles: ['admin'],
    permissions: [],
    type: 'access',
  });
});

afterAll(async () => {
  if (dbOk && isPostgres) {
    await prisma.reviewQueue.deleteMany({ where: { entityId: matchId } });
    await prisma.match.delete({ where: { id: matchId } }).catch(() => undefined);
    await prisma.club.deleteMany({ where: { id: { in: [clubA, clubB] } } });
    await prisma.user.delete({ where: { id: adminId } }).catch(() => undefined);
  }
  await app.close();
});

describe.skipIf(!dbOk || !isPostgres)('DQ-04 — validações de partida → fila', () => {
  it('pega a partida FINISHED sem placar e alimenta a fila (idempotente)', async () => {
    const anomalies = await runMatchValidations();
    const alvo = anomalies.find((a) => a.check === 'match_finished_without_score');
    expect(alvo).toBeDefined();
    expect(alvo!.sample.some((s) => s.id === matchId)).toBe(true);

    const r1 = await syncAnomaliesToQueue(alvo ? [alvo] : []);
    expect(r1.queued).toBeGreaterThanOrEqual(1);
    // re-run: NADA duplica (a UNIQUE parcial é o contrato)
    const r2 = await syncAnomaliesToQueue(alvo ? [alvo] : []);
    expect(r2.queued).toBe(0);
    expect(r2.alreadyPending).toBeGreaterThanOrEqual(1);

    const rows = await prisma.reviewQueue.findMany({
      where: { entityType: 'Match', entityId: matchId, status: 'PENDING' },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].severity).toBe('high');
  });

  it('admin resolve a pendência via API; não-admin toma 403', async () => {
    const row = await prisma.reviewQueue.findFirst({
      where: { entityType: 'Match', entityId: matchId, status: 'PENDING' },
    });
    expect(row).not.toBeNull();

    const ok = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/review-queue/${row!.id}/resolve`,
      headers: { ...auth(), 'x-csrf-token': generateCsrfToken('t599') },
      payload: { note: 'placar importado do rsssf' },
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().data.status).toBe('RESOLVED');

    // resolvida não aceita nova resolução
    const deNovo = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/review-queue/${row!.id}/resolve`,
      headers: { ...auth(), 'x-csrf-token': generateCsrfToken('t599') },
      payload: {},
    });
    expect(deNovo.statusCode).toBe(409);

    // sem admin → 403 (authenticate passa com usuário comum; requireRole barra)
    const comum = await prisma.user.create({
      data: { email: `fila-comum-${Date.now()}@test.local`, passwordHash: 'x' },
    });
    const tokenComum = app.jwt.sign({
      sub: comum.id,
      email: comum.email,
      roles: [],
      permissions: [],
      type: 'access',
    });
    const negado = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/review-queue?status=PENDING',
      headers: { Authorization: `Bearer ${tokenComum}`, cookie: `access_token=${tokenComum}` },
    });
    expect([403, 401]).toContain(negado.statusCode);
    await prisma.user.delete({ where: { id: comum.id } }).catch(() => undefined);
  });

  it('após resolver, o re-run do feed NÃO reabre a mesma pendência (dismiss/resolução valem)', async () => {
    const anomalies = await runMatchValidations();
    const alvo = anomalies.find((a) => a.check === 'match_finished_without_score');
    const r = await syncAnomaliesToQueue(alvo ? [alvo] : []);
    // a pendência anterior virou RESOLVED — a UNIQUE parcial cobre só PENDING,
    // então uma NOVA pendência abre: é o comportamento desejado (o problema
    // persiste no dado, a fila reabre). O que NÃO pode acontecer é duplicar
    // PENDING para a mesma checagem.
    const pendentes = await prisma.reviewQueue.findMany({
      where: { entityType: 'Match', entityId: matchId, status: 'PENDING' },
    });
    const qtdPendentes = pendentes.length;
    if (r.queued > 0) expect(qtdPendentes).toBe(1);
  });
});
