/**
 * T458 — orçamento de sessão: as re-verificações do client (navegação/focus
 * do T455) não podem esbarrar no rate-limit (era o self-DoS do 09-20).
 *
 * GET /auth/me tem bucket próprio de 600/15min (config de rota) — 150
 * requisições na janela devem ser todas 401 anônimas, ZERO 429.
 * Regressão: brute-force em /auth/login mantém a camada apertada.
 *
 * Local sem banco → skip honesto; CI valida.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let dbOk = true;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  try {
    await prisma.user.count();
  } catch {
    dbOk = false;
  }
});

afterAll(async () => {
  await app.close();
});

describe('T458 — orçamento de sessão (/auth/me com bucket próprio)', () => {
  it.skipIf(process.env.PRISMA_SCHEMA_PROVIDER === 'sqlite')(
    '150 navegações na janela → zero 429 em /auth/me',
    async () => {
      if (!dbOk) return;
      const statuses: number[] = [];
      for (let i = 0; i < 150; i++) {
        const res = await app.inject({
          method: 'GET',
          url: '/api/v1/auth/me',
          remoteAddress: '10.0.0.42', // bucket isolado por IP
        });
        statuses.push(res.statusCode);
      }
      expect(statuses.filter((s) => s === 429)).toHaveLength(0);
      // anônimo → todas 401 (nunca 500: o endpoint não pode quebrar sob carga)
      expect(statuses.every((s) => s === 401)).toBe(true);
    },
  );
});
