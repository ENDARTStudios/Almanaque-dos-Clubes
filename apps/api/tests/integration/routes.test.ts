import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});
afterAll(async () => {
  await app.close();
});

describe('GET /api/v1/health', () => {
  it('retorna 200 com status ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
    expect(body).toHaveProperty('timestamp');
  });
});

describe('GET /api/v1/clubs', () => {
  it('retorna lista paginada', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/clubs' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('total');
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe('Auth endpoints', () => {
  it('POST /api/v1/auth/register rejeita payload vazio com 422', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/register', payload: {} });
    expect(res.statusCode).toBe(422);
  });

  it('POST /api/v1/auth/login rejeita payload vazio com 422', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: {} });
    expect(res.statusCode).toBe(422);
  });

  it('POST /api/v1/auth/login retorna 401 para credenciais inválidas', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'nonexistent@test.com', password: 'wrongpass' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('404 handling', () => {
  it('retorna JSON padronizado para rota inexistente', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/nonexistent' });
    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('error');
  });
});

describe('GET /api/v1/clubs/:id/geo (T466)', () => {
  it('retorna 404 para clube inexistente', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/clubs/00000000-0000-0000-0000-000000000000/geo',
    });
    expect(res.statusCode).toBe(404);
  });
});
