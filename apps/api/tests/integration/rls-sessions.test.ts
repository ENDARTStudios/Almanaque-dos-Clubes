/**
 * T345 — prova de isolamento RLS em `sessions` (A≠B).
 *
 * Pré-requisitos: Postgres de teste do docker-compose com as migrations
 * aplicadas (inclui `20260824_rls_sessions`) e a role `app_user` criada.
 *
 * A prova SQL equivalente já foi capturada via psql (docs/RLS-POLICIES.md):
 *   owner A vê apenas a própria sessão; SERVICE vê ambas; sem contexto vê 0.
 *
 * Este teste formaliza os três cenários via Prisma. Roda em CI com o service
 * container Postgres (localhost:5432). No host Windows, o bug de port-proxy do
 * Docker Desktop (P1000) pode impedir a execução local.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '../../src/config/prisma.js';

const USER_A = 'aaaaaaaa-0000-0000-0000-000000000001';
const USER_B = 'aaaaaaaa-0000-0000-0000-000000000002';
const FILTER = `"tokenHash" IN ('rlstest-token-a','rlstest-token-b')`;

async function visibleTokens(tx: {
  $queryRawUnsafe: typeof prisma.$queryRawUnsafe;
}): Promise<string[]> {
  const rows = await tx.$queryRawUnsafe<Array<{ t: string }>>(
    `SELECT "tokenHash" AS t FROM sessions WHERE ${FILTER} ORDER BY "tokenHash"`,
  );
  return rows.map((r) => r.t);
}

describe('RLS em sessions — isolamento A≠B (T345)', () => {
  beforeAll(async () => {
    await prisma.$executeRawUnsafe(
      `INSERT INTO users (id, email, "passwordHash", "updatedAt")
       VALUES ($1, 'rlstest-a@local.test', 'x', now()),
              ($2, 'rlstest-b@local.test', 'x', now())
       ON CONFLICT (email) DO NOTHING`,
      USER_A,
      USER_B,
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO sessions (id, "userId", "tokenHash", "expiresAt")
       VALUES (gen_random_uuid(), $1, 'rlstest-token-a', now() + interval '1 day'),
              (gen_random_uuid(), $2, 'rlstest-token-b', now() + interval '1 day')
       ON CONFLICT ("tokenHash") DO NOTHING`,
      USER_A,
      USER_B,
    );
  });

  it('owner A vê apenas a própria sessão (B invisível)', async () => {
    const tokens = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET ROLE app_user');
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_user_id', $1, false)`, USER_A);
      return visibleTokens(tx);
    });
    expect(tokens).toEqual(['rlstest-token-a']);
  });

  it('role SERVICE vê ambas as sessões', async () => {
    const tokens = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET ROLE app_user');
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_user_role', 'SERVICE', false)`);
      return visibleTokens(tx);
    });
    expect(tokens).toEqual(['rlstest-token-a', 'rlstest-token-b']);
  });

  it('sem contexto é deny-by-default (0 linhas)', async () => {
    const tokens = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET ROLE app_user');
      return visibleTokens(tx);
    });
    expect(tokens).toEqual([]);
  });
});
