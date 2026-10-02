/**
 * WS-C-7 — Integração (Postgres real): GET /clubs/compare?a=&b=.
 * Fixtures isoladas ('WSC7'); limpa antes/depois. Prova assimetria de títulos,
 * head-to-head só com aresta explícita, 400 a==b e 404 inexistente. Zero escrita
 * fora das fixtures.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let dbOk = true;
let idA = '';
let idB = '';
let idC = '';

async function cleanup(): Promise<void> {
  const clubs = await prisma.club.findMany({
    where: { name: { startsWith: 'WSC7 ' } },
    select: { id: true },
  });
  const ids = clubs.map((c) => c.id);
  const comps = await prisma.competition.findMany({
    where: { name: { startsWith: 'WSC7 Cup' } },
    select: { id: true },
  });
  await prisma.knowledgeGraph.deleteMany({
    where: {
      OR: [
        { sourceId: { in: ids } },
        { targetId: { in: ids } },
        ...comps.flatMap((c) => [{ sourceId: c.id }, { targetId: c.id }]),
      ],
    },
  });
  await prisma.club.deleteMany({ where: { id: { in: ids } } });
  await prisma.competition.deleteMany({ where: { id: { in: comps.map((c) => c.id) } } });
}

beforeAll(async () => {
  await cleanup();
  app = await buildApp();
  await app.ready();
  try {
    await prisma.club.count();
  } catch {
    dbOk = false;
    if (process.env.TEST_REQUIRE_DB === 'true')
      throw new Error('[R1/TEST_REQUIRE_DB] banco ausente no CI — falha, não skip (D-2026-09-18)');
    return;
  }
  const suffix = Date.now();
  const comp = await prisma.competition.create({
    data: { name: `WSC7 Cup ${suffix}`, qid: null, country: 'ZZ', type: 'CUP' },
    select: { id: true },
  });
  const a = await prisma.club.create({
    data: { name: 'WSC7 Alfa', country: 'ZZ', qid: null, city: 'Cidade', foundedYear: 1910 },
  });
  const b = await prisma.club.create({
    data: { name: 'WSC7 Beta', country: 'ZZ', qid: null, city: 'Cidade' },
  });
  const c = await prisma.club.create({
    data: { name: 'WSC7 Gama', country: 'ZZ', qid: null, city: 'Outra' },
  });
  idA = a.id;
  idB = b.id;
  idC = c.id;
  const provenance = { dataSource: 'wikidata', sourceUrl: 'https://www.wikidata.org/wiki/WSC7' };
  await prisma.knowledgeGraph.createMany({
    data: [
      // Alfa: 3 títulos (2 recentes, 1 antigo)
      {
        sourceId: a.id,
        sourceType: 'Club',
        targetId: comp.id,
        targetType: 'Competition',
        relation: 'WON',
        metadata: { year: 2025, hierarchy: 'nacional', ...provenance },
      },
      {
        sourceId: a.id,
        sourceType: 'Club',
        targetId: comp.id,
        targetType: 'Competition',
        relation: 'WON',
        metadata: { year: 2024, hierarchy: 'continental', ...provenance },
      },
      {
        sourceId: a.id,
        sourceType: 'Club',
        targetId: comp.id,
        targetType: 'Competition',
        relation: 'WON',
        metadata: { year: 1995, hierarchy: 'mundial', ...provenance },
      },
      // Beta: 1 título recente
      {
        sourceId: b.id,
        sourceType: 'Club',
        targetId: comp.id,
        targetType: 'Competition',
        relation: 'WON',
        metadata: { year: 2026, hierarchy: 'estadual', ...provenance },
      },
      // rivalidade EXPLÍCITA A ↔ C (não A ↔ B)
      {
        sourceId: a.id,
        sourceType: 'Club',
        targetId: c.id,
        targetType: 'Club',
        relation: 'RIVAL',
        metadata: { sourceUrl: 'https://www.wikidata.org/wiki/RIVAL' },
      },
    ],
  });
});

afterAll(async () => {
  if (dbOk) {
    await cleanup();
  }
  await app.close();
});

describe('WS-C-7 GET /clubs/compare', () => {
  it(
    'comparação assimétrica: títulos por hierarquia, recentes e h2h explícito',
    { timeout: 20_000 },
    async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/clubs/compare?a=${idA}&b=${idB}`,
      });
      expect(res.statusCode).toBe(200);
      const d = JSON.parse(res.body).data;
      expect(d.clubA.id).toBe(idA);
      expect(d.clubB.id).toBe(idB);
      expect(d.clubA.foundedYear).toBe(1910);
      // assimetria
      expect(d.titles.clubA.total).toBe(3);
      expect(d.titles.clubB.total).toBe(1);
      expect(d.titles.clubA.mundial).toBe(1);
      expect(d.titles.clubB.estadual).toBe(1);
      // recentes (janela 5 anos a partir de now UTC): Alfa 2 (1995 fora), Beta 1
      expect(d.recentTitles.clubA).toHaveLength(2);
      expect(d.recentTitles.clubA[0].year).toBe(2025);
      expect(d.recentTitles.clubB).toHaveLength(1);
      expect(d.recentTitles.clubB[0].year).toBe(2026);
      // rankings sem dados publicados para as fixtures → null
      expect(d.rankings.clubA).toBeNull();
      expect(d.rankings.clubB).toBeNull();
      // h2h: aresta RIVAL é A↔C, NÃO A↔B
      expect(d.headToHead.exists).toBe(false);
      // sem partidas no acervo → matches sempre vazio
      expect(d.headToHead.matches).toEqual([]);
    },
  );

  it('head-to-head com aresta explícita A↔C', { timeout: 20_000 }, async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/clubs/compare?a=${idA}&b=${idC}`,
    });
    const d = JSON.parse(res.body).data;
    expect(d.headToHead.exists).toBe(true);
    expect(d.headToHead.relations).toEqual(['RIVAL']);
  });

  it('a == b → 400; query inválida → 400; inexistente → 404', async () => {
    const same = await app.inject({
      method: 'GET',
      url: `/api/v1/clubs/compare?a=${idA}&b=${idA}`,
    });
    expect(same.statusCode).toBe(400);
    expect(JSON.parse(same.body).error.code).toBe('SAME_CLUB');

    const invalid = await app.inject({
      method: 'GET',
      url: '/api/v1/clubs/compare?a=nao-uuid&b=tambem-nao',
    });
    expect(invalid.statusCode).toBe(400);

    const missing = await app.inject({
      method: 'GET',
      url: `/api/v1/clubs/compare?a=${idA}&b=00000000-0000-4000-8000-000000000000`,
    });
    expect(missing.statusCode).toBe(404);
  });
});
