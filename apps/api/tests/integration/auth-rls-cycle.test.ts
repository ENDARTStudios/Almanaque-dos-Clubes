/**
 * T371 — ciclo completo de auth via session.service sob adoção RLS.
 *
 * Verifica o comportamento funcional (create → verify → find → revoke →
 * cleanup) após a adoção de `withRlsContext`. Roda em CI contra o Postgres de
 * teste (localhost:5432); no host Windows o port-proxy P1000 impede execução
 * local — a prova de enforcement RLS (cross-user deny) foi feita via psql
 * (matriz T377 + ciclo em docs/RLS-POLICIES.md).
 *
 * Nota: o cliente Prisma de teste conecta como superuser (`almanaque`), que
 * ignora RLS; portanto este teste valida a CORREÇÃO funcional da adoção, e a
 * prova de enforcement fica com a matriz psql.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '../../src/config/prisma.js';
import {
  createSession,
  verifySession,
  findSessionByToken,
  revokeSession,
  cleanupExpiredSessions,
} from '../../src/modules/auth/session.service.js';

const USER = 'cccccccc-0000-0000-0000-000000000001';

describe('auth RLS cycle (T371)', () => {
  beforeAll(async () => {
    await prisma.$executeRawUnsafe(
      `INSERT INTO users (id, email, "passwordHash", "updatedAt")
       VALUES ($1, 'cycle@test.local', 'x', now())
       ON CONFLICT (id) DO NOTHING`,
      USER,
    );
    await prisma.$executeRawUnsafe(`DELETE FROM sessions WHERE "userId" = $1`, USER);
  });

  it('ciclo create → verify → find → revoke → verify null → cleanup', async () => {
    const { refreshToken, session } = await createSession(USER, { userAgent: 'vitest' });
    expect(session.userId).toBe(USER);

    const verified = await verifySession(refreshToken);
    expect(verified?.id).toBe(session.id);

    const found = await findSessionByToken(refreshToken);
    expect(found?.id).toBe(session.id);

    expect(await revokeSession(refreshToken)).toBe(true);

    expect(await verifySession(refreshToken)).toBeNull();

    await expect(cleanupExpiredSessions(0)).resolves.toBeGreaterThanOrEqual(0);
  });
});
