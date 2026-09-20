/**
 * T456 — corrida refresh × logout: o "Sair" deve encerrar a FAMÍLIA de
 * sessão. Reproduz o incidente 09-20: rotação A→B em voo quando o logout
 * apresenta o token A (stale) — a sessão filha B tem de morrer junto.
 * Hoje (logout só revoga o token apresentado) B sobrevive = ressurreição.
 *
 * Local sem banco → skip honesto; CI valida.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import { createSession, verifySession } from '../../src/modules/auth/session.service.js';
import { refreshSession, logout } from '../../src/modules/auth/auth.service.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let dbOk = true;
let userId = '';
let sessionsCreated: string[] = [];

beforeAll(async () => {
  // withRlsContext usa set_config (Postgres) — não roda no espelho sqlite.
  if (process.env.PRISMA_SCHEMA_PROVIDER === 'sqlite') {
    console.warn('[t456] sqlite: skip honesto — RLS/set_config exige Postgres (CI valida)');
    return;
  }
  app = await buildApp();
  await app.ready();
  try {
    await prisma.session.count();
  } catch {
    dbOk = false;
    return;
  }
  const user = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      email: `t456.race.${Date.now()}@test.local`,
      passwordHash: 'x',
    },
  });
  userId = user.id;
});

afterAll(async () => {
  if (dbOk && userId) {
    await prisma.session.deleteMany({ where: { userId } });
    await prisma.auditLog.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  }
  await app.close();
});

describe('T456 — logout encerra a família de sessão (corrida refresh × logout)', () => {
  it('rotação A→B em voo + logout com A stale → B morre (nada ressuscita)', async () => {
    if (!dbOk || process.env.PRISMA_SCHEMA_PROVIDER === 'sqlite') { console.warn('[t456] skip sqlite'); return; }
    // A: sessão original (login)
    const a = await createSession(userId, {});
    sessionsCreated.push(a.session.id);
    // corrida: o refresh A→B vence o logout (rotação revoga A, cria B)
    const b = await refreshSession(a.refreshToken, {});
    sessionsCreated.push(b.sessionId);
    expect(await verifySession(b.refreshToken)).not.toBeNull(); // B ativa

    // o Operador clica Sair — o client ainda apresenta o token A (stale)
    await logout(a.refreshToken);

    // T456 — a FAMÍLIA morre: nem A nem B podem ser usadas
    expect(await verifySession(a.refreshToken)).toBeNull();
    expect(await verifySession(b.refreshToken)).toBeNull();

    const ativas = await prisma.session.count({
      where: { userId, revokedAt: null },
    });
    expect(ativas).toBe(0);
  });

  it('logout idempotente: segundo Sair com o mesmo token não quebra', async () => {
    if (!dbOk || process.env.PRISMA_SCHEMA_PROVIDER === 'sqlite') { console.warn('[t456] skip sqlite'); return; }
    const a = await createSession(userId, {});
    await logout(a.refreshToken);
    const second = await logout(a.refreshToken); // já revogada
    expect(second).toBe(true);
  });
});
