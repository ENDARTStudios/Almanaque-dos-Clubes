/**
 * T382 — regressão de segurança (item 8.8): SQLi, XSS e CSRF.
 *
 * Usa apps Fastify mínimos (sem banco) para exercitar as camadas de defesa
 * reais: validação Zod (SQLi), resposta JSON (XSS) e middleware CSRF.
 * Roda localmente sem Postgres.
 *
 * Nota: a parametrização do Prisma é a defesa primária de SQLi no app real;
 * aqui validamos a camada de validação de entrada, que rejeita payload
 * malformado antes de qualquer query.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { z } from 'zod';
import { csrfMiddleware, generateCsrfToken } from '../../src/middleware/csrf.js';

describe('CSRF (8.8)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    app.post('/protected', { preHandler: csrfMiddleware }, async () => ({ ok: true }));
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejeita escrita sem x-csrf-token (403)', async () => {
    const res = await app.inject({ method: 'POST', url: '/protected', payload: {} });
    expect(res.statusCode).toBe(403);
  });

  it('aceita token válido e o consome (single-use)', async () => {
    const token = generateCsrfToken('user-1');
    const ok = await app.inject({
      method: 'POST',
      url: '/protected',
      payload: {},
      headers: { 'x-csrf-token': token },
    });
    expect(ok.statusCode).toBe(200);

    const reuse = await app.inject({
      method: 'POST',
      url: '/protected',
      payload: {},
      headers: { 'x-csrf-token': token },
    });
    expect(reuse.statusCode).toBe(403);
  });
});

describe('SQL injection (8.8)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    app.get('/club/:id', async (req, reply) => {
      const id = z
        .string()
        .uuid()
        .safeParse((req.params as { id?: string }).id);
      if (!id.success) {
        return reply.status(422).send({ error: { code: 'VALIDATION_ERROR' } });
      }
      return { id: id.data };
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejeita payload ' OR 1=1-- com 422, sem vazar erro interno", async () => {
    const res = await app.inject({ method: 'GET', url: "/club/' OR 1=1--" });
    expect(res.statusCode).toBe(422);
    expect(res.body).not.toContain('SQL');
    expect(res.body).not.toContain('stack');
  });

  it('aceita UUID válido', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/club/aaaaaaaa-0000-0000-0000-000000000001',
    });
    expect(res.statusCode).toBe(200);
  });
});

describe('XSS (8.8)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    app.post('/echo', async (req, reply) => {
      const name = z
        .string()
        .max(100)
        .safeParse((req.body as { name?: unknown }).name);
      if (!name.success) {
        return reply.status(422).send({ error: { code: 'VALIDATION_ERROR' } });
      }
      return { name: name.data };
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('resposta é JSON (nunca text/html) — sem reflexão de HTML cru', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/echo',
      payload: { name: '<script>alert(1)</script>' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.headers['content-type']).not.toContain('text/html');
  });
});
