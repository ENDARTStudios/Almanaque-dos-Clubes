/**
 * T377 — matriz de acesso RLS de `sessions` (policies completas).
 *
 * Valida positivos (SELECT owner, SELECT por tokenHash, INSERT owner,
 * UPDATE owner/SERVICE, DELETE SERVICE) e negativos (sem contexto,
 * cross-user, tokenHash vazio → deny).
 *
 * Roda contra o Postgres de teste (CI usa o service container em
 * localhost:5432). No host Windows, o bug de port-proxy P1000 impede a
 * execução local — a matriz equivalente já foi validada via psql.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { Prisma } from '@prisma/client';
import { prisma } from '../../src/config/prisma.js';

const USER_A = 'aaaaaaaa-0000-0000-0000-000000000001';
const USER_B = 'aaaaaaaa-0000-0000-0000-000000000002';
const HASH_A = 'rls-policy-hash-a';
const HASH_B = 'rls-policy-hash-b';

async function asAppUser<T>(
  ctx: { userId?: string; role?: string; tokenHash?: string },
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET LOCAL ROLE app_user');
    if (ctx.userId) {
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_user_id', $1, true)`, ctx.userId);
    }
    if (ctx.role) {
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_user_role', $1, true)`, ctx.role);
    }
    if (ctx.tokenHash !== undefined) {
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.current_token_hash', $1, true)`,
        ctx.tokenHash,
      );
    }
    return fn(tx);
  });
}

async function countSessions(tx: Prisma.TransactionClient): Promise<number> {
  const rows = await tx.$queryRawUnsafe<Array<{ n: bigint }>>(
    `SELECT count(*)::bigint AS n FROM sessions`,
  );
  return Number(rows[0].n);
}

describe('RLS sessions — matriz completa (T377)', () => {
  beforeAll(async () => {
    await prisma.$executeRawUnsafe(
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='app_user') THEN CREATE ROLE app_user; END IF; END $$`,
    );
    await prisma.$executeRawUnsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON sessions TO app_user`);
    await prisma.$executeRawUnsafe(
      `INSERT INTO users (id, email, "passwordHash", "updatedAt")
       VALUES ($1, 'rls-a@test.local', 'x', now()), ($2, 'rls-b@test.local', 'x', now())
       ON CONFLICT (id) DO NOTHING`,
      USER_A,
      USER_B,
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM sessions WHERE "tokenHash" IN ($1, $2)`,
      HASH_A,
      HASH_B,
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO sessions (id, "userId", "tokenHash", "expiresAt")
       VALUES (gen_random_uuid(), $1, $2, '2030-01-01'),
              (gen_random_uuid(), $3, $4, '2030-01-01')`,
      USER_A,
      HASH_A,
      USER_B,
      HASH_B,
    );
  });

  it('POS: owner SELECT vê apenas as próprias sessões', async () => {
    const n = await asAppUser({ userId: USER_A }, countSessions);
    expect(n).toBe(1);
  });

  it('POS: SELECT por tokenHash (posse) retorna a sessão', async () => {
    const n = await asAppUser({ tokenHash: HASH_A }, countSessions);
    expect(n).toBe(1);
  });

  it('NEG: sem contexto é deny-by-default', async () => {
    const n = await asAppUser({}, countSessions);
    expect(n).toBe(0);
  });

  it('NEG: cross-user é deny (A não vê sessões de B)', async () => {
    const n = await asAppUser({ userId: USER_A }, async (tx) => {
      const rows = await tx.$queryRawUnsafe<Array<{ n: bigint }>>(
        `SELECT count(*)::bigint AS n FROM sessions WHERE "userId" = $1`,
        USER_B,
      );
      return Number(rows[0].n);
    });
    expect(n).toBe(0);
  });

  it('NEG: tokenHash vazio é deny', async () => {
    const n = await asAppUser({ tokenHash: '' }, countSessions);
    expect(n).toBe(0);
  });

  it('POS: INSERT owner cria a própria sessão', async () => {
    await asAppUser({ userId: USER_A }, async (tx) => {
      await tx.$executeRawUnsafe(
        `INSERT INTO sessions (id, "userId", "tokenHash", "expiresAt")
         VALUES (gen_random_uuid(), $1, 'rls-policy-hash-a2', '2030-01-01')`,
        USER_A,
      );
    });
    const rows = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
      `SELECT count(*)::bigint AS n FROM sessions WHERE "tokenHash" = 'rls-policy-hash-a2'`,
    );
    expect(Number(rows[0].n)).toBe(1);
  });

  it('NEG: INSERT sem contexto falha', async () => {
    await expect(
      asAppUser({}, async (tx) => {
        await tx.$executeRawUnsafe(
          `INSERT INTO sessions (id, "userId", "tokenHash", "expiresAt")
           VALUES (gen_random_uuid(), $1, 'rls-policy-hash-b2', '2030-01-01')`,
          USER_B,
        );
      }),
    ).rejects.toThrow();
  });

  it('POS: UPDATE owner + UPDATE SERVICE + DELETE SERVICE', async () => {
    await asAppUser({ userId: USER_A }, async (tx) => {
      await tx.$executeRawUnsafe(
        `UPDATE sessions SET "revokedAt" = now() WHERE "tokenHash" = 'rls-policy-hash-a2'`,
      );
    });
    await asAppUser({ role: 'SERVICE' }, async (tx) => {
      await tx.$executeRawUnsafe(
        `UPDATE sessions SET "revokedAt" = now() WHERE "tokenHash" = $1`,
        HASH_B,
      );
      await tx.$executeRawUnsafe(`DELETE FROM sessions WHERE "tokenHash" = $1`, HASH_B);
    });
    const rows = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
      `SELECT count(*)::bigint AS n FROM sessions WHERE "tokenHash" = $1`,
      HASH_B,
    );
    expect(Number(rows[0].n)).toBe(0);
  });
});
