#!/usr/bin/env node
/**
 * Verificação da API contra o Postgres LOCAL.
 *
 * ── POR QUE ESTE SCRIPT EXISTE ────────────────────────────────────────────────────────────
 * O `.env` da raiz aponta para o Railway (`postgres.railway.internal`), que não resolve da
 * máquina de desenvolvimento. Sem override, `pnpm --filter api test` falha com 82 erros de
 * "Authentication failed" — e esses 82 erros escondem as falhas REAIS, porque o barulho de
 * conexão afoga o resultado. Foi exatamente esse ruído que me fez passar rodadas achando que a
 * suíte estava irremediavelmente quebrada.
 *
 * O `.env` NÃO é tocado: credenciais são do Operador. As variáveis são definidas só para o
 * processo do vitest, a partir do container de teste que o próprio repositório já sobe.
 *
 * ── O QUE ELE NÃO FAZ ────────────────────────────────────────────────────────────────────
 * Não sobe container, não roda migração, não faz seed. Se o Postgres de teste não estiver de
 * pé, ele DIZ isso e sai com erro — em vez de rodar a suíte contra um banco vazio e produzir
 * falhas que parecem de código.
 */
import { execSync } from 'node:child_process';

const CONTAINER = process.env.FICHA_PG_CONTAINER ?? 'almanaque-postgis-test';
const DB = process.env.FICHA_PG_DB ?? 'almanaque_test';
const USER = process.env.FICHA_PG_USER ?? 'almanaque';

function morrer(msg) {
  console.error(`\n  ${msg}\n`);
  process.exit(1);
}

let senha = '';
try {
  const env = execSync(
    `docker inspect ${CONTAINER} --format "{{range .Config.Env}}{{println .}}{{end}}"`,
    {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  senha =
    env
      .split(/\r?\n/)
      .find((l) => l.startsWith('POSTGRES_PASSWORD='))
      ?.slice('POSTGRES_PASSWORD='.length) ?? '';
} catch {
  morrer(
    `Container "${CONTAINER}" não encontrado.\n` +
      `  Suba o Postgres de teste antes: docker start ${CONTAINER}\n` +
      `  Ou aponte outro container: FICHA_PG_CONTAINER=<nome> pnpm run ficha:verify:api`,
  );
}

if (!senha) morrer(`Container "${CONTAINER}" existe mas não declara POSTGRES_PASSWORD.`);

// confirma que o banco responde ANTES de rodar a suíte: banco fora do ar produz 82 falhas de
// conexão que parecem falhas de código
try {
  execSync(`docker exec ${CONTAINER} pg_isready -U ${USER} -d ${DB}`, {
    stdio: ['ignore', 'ignore', 'ignore'],
  });
} catch {
  morrer(
    `O Postgres em "${CONTAINER}" não está pronto (pg_isready falhou). Aguarde o healthcheck.`,
  );
}

const ambiente = {
  ...process.env,
  DATABASE_URL: `postgresql://${USER}:${senha}@localhost:54330/${DB}?schema=public`,
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
  REDIS_HOST: process.env.REDIS_HOST ?? 'localhost',
  REDIS_PORT: process.env.REDIS_PORT ?? '6379',
};

console.log('\n  API contra o Postgres local');
console.log(`    container ... ${CONTAINER}`);
console.log(`    banco ....... ${DB}`);
console.log('    .env da raiz NÃO foi tocado\n');

try {
  execSync('pnpm --filter api exec vitest run', {
    stdio: 'inherit',
    env: ambiente,
    cwd: process.cwd(),
  });
} catch {
  // o vitest já imprimiu o resultado; repassamos o código de saída sem inventar mensagem
  process.exit(1);
}
