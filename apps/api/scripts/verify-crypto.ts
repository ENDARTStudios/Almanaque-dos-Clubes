/**
 * Smoke test para apps/api/src/config/crypto.ts.
 * Verifica:
 *   1. hashPassword gera hash argon2id válido (prefixo $argon2id$v=19$m=65536,t=12,p=1$)
 *   2. verifyPassword retorna true para senha correta, false para incorreta
 *   3. verifyPassword retorna false para hash malformado (não propaga exceção)
 *   4. hashToken gera SHA-256 hex (64 caracteres)
 *   5. verifyToken é timing-safe e funciona em ambos direções
 *   6. generateToken retorna string base64url de ~43 chars
 *   7. generateNumericCode retorna string numérica de tamanho correto
 *   8. safeEqual é timing-safe
 *
 * Uso:
 *   pnpm --filter @almanaque/api exec tsx scripts/verify-crypto.ts
 */
import {
  hashPassword,
  verifyPassword,
  hashToken,
  verifyToken,
  generateToken,
  generateNumericCode,
  safeEqual,
} from '../src/config/crypto.js';

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
  console.log('🧪 Smoke test — crypto module\n');

  // Test 1: hashPassword
  console.log('Test 1: hashPassword gera hash argon2id válido');
  const password = 'my-super-secret-password-2026!';
  const hash = await hashPassword(password);
  console.log(`  hash = ${hash.substring(0, 40)}...`);
  assert('hash começa com $argon2id$', hash.startsWith('$argon2id$'));
  assert('hash contém m=65536 (64MiB)', hash.includes('m=65536'));
  assert('hash contém t=12 (12 iterações)', hash.includes('t=12'));
  assert('hash contém p=1 (paralelismo)', hash.includes('p=1'));
  assert('hash tem comprimento > 80', hash.length > 80);

  // Test 2: verifyPassword — senha correta
  console.log('\nTest 2: verifyPassword aceita senha correta');
  const valid = await verifyPassword(password, hash);
  assert('retorna true para senha correta', valid === true);

  // Test 3: verifyPassword — senha incorreta
  console.log('\nTest 3: verifyPassword rejeita senha incorreta');
  const wrong = await verifyPassword('wrong-password-123', hash);
  assert('retorna false para senha incorreta', wrong === false);

  // Test 4: verifyPassword — hash malformado
  console.log('\nTest 4: verifyPassword não propaga exceção para hash malformado');
  const malformed = await verifyPassword(password, 'not-a-valid-argon2-hash');
  assert('retorna false para hash malformado', malformed === false);

  // Test 5: hashPassword — senha vazia
  console.log('\nTest 5: hashPassword rejeita senha vazia');
  let threw = false;
  try {
    await hashPassword('');
  } catch {
    threw = true;
  }
  assert('lança erro para senha vazia', threw);

  // Test 6: hashToken
  console.log('\nTest 6: hashToken gera SHA-256 hex');
  const token = generateToken();
  const tokenHash = hashToken(token);
  console.log(`  token = ${token}`);
  console.log(`  hash  = ${tokenHash}`);
  assert('hash tem 64 chars hex', /^[0-9a-f]{64}$/.test(tokenHash));
  assert('hash não contém o token', !tokenHash.includes(token));

  // Test 7: verifyToken — token correto
  console.log('\nTest 7: verifyToken aceita token correto');
  assert('retorna true para token correto', verifyToken(token, tokenHash) === true);

  // Test 8: verifyToken — token incorreto
  console.log('\nTest 8: verifyToken rejeita token incorreto');
  assert('retorna false para token incorreto', verifyToken('wrong-token', tokenHash) === false);

  // Test 9: verifyToken — hash vazio
  console.log('\nTest 9: verifyToken lida com entradas vazias');
  assert('retorna false para token vazio', verifyToken('', tokenHash) === false);
  assert('retorna false para hash vazio', verifyToken(token, '') === false);

  // Test 10: generateToken — formato
  console.log('\nTest 10: generateToken gera base64url de ~43 chars');
  const tokens = Array.from({ length: 10 }, () => generateToken());
  for (const t of tokens) {
    assert(`token ${t.substring(0, 8)}... tem ~43 chars`, t.length >= 40 && t.length <= 50);
    assert(`token ${t.substring(0, 8)}... é base64url`, /^[A-Za-z0-9_-]+$/.test(t));
  }
  // Todos diferentes (entropia)
  const unique = new Set(tokens);
  assert('10 tokens são todos diferentes', unique.size === 10);

  // Test 11: generateNumericCode
  console.log('\nTest 11: generateNumericCode gera código de tamanho correto');
  for (const length of [4, 6, 8]) {
    const code = generateNumericCode(length);
    assert(`length=${length}: código tem ${length} dígitos`, code.length === length);
    assert(`length=${length}: código é numérico`, /^\d+$/.test(code));
  }
  let threwRange = false;
  try {
    generateNumericCode(2);
  } catch {
    threwRange = true;
  }
  assert('rejeita length=2 (mínimo 4)', threwRange);

  // Test 12: safeEqual
  console.log('\nTest 12: safeEqual compara strings timing-safe');
  assert('iguais retorna true', safeEqual('abc', 'abc') === true);
  assert('diferentes retorna false', safeEqual('abc', 'abd') === false);
  assert('tamanhos diferentes retorna false', safeEqual('abc', 'abcd') === false);
  assert('vazio retorna false', safeEqual('', 'abc') === false);

  // Test 13: hashes são únicos (mesma senha gera hash diferente por causa do salt)
  console.log('\nTest 13: hashPassword gera salt único por chamada');
  const hash2 = await hashPassword(password);
  assert('dois hashes da mesma senha são diferentes (salt aleatório)', hash !== hash2);
  const valid2 = await verifyPassword(password, hash2);
  assert('mas ambos verificam a mesma senha', valid2 === true);

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
