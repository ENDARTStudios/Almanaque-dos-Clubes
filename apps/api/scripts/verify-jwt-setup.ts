/**
 * Smoke test para Tarefa 3.1 — JWT setup.
 * Verifica:
 *   1. Plugins @fastify/jwt e @fastify/cookie registrados no app
 *   2. app.jwt.sign e app.jwt.verify funcionais
 *   3. Access token carrega payload correto (sub, email, roles, permissions, type='access')
 *   4. Refresh token carrega payload correto (sub, sessionId, type='refresh')
 *   5. verifyAccessToken rejeita refresh tokens (cross-type rejection)
 *   6. verifyRefreshToken rejeita access tokens
 *   7. Token inválido retorna null (não throw)
 *   8. Nomes de cookie corretos (access_token / refresh_token em dev)
 *   9. Cookie options têm httpOnly, sameSite='strict', path='/'
 *
 * Uso:
 *   pnpm --filter @almanaque/api exec tsx scripts/verify-jwt-setup.ts
 */
import { buildApp } from '../src/app.js';
import {
  createJwtService,
  getAccessCookieName,
  getRefreshCookieName,
  getCookieOptions,
  ACCESS_TOKEN_MAX_AGE_SECONDS,
  REFRESH_TOKEN_MAX_AGE_SECONDS,
  type AuthUser,
} from '../src/modules/auth/jwt.service.js';
import { env } from '../src/config/env.js';

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
  console.log('🧪 Smoke test — JWT setup (Tarefa 3.1)\n');

  // Test 1: buildApp registra plugins
  console.log('Test 1: buildApp registra plugins JWT e cookie');
  const app = await buildApp();
  assert('app.jwt existe', typeof app.jwt === 'object' && app.jwt !== null);
  assert('app.jwt.sign é função', typeof app.jwt.sign === 'function');
  assert('app.jwt.verify é função', typeof app.jwt.verify === 'function');

  // Test 2: app.jwt.sign funciona
  console.log('\nTest 2: app.jwt.sign gera token válido');
  const testPayload = { sub: 'user-123', email: 'test@example.com', type: 'access' as const };
  const token = app.jwt.sign(testPayload);
  assert('token é string não vazia', typeof token === 'string' && token.length > 0);
  assert('token tem 3 partes separadas por .', token.split('.').length === 3);

  // Test 3: app.jwt.verify funciona
  console.log('\nTest 3: app.jwt.verify decodifica token correto');
  const decoded = app.jwt.verify(token) as { sub: string; email: string; type: string; iat: number; exp: number };
  assert('sub corresponde', decoded.sub === 'user-123');
  assert('email corresponde', decoded.email === 'test@example.com');
  assert('type corresponde', decoded.type === 'access');
  assert('iat (issued at) presente', typeof decoded.iat === 'number');
  assert('exp (expires) presente', typeof decoded.exp === 'number');

  // Test 4: JwtService.createJwtService
  console.log('\nTest 4: createJwtService cria serviço vinculado ao app');
  const jwt = createJwtService(app);
  assert('signTokens é função', typeof jwt.signTokens === 'function');
  assert('verifyAccessToken é função', typeof jwt.verifyAccessToken === 'function');
  assert('verifyRefreshToken é função', typeof jwt.verifyRefreshToken === 'function');

  // Test 5: signTokens gera par access + refresh
  console.log('\nTest 5: signTokens gera par access + refresh');
  const user: AuthUser = {
    id: 'user-456',
    email: 'pro@example.com',
    roles: ['pro'],
    permissions: ['clubs:read', 'clubs:write'],
  };
  const sessionId = 'session-789';
  const { accessToken, refreshToken } = jwt.signTokens(user, sessionId);
  assert('accessToken é string', typeof accessToken === 'string' && accessToken.length > 0);
  assert('refreshToken é string', typeof refreshToken === 'string' && refreshToken.length > 0);
  assert('access ≠ refresh', accessToken !== refreshToken);

  // Test 6: verifyAccessToken decodifica access token
  console.log('\nTest 6: verifyAccessToken decodifica access token');
  const accessPayload = jwt.verifyAccessToken(accessToken);
  assert('payload não é null', accessPayload !== null);
  assert('sub = user-456', accessPayload?.sub === 'user-456');
  assert('email = pro@example.com', accessPayload?.email === 'pro@example.com');
  assert('roles = [pro]', JSON.stringify(accessPayload?.roles) === JSON.stringify(['pro']));
  assert('permissions = [clubs:read, clubs:write]', accessPayload?.permissions.includes('clubs:read') === true);
  assert('type = access', accessPayload?.type === 'access');

  // Test 7: verifyRefreshToken decodifica refresh token
  console.log('\nTest 7: verifyRefreshToken decodifica refresh token');
  const refreshPayload = jwt.verifyRefreshToken(refreshToken);
  assert('payload não é null', refreshPayload !== null);
  assert('sub = user-456', refreshPayload?.sub === 'user-456');
  assert('sessionId = session-789', refreshPayload?.sessionId === 'session-789');
  assert('type = refresh', refreshPayload?.type === 'refresh');

  // Test 8: verifyAccessToken rejeita refresh token (cross-type rejection)
  console.log('\nTest 8: verifyAccessToken rejeita refresh token (defense in depth)');
  const crossCheck = jwt.verifyAccessToken(refreshToken);
  assert('retorna null (não decodifica refresh como access)', crossCheck === null);

  // Test 9: verifyRefreshToken rejeita access token
  console.log('\nTest 9: verifyRefreshToken rejeita access token');
  const crossCheck2 = jwt.verifyRefreshToken(accessToken);
  assert('retorna null (não decodifica access como refresh)', crossCheck2 === null);

  // Test 10: verifyAccessToken rejeita token inválido
  console.log('\nTest 10: verifyAccessToken rejeita token inválido');
  assert('null para "invalid-token"', jwt.verifyAccessToken('invalid-token') === null);
  assert('null para string vazia', jwt.verifyAccessToken('') === null);
  assert('null para token aleatório', jwt.verifyAccessToken('aaa.bbb.ccc') === null);

  // Test 11: verifyRefreshToken rejeita token inválido
  console.log('\nTest 11: verifyRefreshToken rejeita token inválido');
  assert('null para "invalid-token"', jwt.verifyRefreshToken('invalid-token') === null);

  // Test 12: getAccessCookieName e getRefreshCookieName
  console.log('\nTest 12: nomes de cookie corretos para dev vs prod');
  assert('dev access name = "access_token"', getAccessCookieName(false) === 'access_token');
  assert('dev refresh name = "refresh_token"', getRefreshCookieName(false) === 'refresh_token');
  assert('prod access name = "__Host-access_token"', getAccessCookieName(true) === '__Host-access_token');
  assert('prod refresh name = "__Host-refresh_token"', getRefreshCookieName(true) === '__Host-refresh_token');

  // Test 13: getCookieOptions retorna opções seguras
  console.log('\nTest 13: getCookieOptions retorna httpOnly + sameSite=strict');
  const devCookieOpts = getCookieOptions(false);
  assert('dev: httpOnly = true', devCookieOpts.httpOnly === true);
  assert('dev: secure = false', devCookieOpts.secure === false);
  assert('dev: sameSite = strict', devCookieOpts.sameSite === 'strict');
  assert('dev: path = /', devCookieOpts.path === '/');

  const prodCookieOpts = getCookieOptions(true, 900);
  assert('prod: httpOnly = true', prodCookieOpts.httpOnly === true);
  assert('prod: secure = true', prodCookieOpts.secure === true);
  assert('prod: sameSite = strict', prodCookieOpts.sameSite === 'strict');
  assert('prod: maxAge = 900', prodCookieOpts.maxAge === 900);

  // Test 14: constantes de duração
  console.log('\nTest 14: constantes de duração corretas');
  assert('ACCESS_TOKEN_MAX_AGE = 15min = 900s', ACCESS_TOKEN_MAX_AGE_SECONDS === 900);
  assert('REFRESH_TOKEN_MAX_AGE = 7d = 604800s', REFRESH_TOKEN_MAX_AGE_SECONDS === 604800);

  // Test 15: env.ts carregou JWT_SECRET/JWT_REFRESH_SECRET
  console.log('\nTest 15: env.ts carregou variáveis JWT');
  assert('env.jwtSecret definido', typeof env.jwtSecret === 'string' && env.jwtSecret.length >= 16);
  assert('env.jwtRefreshSecret definido', typeof env.jwtRefreshSecret === 'string' && env.jwtRefreshSecret.length >= 16);
  assert('env.jwtExpiresIn = 15m', env.jwtExpiresIn === '15m');
  assert('env.jwtRefreshExpiresIn = 7d', env.jwtRefreshExpiresIn === '7d');

  await app.close();

  console.log(`\n${pass}/${pass + fail} asserções passaram`);
  if (fail > 0) {
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error('❌ Erro:', err);
    process.exit(1);
  });
