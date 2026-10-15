/**
 * T565 — o gate de operador nas ROTAS, ponta a ponta.
 *
 * O teste unitário cobre a decisão (`ehOperador`). Este cobre o que o Operador realmente pediu:
 * que a superfície interna RECUSE quem não é ele — inclusive quem TEM o papel `admin`.
 *
 * O caso central é o (c): um usuário com `roles: ['admin']` e e-mail que não é o do Operador
 * precisa receber 403. Antes deste gate ele ENTRAVA, e é exatamente esse o furo que o pedido
 * descreve: "a área do admin é restrita apenas o operador".
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let dbOk = true;
const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');

const OPERADOR = 'endart.studios@gmail.com';
const INTRUSO_ADMIN = 'admin-qualquer@exemplo.com';

/** Token com papel `admin`. O e-mail é o que decide se passa. */
function tokenDe(email: string, roles: string[]): string {
  return app.jwt.sign({
    sub: `user-${email}`,
    email,
    roles,
    permissions: [],
    type: 'access',
  });
}

/**
 * Cabeçalhos de autenticação. O COOKIE é o que autentica.
 *
 * O `authenticate` lê `access_token` do COOKIE httpOnly (e `__Host-access_token` em produção), e
 * não do header `Authorization`. A primeira versão deste teste mandava só o Bearer e recebia 401
 * em tudo — o `requireOperator` nem chegava a rodar, e as falhas pareciam defeito do gate. Manter
 * o header também é inofensivo e espelha o que os outros testes de integração do repo fazem.
 */
function auth(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}`, cookie: `access_token=${token}` };
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  if (!isPostgres) return;
  try {
    await prisma.user.count();
  } catch {
    dbOk = false;
    if (process.env.TEST_REQUIRE_DB === 'true')
      throw new Error(
        '[T565/TEST_REQUIRE_DB] banco ausente no CI — falha, não skip (D-2026-09-18)',
      );
  }
});

afterAll(async () => {
  await app?.close();
});

/**
 * As rotas internas que o gate protege. Uma de cada módulo, para pegar import esquecido.
 *
 * Os caminhos foram conferidos contra as rotas REAIS de cada módulo, e não escritos de memória: o
 * ETL vive sob `/admin/etl/*`, e não sob `/etl/*`. A primeira versão deste teste usava
 * `/api/v1/etl/status`, que NÃO EXISTE — o 404 resultante reprovava as asserções de status, e o
 * defeito era do teste. Vale registrar porque o sintoma (teste vermelho) apontava para o gate, e a
 * causa era um caminho inventado.
 */
const ROTAS = ['/api/v1/admin/users', '/api/v1/jobs/health', '/api/v1/admin/etl/status'];

describe('T565 — rotas internas exigem o OPERADOR, não só o papel admin', () => {
  it('(a) sem token é 401 — não há identidade para avaliar', async () => {
    if (!dbOk || !isPostgres) return;
    for (const url of ROTAS) {
      const res = await app.inject({ method: 'GET', url });
      expect(res.statusCode, `${url} sem token`).toBe(401);
    }
  });

  it('(b) usuário comum (sem papel admin) é 403', async () => {
    if (!dbOk || !isPostgres) return;
    const token = tokenDe('comum@exemplo.com', []);
    for (const url of ROTAS) {
      const res = await app.inject({
        method: 'GET',
        url,
        headers: auth(token),
      });
      expect(res.statusCode, `${url} como usuário comum`).toBe(403);
    }
  });

  it('(c) ADMIN QUE NÃO É O OPERADOR é 403 — o furo que o gate fecha', async () => {
    if (!dbOk || !isPostgres) return;
    /* Este é o teste que justifica o T565 inteiro. Com `roles: ['admin']` a rota passava pelo
       `requireRole('admin')` e o usuário entrava. Agora o e-mail é avaliado, e ele é recusado. */
    const token = tokenDe(INTRUSO_ADMIN, ['admin']);
    for (const url of ROTAS) {
      const res = await app.inject({
        method: 'GET',
        url,
        headers: auth(token),
      });
      expect(res.statusCode, `${url} como admin intruso`).toBe(403);
    }
  });

  it('(d) a recusa NÃO revela quem pode entrar', async () => {
    if (!dbOk || !isPostgres) return;
    const token = tokenDe(INTRUSO_ADMIN, ['admin']);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/users',
      headers: auth(token),
    });
    const corpo = res.body;
    // Entregar o e-mail do Operador a um atacante é dar o alvo exato a comprometer.
    expect(corpo).not.toContain(OPERADOR);
    expect(corpo.toLowerCase()).not.toContain('endart');
  });

  it('(e) o OPERADOR passa pelo gate de identidade', async () => {
    if (!dbOk || !isPostgres) return;
    const token = tokenDe(OPERADOR, ['admin']);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/users',
      headers: auth(token),
    });
    /* O gate de IDENTIDADE não pode ser o que barra o Operador. Se a rota responder 403, o
       problema é outro (falta de permissão na RLS, por exemplo) — mas nunca "não é o operador",
       porque ele é. Aceito 200 ou 500; 401/403 aqui significaria gate invertido. */
    expect([200, 500], `operador recebeu ${res.statusCode}: o gate está invertido?`).toContain(
      res.statusCode,
    );
  });

  it('(f) a identidade vem do TOKEN, não de um header forjável', async () => {
    if (!dbOk || !isPostgres) return;
    /* Tentar se passar pelo operador por header não pode funcionar. O e-mail sai do JWT
       verificado; um header solto não tem valor nenhum para o gate. */
    const token = tokenDe(INTRUSO_ADMIN, ['admin']);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/users',
      headers: { ...auth(token), 'x-operator-email': OPERADOR, 'x-user-email': OPERADOR },
    });
    expect(res.statusCode).toBe(403);
  });

  it('(i) T569 — a resposta de recusa continua sendo 403 limpo', async () => {
    if (!dbOk || !isPostgres) return;
    /* A auditoria é fire-and-forget de propósito: se o banco estiver fora, a recusa precisa
       acontecer mesmo assim. Um 500 no lugar do 403 já diria ao atacante que ele acertou um
       caminho interessante. */
    const token = tokenDe(INTRUSO_ADMIN, ['admin']);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/jobs/health',
      headers: auth(token),
    });
    expect(res.statusCode).toBe(403);
    expect(res.body).toContain('FORBIDDEN');
  });
});
