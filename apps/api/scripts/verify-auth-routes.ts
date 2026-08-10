/**
 * Smoke test para Tarefa 3.2 — Rotas Register/Login/Logout.
 * Testa fluxo completo end-to-end via Fastify inject (sem subir servidor real).
 *
 * Cenários:
 *   1. POST /auth/register cria usuário + retorna 201 + seta cookies
 *   2. POST /auth/register com email duplicado retorna 409
 *   3. POST /auth/register com senha fraca retorna 422
 *   4. POST /auth/login com credenciais válidas retorna 200 + cookies
 *   5. POST /auth/login com senha errada retorna 401 "Credenciais inválidas"
 *   6. POST /auth/login com email inexistente retorna 401 (mesma mensagem — timing-safe)
 *   7. POST /auth/logout limpa cookies + revoga session
 *   8. POST /auth/refresh com cookie válido retorna novos tokens (rotação)
 *   9. POST /auth/refresh sem cookie retorna 401
 *   10. Senha NUNCA aparece em resposta ou log
 *   11. AuditLog registra eventos (register, login, logout, refresh)
 *
 * Uso:
 *   pnpm --filter @almanaque/api exec tsx scripts/verify-auth-routes.ts
 */
import { buildApp } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { auditLog, AuditAction } from '../src/modules/audit/audit-log.service.js';

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
  console.log('🧪 Smoke test — Auth routes (Tarefa 3.2)\n');

  // Limpa estado
  await prisma.auditLog.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.billing.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.userRole.deleteMany({});
  await prisma.user.deleteMany({});

  const app = await buildApp();

  // Helper para extrair cookies do Set-Cookie header
  function parseCookies(setCookieHeader: string | string[] | undefined): Record<string, string> {
    if (!setCookieHeader) return {};
    const headers = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    const cookies: Record<string, string> = {};
    for (const h of headers) {
      const match = h.match(/^([^=]+)=([^;]*)/);
      if (match) {
        cookies[match[1]] = match[2];
      }
    }
    return cookies;
  }

  // -----------------------------------------------------------------
  // Test 1: POST /auth/register — sucesso
  // -----------------------------------------------------------------
  console.log('Test 1: POST /auth/register com payload válido');
  const registerRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      email: 'test-user@example.com',
      password: 'StrongPass123',
      name: 'Test User',
    },
  });
  assert('status 201', registerRes.statusCode === 201, registerRes.statusCode);
  assert('tem data.user', registerRes.json().data?.user !== undefined);
  assert(
    'user.email = test-user@example.com',
    registerRes.json().data?.user?.email === 'test-user@example.com',
  );
  assert('user.id é UUID', typeof registerRes.json().data?.user?.id === 'string');
  assert(
    'user.roles = [free]',
    JSON.stringify(registerRes.json().data?.user?.roles) === JSON.stringify(['free']),
  );
  assert(
    'NÃO tem passwordHash na resposta',
    JSON.stringify(registerRes.json()).includes('passwordHash') === false,
  );
  assert(
    'NÃO tem password na resposta',
    JSON.stringify(registerRes.json()).includes('"password"') === false,
  );

  // Cookies
  const regCookies = parseCookies(registerRes.headers['set-cookie']);
  assert('cookie access_token setado', 'access_token' in regCookies);
  assert('cookie refresh_token setado', 'refresh_token' in regCookies);

  // Persistência no banco
  const dbUser = await prisma.user.findUnique({ where: { email: 'test-user@example.com' } });
  assert('user criado no banco', dbUser !== null);
  assert('passwordHash é argon2id', dbUser?.passwordHash.startsWith('$argon2id$'));
  assert('user.status = ACTIVE', dbUser?.status === 'ACTIVE');
  assert('user.name = "Test User"', dbUser?.name === 'Test User');

  // AuditLog registrou registro
  const auditRegister = await prisma.auditLog.findFirst({
    where: { action: AuditAction.USER_REGISTER, entityId: dbUser!.id },
  });
  assert('AuditLog registrou user.register', auditRegister !== null);

  // Subscription FREE criada
  const sub = await prisma.subscription.findUnique({ where: { userId: dbUser!.id } });
  assert('subscription FREE criada', sub?.plan === 'FREE');
  assert('subscription ACTIVE', sub?.status === 'ACTIVE');

  // -----------------------------------------------------------------
  // Test 2: POST /auth/register — email duplicado
  // -----------------------------------------------------------------
  console.log('\nTest 2: POST /auth/register com email duplicado');
  const dupRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email: 'test-user@example.com', password: 'AnotherPass123' },
  });
  assert('status 409', dupRes.statusCode === 409, dupRes.statusCode);
  assert(
    'error.code = EMAIL_ALREADY_REGISTERED',
    dupRes.json().error?.code === 'EMAIL_ALREADY_REGISTERED',
  );

  // -----------------------------------------------------------------
  // Test 3: POST /auth/register — senha fraca (validação)
  // -----------------------------------------------------------------
  console.log('\nTest 3: POST /auth/register com senha fraca');
  const weakRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email: 'weak@example.com', password: '123' },
  });
  assert('status 422', weakRes.statusCode === 422, weakRes.statusCode);
  assert('error.code = VALIDATION_ERROR', weakRes.json().error?.code === 'VALIDATION_ERROR');

  // Sem letra maiúscula
  const noUpper = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email: 'no-upper@example.com', password: 'lowercase1' },
  });
  assert('senha sem maiúscula → 422', noUpper.statusCode === 422);

  // Sem dígito
  const noDigit = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email: 'no-digit@example.com', password: 'NoDigitsHere' },
  });
  assert('senha sem dígito → 422', noDigit.statusCode === 422);

  // -----------------------------------------------------------------
  // Test 4: POST /auth/login — sucesso
  // -----------------------------------------------------------------
  console.log('\nTest 4: POST /auth/login com credenciais válidas');
  const loginRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: 'test-user@example.com', password: 'StrongPass123' },
  });
  assert('status 200', loginRes.statusCode === 200, loginRes.statusCode);
  assert('retorna user', loginRes.json().data?.user !== undefined);
  assert('user.email correto', loginRes.json().data?.user?.email === 'test-user@example.com');
  assert(
    'NÃO tem passwordHash na resposta',
    JSON.stringify(loginRes.json()).includes('passwordHash') === false,
  );

  const loginCookies = parseCookies(loginRes.headers['set-cookie']);
  assert('cookie access_token setado', 'access_token' in loginCookies);
  assert('cookie refresh_token setado', 'refresh_token' in loginCookies);

  // lastLoginAt atualizado
  const userAfterLogin = await prisma.user.findUnique({
    where: { email: 'test-user@example.com' },
  });
  assert('lastLoginAt preenchido após login', userAfterLogin?.lastLoginAt !== null);

  // AuditLog registrou login
  const auditLogin = await prisma.auditLog.findFirst({
    where: { action: AuditAction.USER_LOGIN, entityId: dbUser!.id },
  });
  assert('AuditLog registrou user.login', auditLogin !== null);

  // -----------------------------------------------------------------
  // Test 5: POST /auth/login — senha errada
  // -----------------------------------------------------------------
  console.log('\nTest 5: POST /auth/login com senha errada');
  const wrongPassRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: 'test-user@example.com', password: 'WrongPassword123' },
  });
  assert('status 401', wrongPassRes.statusCode === 401, wrongPassRes.statusCode);
  assert(
    'error.code = INVALID_CREDENTIALS',
    wrongPassRes.json().error?.code === 'INVALID_CREDENTIALS',
  );
  assert(
    'mensagem genérica "Credenciais inválidas"',
    wrongPassRes.json().error?.message === 'Credenciais inválidas',
  );
  assert(
    'NÃO revela "usuário não existe"',
    !wrongPassRes.json().error?.message?.includes('não existe'),
  );

  // -----------------------------------------------------------------
  // Test 6: POST /auth/login — email inexistente (timing-safe)
  // -----------------------------------------------------------------
  console.log('\nTest 6: POST /auth/login com email inexistente (mesma mensagem)');
  const noEmailRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: 'nonexistent@example.com', password: 'AnyPassword123' },
  });
  assert('status 401', noEmailRes.statusCode === 401, noEmailRes.statusCode);
  assert(
    'error.code = INVALID_CREDENTIALS (igual ao caso senha errada)',
    noEmailRes.json().error?.code === 'INVALID_CREDENTIALS',
  );
  assert(
    'mensagem idêntica à de senha errada',
    noEmailRes.json().error?.message === wrongPassRes.json().error?.message,
  );

  // -----------------------------------------------------------------
  // Test 7: POST /auth/logout — sucesso
  // -----------------------------------------------------------------
  console.log('\nTest 7: POST /auth/logout com cookie válido');
  const logoutRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/logout',
    cookies: {
      access_token: loginCookies['access_token'],
      refresh_token: loginCookies['refresh_token'],
    },
  });
  assert('status 200', logoutRes.statusCode === 200, logoutRes.statusCode);
  assert('mensagem de sucesso', logoutRes.json().data?.message !== undefined);

  // Cookies limpos (set-cookie com Max-Age=0 ou similar)
  const logoutSetCookie = logoutRes.headers['set-cookie'];
  if (Array.isArray(logoutSetCookie)) {
    const allCleared = logoutSetCookie.every(
      (c) => c.includes('Max-Age=0') || c.includes('expires=Thu, 01 Jan 1970'),
    );
    assert('cookies marcados para expiração', allCleared);
  } else if (typeof logoutSetCookie === 'string') {
    assert(
      'cookie marcado para expiração',
      logoutSetCookie.includes('Max-Age=0') || logoutSetCookie.includes('1970'),
    );
  }

  // Session revogada no banco
  const sessions = await prisma.session.findMany({
    where: { userId: dbUser!.id, revokedAt: { not: null } },
  });
  assert('session revogada no banco', sessions.length >= 1);

  // AuditLog registrou logout
  const auditLogout = await prisma.auditLog.findFirst({
    where: { action: AuditAction.USER_LOGOUT },
  });
  assert('AuditLog registrou user.logout', auditLogout !== null);

  // -----------------------------------------------------------------
  // Test 8: POST /auth/refresh — rotação de token
  // -----------------------------------------------------------------
  console.log('\nTest 8: POST /auth/refresh com cookie válido (rotação)');
  // Faz login novamente para ter cookie fresco
  const loginRes2 = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: 'test-user@example.com', password: 'StrongPass123' },
  });
  const loginCookies2 = parseCookies(loginRes2.headers['set-cookie']);
  const oldRefresh = loginCookies2['refresh_token'];

  // Conta sessions ativas antes do refresh
  const activeBefore = await prisma.session.count({
    where: { userId: dbUser!.id, revokedAt: null },
  });
  assert('1+ session ativa antes do refresh', activeBefore >= 1);

  // Refresh
  const refreshRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/refresh',
    cookies: { refresh_token: oldRefresh },
  });
  assert('status 200', refreshRes.statusCode === 200, refreshRes.statusCode);
  assert('retorna user', refreshRes.json().data?.user !== undefined);

  const refreshCookies = parseCookies(refreshRes.headers['set-cookie']);
  assert(
    'novos cookies setados',
    'access_token' in refreshCookies && 'refresh_token' in refreshCookies,
  );
  assert('refresh_token novo ≠ antigo', refreshCookies['refresh_token'] !== oldRefresh);

  // Session antiga foi revogada (rotação)
  // Tentar usar o refresh token antigo deve falhar
  const reuseRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/refresh',
    cookies: { refresh_token: oldRefresh },
  });
  assert(
    'refresh token antigo rejeitado após rotação',
    reuseRes.statusCode === 401,
    reuseRes.statusCode,
  );

  // -----------------------------------------------------------------
  // Test 9: POST /auth/refresh sem cookie
  // -----------------------------------------------------------------
  console.log('\nTest 9: POST /auth/refresh sem cookie retorna 401');
  const noCookieRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/refresh',
  });
  assert('status 401', noCookieRes.statusCode === 401, noCookieRes.statusCode);

  // -----------------------------------------------------------------
  // Test 10: Senha nunca aparece em resposta
  // -----------------------------------------------------------------
  console.log('\nTest 10: Senha nunca aparece em nenhuma resposta');
  const allResponses = [
    registerRes.json(),
    dupRes.json(),
    weakRes.json(),
    loginRes.json(),
    wrongPassRes.json(),
    noEmailRes.json(),
    logoutRes.json(),
    refreshRes.json(),
  ];
  for (let i = 0; i < allResponses.length; i++) {
    const jsonStr = JSON.stringify(allResponses[i]);
    assert(`resposta ${i} não contém "StrongPass123"`, !jsonStr.includes('StrongPass123'));
    assert(`resposta ${i} não contém "passwordHash"`, !jsonStr.includes('passwordHash'));
  }

  // -----------------------------------------------------------------
  // Test 11: AuditLog cobertura
  // -----------------------------------------------------------------
  console.log('\nTest 11: AuditLog cobriu eventos auth');
  const auditCounts = {
    register: await auditLog.countByAction(
      AuditAction.USER_REGISTER,
      new Date(Date.now() - 60 * 60 * 1000),
    ),
    login: await auditLog.countByAction(
      AuditAction.USER_LOGIN,
      new Date(Date.now() - 60 * 60 * 1000),
    ),
    logout: await auditLog.countByAction(
      AuditAction.USER_LOGOUT,
      new Date(Date.now() - 60 * 60 * 1000),
    ),
    refresh: await auditLog.countByAction(
      AuditAction.USER_REFRESH,
      new Date(Date.now() - 60 * 60 * 1000),
    ),
    login_failed: await auditLog.countByAction(
      AuditAction.USER_LOGIN_FAILED,
      new Date(Date.now() - 60 * 60 * 1000),
    ),
  };
  assert('≥1 user.register', auditCounts.register >= 1, auditCounts);
  assert('≥1 user.login', auditCounts.login >= 1, auditCounts);
  assert('≥1 user.logout', auditCounts.logout >= 1, auditCounts);
  assert('≥1 user.refresh', auditCounts.refresh >= 1, auditCounts);
  assert(
    '≥2 user.login_failed (senha errada + email inexistente)',
    auditCounts.login_failed >= 2,
    auditCounts,
  );

  // Nenhum audit log contém senha em texto
  const allLogs = await prisma.auditLog.findMany();
  const anyLeak = allLogs.some((l) => {
    const json = JSON.stringify({ changes: l.changes, metadata: l.metadata });
    return json.includes('StrongPass123') || json.includes('passwordHash');
  });
  assert('nenhum audit log contém senha em texto', !anyLeak);

  await app.close();

  // Cleanup
  await prisma.auditLog.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.billing.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.userRole.deleteMany({});
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
