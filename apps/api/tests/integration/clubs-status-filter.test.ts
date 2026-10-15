/**
 * T562 — `?status=` devolvia 500 para entrada de usuário.
 *
 * O DEFEITO, medido em produção:
 *   /clubs?status=ACTIVE ..... 200
 *   /clubs?status=active ..... 500 INTERNAL_ERROR   <- o valor que uma pessoa escreve
 *   /clubs?status=qualquer ... 500 INTERNAL_ERROR
 *
 * Causa: a rota repassava `status` cru para o Prisma (`status as never`, sem validação), e o
 * enum `ClubStatus` (ACTIVE|INACTIVE|DISSOLVED) fazia o POSTGRES estourar em vez de a API
 * recusar. A página `/clubs` repassa esse parâmetro da URL, então era alcançável digitando ou
 * por link compartilhado.
 *
 * Duas coisas erradas em uma:
 *   1. **500 para entrada de usuário.** Valor inválido em query string é 400. O 500 mente
 *      dizendo que o problema é do servidor, e joga no alarme de erro o que é digitação de URL.
 *   2. **Case sensitivity vazando para fora.** O enum é detalhe de implementação; `active` e
 *      `ACTIVE` são a mesma intenção.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let dbOk = true;
const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  if (!isPostgres) return;
  try {
    await prisma.club.count();
  } catch {
    dbOk = false;
    if (process.env.TEST_REQUIRE_DB === 'true')
      throw new Error(
        '[T562/TEST_REQUIRE_DB] banco ausente no CI — falha, não skip (D-2026-09-18)',
      );
  }
});

afterAll(async () => {
  await app?.close();
});

describe('T562 — `status` inválido é 400, e não 500', () => {
  it('valor fora do enum devolve 400 com a lista do que é aceito (era 500)', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await app.inject({ method: 'GET', url: '/api/v1/clubs?status=qualquer' });
    expect(res.statusCode, 'valor inválido em query string não pode ser erro de servidor').toBe(
      400,
    );
    const corpo = res.json() as { error?: { code?: string; message?: string } };
    expect(corpo.error?.code).toBe('VALIDATION_ERROR');
    // A mensagem ensina o que serve — 400 sem dizer o aceitável só empurra o erro para o usuário.
    expect(corpo.error?.message).toContain('ACTIVE');
  });

  it('minúsculo é a MESMA intenção: `active` vira `ACTIVE`, e não 400', async () => {
    if (!dbOk || !isPostgres) return;
    /* O caso que mais importa: `?status=active` era o 500 do mundo real, e é o valor que uma
       pessoa escreve naturalmente. Normalizar é o comportamento certo — recusar seria tecnicamente
       defensável e praticamente hostil. */
    const res = await app.inject({ method: 'GET', url: '/api/v1/clubs?status=active&limit=1' });
    expect(res.statusCode, 'o valor do mundo real não pode virar erro de servidor').not.toBe(500);
    expect(res.statusCode).toBe(200);
  });

  it('mistura de caixa também passa (`AcTiVe`)', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await app.inject({ method: 'GET', url: '/api/v1/clubs?status=AcTiVe&limit=1' });
    expect(res.statusCode).not.toBe(500);
    expect(res.statusCode).toBe(200);
  });

  it('os três valores do enum são aceitos', async () => {
    if (!dbOk || !isPostgres) return;
    for (const s of ['ACTIVE', 'INACTIVE', 'DISSOLVED']) {
      const res = await app.inject({ method: 'GET', url: `/api/v1/clubs?status=${s}&limit=1` });
      expect(res.statusCode, `status=${s} deveria ser aceito`).not.toBe(500);
      expect(res.statusCode).toBe(200);
    }
  });

  it('sem `status` a listagem continua normal', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await app.inject({ method: 'GET', url: '/api/v1/clubs?limit=1' });
    expect(res.statusCode).toBe(200);
    expect(res.statusCode).not.toBe(400);
  });

  it('status vazio não vira erro (string vazia é ausência, não inválido)', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await app.inject({ method: 'GET', url: '/api/v1/clubs?status=&limit=1' });
    expect(res.statusCode).not.toBe(400);
    expect(res.statusCode).not.toBe(500);
  });
});
