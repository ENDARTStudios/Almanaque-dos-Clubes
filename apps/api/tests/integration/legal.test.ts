/**
 * T470 — Integração do módulo legal (Postgres real).
 *
 * Prova: RLS owner-scoped como `app_user` (SET LOCAL ROLE): cada titular só vê o
 * próprio pedido; UPDATE direto pelo titular é negado (só SERVICE); SERVICE
 * atualiza. Fluxo do serviço: protocolo, prazo, cancelamento, export sem
 * segredos e exclusão (soft + anonimização + sessões revogadas).
 * Local sem Postgres → skip honesto (R1: TEST_REQUIRE_DB falha em CI).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../src/config/prisma.js';
import { withRlsContext } from '../../src/config/rls-context.js';
import { hashPassword } from '../../src/config/crypto.js';
import { legalRepository } from '../../src/modules/legal/repository.js';
import { legalService } from '../../src/modules/legal/service.js';

const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');
let dbOk = true;

const aId = randomUUID();
const bId = randomUUID();
const cId = randomUUID();
const aEmail = `t470a_${Date.now()}@example.com`;
const bEmail = `t470b_${Date.now()}@example.com`;
const cEmail = `t470c_${Date.now()}@example.com`;
const PASSWORD = 'S3nh4-Forte!2026';

type Tx = Prisma.TransactionClient;

async function asAppUser<T>(userId: string | null, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return withRlsContext({ userId: userId ?? undefined, role: 'USER' }, async (tx) => {
    await tx.$executeRawUnsafe('SET LOCAL ROLE app_user');
    return fn(tx);
  });
}
async function asService<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return withRlsContext({ role: 'SERVICE' }, async (tx) => {
    await tx.$executeRawUnsafe('SET LOCAL ROLE app_user');
    return fn(tx);
  });
}

async function cleanup(): Promise<void> {
  const ids = [aId, bId, cId];
  await prisma.copyrightNotice.deleteMany({ where: { userId: { in: ids } } });
  await prisma.dataSubjectRequest.deleteMany({ where: { userId: { in: ids } } });
  await prisma.session.deleteMany({ where: { userId: { in: ids } } });
  await prisma.auditLog.deleteMany({ where: { entityId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

beforeAll(async () => {
  if (!isPostgres) return;
  try {
    await prisma.user.count();
  } catch {
    dbOk = false;
    if (process.env.TEST_REQUIRE_DB === 'true')
      throw new Error('[R1/TEST_REQUIRE_DB] banco ausente no CI — falha, não skip (D-2026-09-18)');
    return;
  }
  await cleanup();
  const hash = await hashPassword(PASSWORD);
  await prisma.user.createMany({
    data: [
      { id: aId, email: aEmail, passwordHash: hash, name: 'Titular A' },
      { id: bId, email: bEmail, passwordHash: hash, name: 'Titular B' },
      { id: cId, email: cEmail, passwordHash: hash, name: 'Titular C' },
    ],
  });
});

afterAll(async () => {
  if (isPostgres && dbOk) await cleanup();
});

describe('T470 — RLS owner-scoped em data_subject_requests (app_user)', () => {
  it('titular cria/lê o próprio; não vê o de terceiro; UPDATE direto negado; SERVICE atualiza', async () => {
    if (!dbOk) return;
    const protocol = `dsr_${randomUUID().replace(/-/g, '')}`;
    const created = await asAppUser(aId, (tx) =>
      legalRepository.createDsr(tx, {
        protocol,
        userId: aId,
        type: 'confirmation_access',
        jurisdiction: 'BR',
        description: 'pedido de acesso',
        requestedFields: ['account'],
        deadlineAt: new Date(),
      }),
    );
    expect(created.protocol).toBe(protocol);

    // A vê o seu; B não vê o de A.
    expect(await asAppUser(aId, (tx) => legalRepository.listDsrByUser(tx, aId))).toHaveLength(1);
    expect(await asAppUser(bId, (tx) => legalRepository.listDsrByUser(tx, bId))).toHaveLength(0);
    expect(
      await asAppUser(bId, (tx) => legalRepository.findDsrByProtocol(tx, protocol)),
    ).toBeNull();

    // UPDATE direto pelo titular (role USER) é negado (política service-only).
    await expect(
      asAppUser(aId, (tx) => legalRepository.updateDsr(tx, created.id, { status: 'cancelled' })),
    ).rejects.toBeTruthy();

    // SERVICE atualiza.
    const svc = await asService((tx) =>
      legalRepository.updateDsr(tx, created.id, { status: 'in_progress' }),
    );
    expect(svc.status).toBe('in_progress');
  });
});

describe('T470 — fluxo do serviço (protocolo, prazo, cancelamento)', () => {
  it('cria pedido com protocolo dsr_ e prazo BR (15d); lista; detalha; cancela', async () => {
    if (!dbOk) return;
    const before = Date.now();
    const created = await legalService.createRightsRequest(aId, {
      type: 'portability',
      jurisdiction: 'BR',
      description: 'quero meus dados',
      requestedFields: ['account', 'billing'],
    });
    expect(created.protocol).toMatch(/^dsr_[0-9a-f]{24}$/);
    const days = Math.round((new Date(created.deadlineAt as Date).getTime() - before) / 86400000);
    expect(days).toBe(15);

    expect((await legalService.listRightsRequests(aId)).length).toBeGreaterThanOrEqual(1);
    const detail = await legalService.getRightsRequest(aId, created.protocol);
    expect(detail.type).toBe('portability');

    const cancelled = await legalService.cancelRightsRequest(aId, created.protocol);
    expect(cancelled.status).toBe('cancelled');
  });
});

describe('T470 — exportação pessoal (sem segredos)', () => {
  it('inclui conta/e-mail e NÃO inclui passwordHash nem tokenHash', async () => {
    if (!dbOk) return;
    const data = await legalService.exportPersonalData(aId);
    expect(data.account?.email).toBe(aEmail);
    expect(JSON.stringify(data)).not.toContain('passwordHash');
    expect(JSON.stringify(data)).not.toContain('tokenHash');
  });
});

describe('T470 — exclusão de conta (soft + anonimização + sessões revogadas)', () => {
  it('anonimiza e-mail, marca deletedAt, cria DSR completed e revoga sessões', async () => {
    if (!dbOk) return;
    await prisma.session.create({
      data: {
        userId: cId,
        tokenHash: `h_${randomUUID()}`,
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });
    const result = await legalService.deleteAccount(cId, PASSWORD);
    expect(result.protocol).toMatch(/^dsr_[0-9a-f]{24}$/);

    const user = await prisma.user.findUnique({ where: { id: cId } });
    expect(user?.email).toMatch(/^deleted_.*@almanaquedosclubes\.invalid$/);
    expect(user?.name).toBeNull();
    expect(user?.status).toBe('INACTIVE');
    expect(user?.deletedAt).not.toBeNull();

    const activeSessions = await prisma.session.count({ where: { userId: cId, revokedAt: null } });
    expect(activeSessions).toBe(0);

    const dsr = await prisma.dataSubjectRequest.findFirst({
      where: { userId: cId, type: 'anonymization_blockage_deletion' },
    });
    expect(dsr?.status).toBe('completed');
  });

  it('rejeita senha inválida (401) sem alterar a conta', async () => {
    if (!dbOk) return;
    await expect(legalService.deleteAccount(bId, 'senha-errada')).rejects.toMatchObject({
      statusCode: 401,
    });
    const user = await prisma.user.findUnique({ where: { id: bId } });
    expect(user?.deletedAt).toBeNull();
  });
});
