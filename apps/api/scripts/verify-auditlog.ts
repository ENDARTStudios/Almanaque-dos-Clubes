/**
 * Smoke test para o módulo de AuditLog.
 * Verifica que:
 *   1. auditLog.record() insere um registro
 *   2. AuditLog não tem métodos update/delete expostos
 *   3. Campos sensíveis são mascarados
 *   4. listByEntity e listByUser funcionam
 *
 * Roda contra o SQLite sandbox.
 *
 * Uso:
 *   pnpm --filter @almanaque/api exec tsx scripts/verify-auditlog.ts
 */
import { prisma } from '../src/config/prisma.js';
import { auditLog, AuditAction, EntityType } from '../src/modules/audit/audit-log.service.js';

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, extra?: string) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.error(`  ✗ ${name}${extra ? ` — ${extra}` : ''}`);
  }
}

async function main() {
  console.log('🧪 Smoke test — AuditLog module\n');

  await prisma.auditLog.deleteMany({});
  // Limpa users (cascade também limpa sessions, subscriptions, etc.)
  await prisma.user.deleteMany({});

  // Cria um user dummy para satisfazer FK (AuditLog.userId → users.id)
  const testUserId = '00000000-0000-0000-0000-000000000001';
  await prisma.user.create({
    data: {
      id: testUserId,
      email: 'audit-test@example.com',
      passwordHash: 'dummy-hash-not-real',
      status: 'ACTIVE',
    },
  });

  // Test 1: record insere
  console.log('Test 1: auditLog.record insere um registro');
  await auditLog.record({
    entityType: EntityType.USER,
    entityId: testUserId,
    action: AuditAction.USER_LOGIN,
    userId: testUserId,
    metadata: { ip: '127.0.0.1', userAgent: 'test-agent' },
  });
  const count = await prisma.auditLog.count();
  assert('registro inserido', count === 1, `esperado 1, atual ${count}`);

  // Test 2: campos sensíveis mascarados (userId null = sistema)
  console.log('\nTest 2: campos sensíveis são mascarados');
  await auditLog.record({
    entityType: EntityType.USER,
    entityId: '00000000-0000-0000-0000-000000000002',
    action: AuditAction.USER_REGISTER,
    userId: null,
    changes: {
      password: { old: null, new: 'super-secret-password-123' },
      email: { old: null, new: 'user@example.com' },
      name: { old: null, new: 'Test User' },
    },
    metadata: {
      ip: '127.0.0.1',
      token: 'should-be-redacted',
    },
  });
  const all = await prisma.auditLog.findMany();
  const last = all[all.length - 1];
  const changesStr = String(last.changes ?? '');
  const metadataStr = String(last.metadata ?? '');
  assert('senha não aparece em changes', !changesStr.includes('super-secret-password-123'), `atual: ${changesStr}`);
  assert('changes contém ***REDACTED***', changesStr.includes('REDACTED'));
  assert('token mascarado em metadata', !metadataStr.includes('should-be-redacted'), `atual: ${metadataStr}`);
  assert('ip preservado em metadata', metadataStr.includes('127.0.0.1'));

  // Test 3: listByEntity
  console.log('\nTest 3: listByEntity retorna eventos de uma entidade');
  const entityEvents = await auditLog.listByEntity(EntityType.USER, testUserId);
  assert('retorna 1 evento', entityEvents.length === 1, `atual: ${entityEvents.length}`);
  assert('evento é USER_LOGIN', entityEvents[0]?.action === AuditAction.USER_LOGIN);

  // Test 4: listByUser
  console.log('\nTest 4: listByUser retorna eventos de um usuário');
  const userEvents = await auditLog.listByUser(testUserId);
  assert('retorna 1 evento', userEvents.length === 1);

  // Test 5: AuditLog service não tem update/delete
  console.log('\nTest 5: auditLog service não expõe update/delete');
  assert('auditLog.update é undefined', (auditLog as unknown as { update?: unknown }).update === undefined);
  assert('auditLog.delete é undefined', (auditLog as unknown as { delete?: unknown }).delete === undefined);
  assert('auditLog.deleteMany é undefined', (auditLog as unknown as { deleteMany?: unknown }).deleteMany === undefined);

  // Test 6: countByAction
  console.log('\nTest 6: countByAction conta eventos por ação');
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const loginCount = await auditLog.countByAction(AuditAction.USER_LOGIN, since);
  assert('1 login contado', loginCount === 1, `atual: ${loginCount}`);

  await prisma.auditLog.deleteMany({});
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
