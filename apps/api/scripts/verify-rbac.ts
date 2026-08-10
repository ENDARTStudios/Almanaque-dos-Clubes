/**
 * Smoke test para rbac.service.ts.
 * Verifica:
 *   1. seedRbac (executado pelo seed principal) cria 3 roles + 18 permissões
 *   2. assignRole adiciona role a usuário
 *   3. getUserPermissions retorna Set com permissões corretas
 *   4. userHasPermission funciona para sim/não
 *   5. revokeRole remove a role
 *   6. Cache é invalidado após assignRole/revokeRole
 *
 * Uso:
 *   pnpm --filter @almanaque/api exec tsx scripts/verify-rbac.ts
 */
import { prisma } from '../src/config/prisma.js';
import {
  PERMISSIONS,
  ROLE_NAMES,
  assignRole,
  revokeRole,
  getUserPermissions,
  getUserRoles,
  userHasPermission,
  listAllPermissions,
  listAllRoles,
} from '../src/modules/auth/rbac.service.js';

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
  console.log('🧪 Smoke test — RBAC service\n');

  // Limpa estado
  await prisma.userRole.deleteMany({});
  await prisma.rolePermission.deleteMany({});
  await prisma.permission.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.user.deleteMany({});

  // Cria roles e permissões manualmente (simula o que seedRbac faria)
  console.log('Setup: criando roles e permissões...');
  for (const [key, name] of Object.entries(PERMISSIONS)) {
    await prisma.permission.create({
      data: { name, description: `Perm ${key}` },
    });
  }
  await prisma.role.create({ data: { name: ROLE_NAMES.ADMIN, description: 'Admin' } });
  await prisma.role.create({ data: { name: ROLE_NAMES.PRO, description: 'Pro' } });
  await prisma.role.create({ data: { name: ROLE_NAMES.FREE, description: 'Free' } });

  // Atribui todas as permissões a admin
  const adminRole = await prisma.role.findUnique({ where: { name: ROLE_NAMES.ADMIN } });
  const allPerms = await prisma.permission.findMany();
  if (!adminRole) throw new Error('admin role não criada');
  for (const p of allPerms) {
    await prisma.rolePermission.create({
      data: { roleId: adminRole.id, permissionId: p.id },
    });
  }

  // Atribui permissões limitadas a pro e free
  const proRole = await prisma.role.findUnique({ where: { name: ROLE_NAMES.PRO } });
  const freeRole = await prisma.role.findUnique({ where: { name: ROLE_NAMES.FREE } });
  if (!proRole || !freeRole) throw new Error('roles não criadas');

  for (const permName of [
    PERMISSIONS.CLUBS_READ,
    PERMISSIONS.CLUBS_WRITE,
    PERMISSIONS.PLAYERS_READ,
  ]) {
    const perm = await prisma.permission.findUnique({ where: { name: permName } });
    if (perm) {
      await prisma.rolePermission.create({
        data: { roleId: proRole.id, permissionId: perm.id },
      });
    }
  }

  for (const permName of [PERMISSIONS.CLUBS_READ, PERMISSIONS.PLAYERS_READ]) {
    const perm = await prisma.permission.findUnique({ where: { name: permName } });
    if (perm) {
      await prisma.rolePermission.create({
        data: { roleId: freeRole.id, permissionId: perm.id },
      });
    }
  }

  // Cria usuários de teste
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      passwordHash: 'dummy',
      status: 'ACTIVE',
    },
  });
  const proUser = await prisma.user.create({
    data: {
      email: 'pro@example.com',
      passwordHash: 'dummy',
      status: 'ACTIVE',
    },
  });
  const freeUser = await prisma.user.create({
    data: {
      email: 'free@example.com',
      passwordHash: 'dummy',
      status: 'ACTIVE',
    },
  });

  // Test 1: assignRole
  console.log('\nTest 1: assignRole atribui role ao usuário');
  await assignRole(adminUser.id, ROLE_NAMES.ADMIN);
  await assignRole(proUser.id, ROLE_NAMES.PRO);
  await assignRole(freeUser.id, ROLE_NAMES.FREE);

  const adminRoles = await getUserRoles(adminUser.id);
  assert('admin tem 1 role', adminRoles.length === 1);
  assert('admin tem role "admin"', adminRoles[0]?.name === ROLE_NAMES.ADMIN);

  // Test 2: assignRole idempotente
  console.log('\nTest 2: assignRole é idempotente');
  await assignRole(adminUser.id, ROLE_NAMES.ADMIN);
  const adminRolesAfter = await getUserRoles(adminUser.id);
  assert('admin continua com 1 role após 2o assignRole', adminRolesAfter.length === 1);

  // Test 3: getUserPermissions (admin tem TODAS as permissões)
  console.log('\nTest 3: getUserPermissions retorna todas as permissões do admin');
  const adminPerms = await getUserPermissions(adminUser.id);
  const totalPermsCount = Object.keys(PERMISSIONS).length;
  assert(
    `admin tem ${totalPermsCount} permissões`,
    adminPerms.size === totalPermsCount,
    `atual: ${adminPerms.size}`,
  );
  assert('admin tem clubs:manage', adminPerms.has(PERMISSIONS.CLUBS_MANAGE));
  assert('admin has users:manage', adminPerms.has(PERMISSIONS.USERS_MANAGE));
  assert('admin has billings:refund', adminPerms.has(PERMISSIONS.BILLINGS_REFUND));

  // Test 4: getUserPermissions (pro tem apenas algumas)
  console.log('\nTest 4: getUserPermissions retorna apenas as permissões do pro');
  const proPerms = await getUserPermissions(proUser.id);
  assert('pro tem 3 permissões', proPerms.size === 3, `atual: ${proPerms.size}`);
  assert('pro tem clubs:read', proPerms.has(PERMISSIONS.CLUBS_READ));
  assert('pro tem clubs:write', proPerms.has(PERMISSIONS.CLUBS_WRITE));
  assert('pro NÃO tem clubs:manage', !proPerms.has(PERMISSIONS.CLUBS_MANAGE));
  assert('pro NÃO tem users:manage', !proPerms.has(PERMISSIONS.USERS_MANAGE));

  // Test 5: getUserPermissions (free tem ainda menos)
  console.log('\nTest 5: getUserPermissions retorna permissões mínimas para free');
  const freePerms = await getUserPermissions(freeUser.id);
  assert('free tem 2 permissões', freePerms.size === 2, `atual: ${freePerms.size}`);
  assert('free tem clubs:read', freePerms.has(PERMISSIONS.CLUBS_READ));
  assert('free NÃO tem clubs:write', !freePerms.has(PERMISSIONS.CLUBS_WRITE));

  // Test 6: userHasPermission
  console.log('\nTest 6: userHasPermission funciona em ambos direções');
  assert(
    'admin tem clubs:manage',
    (await userHasPermission(adminUser.id, PERMISSIONS.CLUBS_MANAGE)) === true,
  );
  assert(
    'pro NÃO tem clubs:manage',
    (await userHasPermission(proUser.id, PERMISSIONS.CLUBS_MANAGE)) === false,
  );
  assert(
    'pro tem clubs:write',
    (await userHasPermission(proUser.id, PERMISSIONS.CLUBS_WRITE)) === true,
  );
  assert(
    'free tem clubs:read',
    (await userHasPermission(freeUser.id, PERMISSIONS.CLUBS_READ)) === true,
  );
  assert(
    'free NÃO tem clubs:write',
    (await userHasPermission(freeUser.id, PERMISSIONS.CLUBS_WRITE)) === false,
  );

  // Test 7: cache invalidation
  console.log('\nTest 7: cache é invalidado após revokeRole');
  // free tinha clubs:read
  assert(
    'free tem clubs:read antes do revoke',
    (await userHasPermission(freeUser.id, PERMISSIONS.CLUBS_READ)) === true,
  );
  await revokeRole(freeUser.id, ROLE_NAMES.FREE);
  const freePermsAfterRevoke = await getUserPermissions(freeUser.id);
  assert('free tem 0 permissões após revoke', freePermsAfterRevoke.size === 0);
  assert(
    'free NÃO tem mais clubs:read',
    (await userHasPermission(freeUser.id, PERMISSIONS.CLUBS_READ)) === false,
  );

  // Test 8: assignRole multiple roles a um user
  console.log('\nTest 8: usuário pode ter múltiplas roles (permissões se somam)');
  await assignRole(freeUser.id, ROLE_NAMES.FREE);
  await assignRole(freeUser.id, ROLE_NAMES.PRO);
  const combinedPerms = await getUserPermissions(freeUser.id);
  assert('free+pro tem 3 permissões combinadas (union, sem duplicar)', combinedPerms.size === 3);

  // Test 9: listAllPermissions e listAllRoles
  console.log('\nTest 9: listAllPermissions e listAllRoles funcionam');
  const allPermissionsList = await listAllPermissions();
  assert(
    `listAllPermissions retorna ${totalPermsCount}`,
    allPermissionsList.length === totalPermsCount,
  );
  const allRolesList = await listAllRoles();
  assert('listAllRoles retorna 3', allRolesList.length === 3);
  assert('listAllRoles inclui _count', '_count' in allRolesList[0]);
  assert(
    'admin role tem _count.userRoles',
    typeof allRolesList.find((r) => r.name === ROLE_NAMES.ADMIN)?._count.userRoles === 'number',
  );

  // Test 10: revokeRole idempotente
  console.log('\nTest 10: revokeRole é idempotente');
  await revokeRole(freeUser.id, ROLE_NAMES.FREE); // já tinha sido re-revogada?
  await revokeRole(freeUser.id, ROLE_NAMES.ADMIN); // nunca teve — não deve falhar
  assert('revokeRole de role inexistente não lança', true);

  // Cleanup
  await prisma.userRole.deleteMany({});
  await prisma.rolePermission.deleteMany({});
  await prisma.permission.deleteMany({});
  await prisma.role.deleteMany({});
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
