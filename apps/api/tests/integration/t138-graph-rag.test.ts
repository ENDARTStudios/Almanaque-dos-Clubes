/**
 * T138 — cobertura dos módulos graph (35%) e rag (33%).
 * graph: GET /graph, GET /graph/:type/:id, POST /graph (CLUBS_MANAGE) — aresta
 * real criada e limpa no afterAll (tabela do KG é compartilhada em produção;
 * aqui é o DB de teste local/CI).
 * rag: POST /ai/ask ecoa a pergunta (RAG pendente, honesto) e 422 sem pergunta.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import { generateCsrfToken } from '../../src/middleware/csrf.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let dbOk = true;
let clubA = '';
let clubB = '';
let edgeId = '';
const suffix = Date.now();

function adminToken(): Record<string, string> {
  const t = app.jwt.sign({
    sub: `t138-graph-${suffix}`,
    email: `t138-graph-${suffix}@test.local`,
    roles: [],
    permissions: ['clubs:manage'],
    type: 'access',
  });
  return {
    Authorization: `Bearer ${t}`,
    cookie: `access_token=${t}`,
    'x-csrf-token': generateCsrfToken('t138'),
  };
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  try {
    await prisma.user.count();
  } catch {
    dbOk = false;
    if (process.env.TEST_REQUIRE_DB === 'true')
      throw new Error('[R1/TEST_REQUIRE_DB] banco ausente no CI — falha, não skip');
    return;
  }
  const a = await prisma.club.create({
    data: { name: `T138 Graph A ${suffix}`, importedFrom: 't138-test' },
  });
  const b = await prisma.club.create({
    data: { name: `T138 Graph B ${suffix}`, importedFrom: 't138-test' },
  });
  clubA = a.id;
  clubB = b.id;
});

afterAll(async () => {
  if (dbOk) {
    if (edgeId) await prisma.knowledgeGraph.deleteMany({ where: { id: edgeId } });
    if (clubA) await prisma.club.deleteMany({ where: { id: { in: [clubA, clubB] } } });
  }
  if (app) await app.close();
});

describe('POST/GET /graph (T138)', () => {
  it('POST cria aresta RIVAL → 201; sem permissão → 403; payload inválido → 422', async () => {
    if (!dbOk) return;
    const noPerm = app.jwt.sign({
      sub: `t138-graph-plain-${suffix}`,
      email: `t138-graph-plain-${suffix}@test.local`,
      roles: [],
      permissions: [],
      type: 'access',
    });
    const denied = await app.inject({
      method: 'POST',
      url: '/api/v1/graph',
      headers: {
        Authorization: `Bearer ${noPerm}`,
        cookie: `access_token=${noPerm}`,
        'x-csrf-token': generateCsrfToken('t138'),
      },
      payload: {
        sourceId: clubA,
        sourceType: 'Club',
        targetId: clubB,
        targetType: 'Club',
        relation: 'RIVAL',
      },
    });
    expect(denied.statusCode).toBe(403);

    const invalid = await app.inject({
      method: 'POST',
      url: '/api/v1/graph',
      headers: adminToken(),
      payload: {
        sourceId: clubA,
        sourceType: 'Club',
        targetId: clubB,
        targetType: 'Club',
        relation: 'NEM_ISSO',
      },
    });
    expect(invalid.statusCode).toBe(422);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/graph',
      headers: adminToken(),
      payload: {
        sourceId: clubA,
        sourceType: 'Club',
        targetId: clubB,
        targetType: 'Club',
        relation: 'RIVAL',
        metadata: { origin: 't138-test' },
      },
    });
    expect(res.statusCode).toBe(201);
    edgeId = res.json().data.id;
  });

  it('GET /graph/:type/:id traz a aresta nos dois sentidos; GET /graph lista', async () => {
    if (!dbOk || !edgeId) return;
    const fromA = await app.inject({ method: 'GET', url: `/api/v1/graph/Club/${clubA}` });
    expect(fromA.statusCode).toBe(200);
    expect(fromA.json().data.some((e: { id: string }) => e.id === edgeId)).toBe(true);

    const fromB = await app.inject({ method: 'GET', url: `/api/v1/graph/Club/${clubB}` });
    expect(fromB.json().data.some((e: { id: string }) => e.id === edgeId)).toBe(true);

    const all = await app.inject({ method: 'GET', url: '/api/v1/graph' });
    expect(all.statusCode).toBe(200);
    expect(Array.isArray(all.json().data)).toBe(true);
  });
});

describe('POST /ai/ask (T138 — RAG honesto enquanto Ollama não existe)', () => {
  it('sem pergunta → 422; com pergunta → eco + citations vazio + modelo declarado', async () => {
    const missing = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/ask',
      headers: { 'x-csrf-token': generateCsrfToken('t138') },
      payload: {},
    });
    expect(missing.statusCode).toBe(422);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/ask',
      headers: { 'x-csrf-token': generateCsrfToken('t138') },
      payload: { question: 'Quantos títulos o Corinthians tem?' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json().data;
    expect(body.answer).toContain('Quantos títulos o Corinthians tem?');
    expect(body.citations).toEqual([]);
    expect(body.model).toBeTruthy();
  });
});
