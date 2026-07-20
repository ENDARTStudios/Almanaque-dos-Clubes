/**
 * Smoke test para session.service.ts.
 * Verifica:
 *   1. createSession gera refreshToken + persiste session com tokenHash
 *   2. verifySession aceita token ativo
 *   3. verifySession rejeita token inexistente
 *   4. verifySession rejeita token revogado (após revokeSession)
 *   5. revokeSession é idempotente
 *   6. revokeAllUserSessions revoga múltiplas sessões
 *   7. countActiveUserSessions conta corretamente
 *   8. listActiveUserSessions retorna sem tokenHash
 *   9. cleanupExpiredSessions deleta registros antigos
 *
 * Uso:
 *   pnpm --filter @almanaque/api exec tsx scripts/verify-session.ts
 */
import { prisma } from '../src/config/prisma.js';
import {
  createSession,
  verifySession,
  revokeSession,
  revokeAllUserSessions,
  countActiveUserSessions,
  listActiveUserSessions,
  cleanupExpiredSessions,
  REFRESH_TOKEN_EXPIRES_MS,
} from '../src/modules/auth/session.service.js';

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, extra?: unknown) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.error(`  ✗ ${name}${extra !== undefined ? ` — ${JSON.stringify(extra)}` : ''}`);
  }
}

async function main() {
  console.log('🧪 Smoke test — session.service\n');

  // Limpa estado anterior
  await prisma.session.deleteMany({});
  await prisma.user.deleteMany({});

  // Cria um usuário de teste
  const user = await prisma.user.create({
    data: {
      email: 'session-test@example.com',
      passwordHash: 'dummy-not-real',
      status: 'ACTIVE',
    },
  });

  // Test 1: createSession
  console.log('Test 1: createSession gera refreshToken e persiste session');
  const { refreshToken, session } = await createSession(user.id, {
    userAgent: 'test-agent',
    ipAddress: '127.0.0.1',
  });
  assert('refreshToken não vazio', refreshToken.length > 0);
  assert('refreshToken tem ~43 chars', refreshToken.length >= 40 && refreshToken.length <= 50);
  assert('session.id é UUID', typeof session.id === 'string' && session.id.length === 36);
  assert('session.userId === user.id', session.userId === user.id);
  assert('session.tokenHash tem 64 chars hex', /^[0-9a-f]{64}$/.test(session.tokenHash));
  assert('session.tokenHash !== refreshToken', session.tokenHash !== refreshToken);
  assert('session.expiresAt > now', session.expiresAt.getTime() > Date.now());
  assert(
    'session.expiresAt ≈ 7 dias',
    Math.abs(session.expiresAt.getTime() - Date.now() - REFRESH_TOKEN_EXPIRES_MS) < 5000,
  );
  assert('session.revokedAt === null', session.revokedAt === null);
  assert('session.userAgent salvo', session.userAgent === 'test-agent');
  assert('session.ipAddress salvo', session.ipAddress === '127.0.0.1');

  // Test 2: verifySession aceita token ativo
  console.log('\nTest 2: verifySession aceita token ativo');
  const verified = await verifySession(refreshToken);
  assert('session retornada não-null', verified !== null);
  assert('session.id corresponde', verified?.id === session.id);
  assert('session.userId corresponde', verified?.userId === user.id);

  // Test 3: verifySession rejeita token inexistente
  console.log('\nTest 3: verifySession rejeita token inexistente');
  const invalid = await verifySession('non-existent-token-xyz');
  assert('retorna null para token inexistente', invalid === null);

  // Test 4: verifySession rejeita token vazio
  console.log('\nTest 4: verifySession rejeita token vazio');
  const empty = await verifySession('');
  assert('retorna null para token vazio', empty === null);

  // Test 5: revokeSession
  console.log('\nTest 5: revokeSession revoga a sessão');
  const revoked = await revokeSession(refreshToken);
  assert('revokeSession retorna true', revoked === true);
  const afterRevoke = await verifySession(refreshToken);
  assert('verifySession retorna null após revoke', afterRevoke === null);

  // Test 6: revokeSession idempotente
  console.log('\nTest 6: revokeSession é idempotente (chamar de novo não quebra)');
  const revokeAgain = await revokeSession(refreshToken);
  assert('segunda chamada não lança erro', revokeAgain === true);
  // Confirma que continua revogada
  const stillRevoked = await verifySession(refreshToken);
  assert('session ainda está revogada', stillRevoked === null);

  // Test 7: múltiplas sessões + revokeAllUserSessions
  console.log('\nTest 7: revokeAllUserSessions revoga todas as sessões ativas');
  const sessions = await Promise.all([
    createSession(user.id, { userAgent: 'browser-1' }),
    createSession(user.id, { userAgent: 'browser-2' }),
    createSession(user.id, { userAgent: 'mobile-app' }),
  ]);
  const activeBefore = await countActiveUserSessions(user.id);
  assert('3 sessões ativas criadas', activeBefore === 3, `atual: ${activeBefore}`);
  const revokedCount = await revokeAllUserSessions(user.id);
  assert('revokeAllUserSessions revogou 3', revokedCount === 3);
  const activeAfter = await countActiveUserSessions(user.id);
  assert('0 sessões ativas após revokeAll', activeAfter === 0);

  // Test 8: listActiveUserSessions
  console.log('\nTest 8: listActiveUserSessions retorna sem tokenHash');
  await Promise.all([
    createSession(user.id, { userAgent: 'browser-A' }),
    createSession(user.id, { userAgent: 'browser-B' }),
  ]);
  const activeList = await listActiveUserSessions(user.id);
  assert('retorna 2 sessões ativas', activeList.length === 2);
  const hasTokenHash = activeList.some((s) => 'tokenHash' in s);
  assert('nenhuma entrada contém tokenHash', !hasTokenHash);
  assert('userAgent salvo corretamente', activeList[0]?.userAgent === 'browser-B' || activeList[0]?.userAgent === 'browser-A');

  // Test 9: cleanupExpiredSessions
  console.log('\nTest 9: cleanupExpiredSessions deleta registros antigos');
  // Cria uma sessão expirada há 40 dias (manualmente via prisma direto)
  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: 'a'.repeat(64),
      expiresAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 dias atrás
      revokedAt: new Date(),
    },
  });
  const beforeCleanup = await prisma.session.count();
  assert('há registros expirados antigos', beforeCleanup > 2);
  const deleted = await cleanupExpiredSessions(30);
  assert('cleanup deletou ≥1 registro', deleted >= 1);
  const afterCleanup = await prisma.session.count();
  assert('total de registros diminuiu', afterCleanup < beforeCleanup);

  // Cleanup final
  await prisma.session.deleteMany({});
  await prisma.user.deleteMany({});

  console.log(`\n${pass}/${pass + fail} asserções passaram`);
  if (fail > 0) {
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error('❌ Erro:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
