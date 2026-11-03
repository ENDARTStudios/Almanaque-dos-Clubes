/**
 * ESTÁDIOS — cobertura do módulo `stadiums`, que nasceu sem teste.
 *
 * ── POR QUE ESTE TESTE EXISTE ──────────────────────────────────────────────────────────────
 * O módulo foi escrito e entregue com typecheck e build verdes — e nada mais. Como ele fala com o
 * Prisma, o typecheck só confirma que as chamadas COMPILAM, não que elas retornam o que a tela
 * espera. Três coisas só um banco de verdade confirma:
 *
 *   1. `location` é PostGIS (`Unsupported`) e NÃO serializa em JSON. Se ele vazasse no `select`,
 *      a rota estouraria na resposta — e nenhum teste de tipo pegaria isso.
 *   2. `capacity: null` tem de continuar `null` na resposta. Se virasse 0, a tela afirmaria
 *      "estádio de 0 lugares" em vez de declarar a lacuna.
 *   3. o `orderBy` de capacidade decrescente com NULL: o maior estádio vem primeiro e o sem
 *      capacidade NÃO encabeça a lista (no Postgres o NULL sobe no DESC).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';

let app: FastifyInstance;
let dbOk = true;
const suffix = Date.now();
const criados: string[] = [];

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  try {
    await prisma.stadium.count();
  } catch {
    dbOk = false;
    if (process.env.TEST_REQUIRE_DB === 'true')
      throw new Error('[R1/TEST_REQUIRE_DB] banco ausente no CI — falha, não skip');
  }
});

afterAll(async () => {
  if (dbOk && criados.length) await prisma.stadium.deleteMany({ where: { id: { in: criados } } });
  if (app) await app.close();
});

async function criar(dados: {
  name: string;
  capacity?: number | null;
  city?: string;
  country?: string;
  surface?: string;
}) {
  const s = await prisma.stadium.create({
    data: {
      name: `${dados.name} ${suffix}`,
      capacity: dados.capacity ?? null,
      city: dados.city ?? 'Cidade Teste',
      country: dados.country ?? 'BR',
      surface: dados.surface ?? 'grass',
      importedFrom: 'test',
    },
  });
  criados.push(s.id);
  return s;
}

describe('GET /stadiums', () => {
  it('lista com paginação e NÃO vaza a coluna PostGIS', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/stadiums?limit=5' });

    expect(res.statusCode).toBe(200);
    const corpo = res.json() as {
      data: Array<Record<string, unknown>>;
      total: number;
      limit: number;
    };

    expect(Array.isArray(corpo.data)).toBe(true);
    expect(corpo.limit).toBe(5);
    expect(typeof corpo.total).toBe('number');

    for (const linha of corpo.data) {
      // `location` é Unsupported(geometry) — se aparecesse, a serialização teria estourado antes
      expect(linha).not.toHaveProperty('location');
      expect(linha).toHaveProperty('id');
      expect(linha).toHaveProperty('name');
      expect(linha).toHaveProperty('clubName');
    }
  });

  it('ordena por capacidade decrescente e NÃO põe o sem-capacidade na frente', async () => {
    await criar({ name: 'Grande Teste', capacity: 90000 });
    await criar({ name: 'Pequeno Teste', capacity: 1200 });
    await criar({ name: 'Sem Capacidade Teste', capacity: null });

    const res = await app.inject({ method: 'GET', url: '/api/v1/stadiums?limit=100' });
    const corpo = res.json() as { data: Array<{ name: string; capacity: number | null }> };

    const comCapacidade = corpo.data.filter((s) => s.capacity !== null);
    // já vem ordenado: confere que a sequência não decresce
    for (let i = 1; i < comCapacidade.length; i++) {
      expect(comCapacidade[i - 1].capacity!).toBeGreaterThanOrEqual(comCapacidade[i].capacity!);
    }

    // o sem-capacidade aparece DEPOIS de todos os que têm capacidade
    const idxSem = corpo.data.findIndex((s) => s.name === `Sem Capacidade Teste ${suffix}`);
    const idxUltimoCom = corpo.data.map((s) => s.capacity !== null).lastIndexOf(true);
    expect(idxSem === -1 || idxSem > idxUltimoCom).toBe(true);
  });

  it('capacity null continua null na resposta — nunca 0', async () => {
    const criado = await criar({ name: 'Nulo Explícito', capacity: null });
    const res = await app.inject({ method: 'GET', url: `/api/v1/stadiums/${criado.id}` });

    expect(res.statusCode).toBe(200);
    const { data } = res.json() as { data: { capacity: number | null } };
    expect(data.capacity).toBeNull();
    expect(data.capacity).not.toBe(0);
  });

  it('busca por nome filtra', async () => {
    await criar({ name: 'Arena Buscável', capacity: 5000 });
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/stadiums?search=${encodeURIComponent(`Arena Buscável ${suffix}`)}`,
    });
    const corpo = res.json() as { data: Array<{ name: string }> };

    expect(corpo.data.length).toBeGreaterThanOrEqual(1);
    for (const s of corpo.data) expect(s.name).toContain('Arena Buscável');
  });

  it('grampeia o limite: limit=9999 vira 100', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/stadiums?limit=9999' });
    expect((res.json() as { limit: number }).limit).toBe(100);
  });
});

describe('GET /stadiums/:id', () => {
  it('devolve o estádio criado', async () => {
    const criado = await criar({ name: 'Estádio Detalhe', capacity: 43210 });
    const res = await app.inject({ method: 'GET', url: `/api/v1/stadiums/${criado.id}` });

    expect(res.statusCode).toBe(200);
    const { data } = res.json() as { data: { id: string; name: string; capacity: number } };
    expect(data.id).toBe(criado.id);
    expect(data.capacity).toBe(43210);
  });

  it('404 para id inexistente — e não 500', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/stadiums/00000000-0000-4000-8000-000000000000',
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /stadiums/facets', () => {
  it('devolve países com contagem, sem código vazio', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/stadiums/facets' });

    expect(res.statusCode).toBe(200);
    const { data } = res.json() as { data: { countries: Array<{ code: string; count: number }> } };

    expect(Array.isArray(data.countries)).toBe(true);
    for (const c of data.countries) {
      expect(c.code).toBeTruthy();
      expect(c.count).toBeGreaterThan(0);
    }
  });
});
