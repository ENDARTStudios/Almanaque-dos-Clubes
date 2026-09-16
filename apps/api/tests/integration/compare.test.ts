/**
 * T440 — Comparadores clube×clube e jogador×jogador.
 *
 * Requer Postgres (fixtures usam KnowledgeGraph com metadata Json — sem
 * espelho sqlite funcional). Local sem Postgres → skip honesto; CI valida.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let dbOk = true;
const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');
let clubA = '';
let clubB = '';
let compId = '';
let rankingId = '';
const cleanup: Array<{ id: string }> = [];

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  if (!isPostgres) return;
  try {
    await prisma.knowledgeGraph.count();
  } catch {
    dbOk = false;
    return;
  }

  const a = await prisma.club.create({
    data: { name: 'Compare FC A', country: 'BR', foundedYear: 1914, qid: null },
  });
  const b = await prisma.club.create({
    data: { name: 'Compare FC B', country: 'BR', foundedYear: 1927, qid: null },
  });
  clubA = a.id;
  clubB = b.id;
  cleanup.push(a, b);

  const comp = await prisma.competition.create({
    data: {
      name: 'Copa Mundial Teste T440',
      type: 'CUP',
      qid: 'Q91000440',
      importedFrom: 'manual',
    },
  });
  compId = comp.id;
  cleanup.push(comp);

  await prisma.knowledgeGraph.create({
    data: {
      sourceId: clubA,
      sourceType: 'Club',
      targetId: compId,
      targetType: 'Competition',
      relation: 'WON',
      metadata: { year: 2023, dataSource: 'manual' },
    },
  });
  await prisma.knowledgeGraph.create({
    data: {
      sourceId: clubA,
      sourceType: 'Club',
      targetId: compId,
      targetType: 'Competition',
      relation: 'WON',
      metadata: { year: 2022, dataSource: 'manual' },
    },
  });

  const ranking = await prisma.ranking.create({
    data: { name: 'Ranking 0-100 T440 — Masculino', season: '2023', publishedAt: new Date() },
  });
  rankingId = ranking.id;
  await prisma.rankingEntry.create({
    data: { rankingId: ranking.id, clubId: clubA, position: 1, points: 100, gender: 'men' },
  });
  await prisma.rankingEntry.create({
    data: { rankingId: ranking.id, clubId: clubB, position: 2, points: 40, gender: 'men' },
  });

  const player = await prisma.player.create({
    data: {
      fullName: 'Comparador Silva',
      position: 'ATT',
      country: 'BR',
      clubId: clubA,
      qid: null,
    },
  });
  cleanup.push(player);
});

afterAll(async () => {
  if (dbOk && isPostgres) {
    await prisma.rankingEntry.deleteMany({ where: { rankingId } });
    await prisma.ranking.deleteMany({ where: { id: rankingId } });
    await prisma.knowledgeGraph.deleteMany({
      where: { sourceId: { in: cleanup.map((c) => c.id) }, relation: 'WON' },
    });
    await prisma.player.deleteMany({ where: { id: { in: cleanup.map((c) => c.id) } } });
    await prisma.club.deleteMany({ where: { id: { in: [clubA, clubB] } } });
    await prisma.competition.deleteMany({ where: { id: compId } });
  }
  await app.close();
});

describe('GET /api/v1/compare/clubs (T440)', () => {
  it('200 com títulos por hierarquia, líder e histórico de rankings', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/compare/clubs?ids=${clubA},${clubB}`,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.kind).toBe('clubs');
    expect(body.a.name).toBe('Compare FC A');
    // A tem 2 títulos mundiais (arestas WON na competição "Copa Mundial")
    expect(body.a.titles.mundial).toBe(2);
    expect(body.a.titles.total).toBe(2);
    expect(body.b.titles.total).toBe(0);
    expect(body.comparison.titles).toMatchObject({ a: 2, b: 0, leader: 'a' });
    // Histórico de rankings com posições
    expect(body.a.rankingHistory.length).toBeGreaterThanOrEqual(1);
    expect(body.a.rankingHistory[0].position).toBe(1);
    // Fundação mais antiga lidera
    expect(body.comparison.foundedYear.leader).toBe('a');
    // Honestidade: partidas sem fonte
    expect(body.comparison.matches.reason).toContain('M4');
  });

  it('404 quando um dos clubes não existe', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/compare/clubs?ids=${clubA},00000000-0000-4000-8000-000000000000`,
    });
    expect(res.statusCode).toBe(404);
  });

  it('400 com um único id; 422 com formato inválido', async () => {
    if (!dbOk || !isPostgres) return;
    const one = await app.inject({ method: 'GET', url: `/api/v1/compare/clubs?ids=${clubA}` });
    expect(one.statusCode).toBe(400);
    const bad = await app.inject({ method: 'GET', url: '/api/v1/compare/clubs?ids=abc,def' });
    expect(bad.statusCode).toBe(422);
  });
});

describe('GET /api/v1/compare/players (T440)', () => {
  it('200 com perfis e nota honesta de métricas', async () => {
    if (!dbOk || !isPostgres) return;
    const player = cleanup.find((c) => c.id && c !== clubA && c !== clubB && c !== compId);
    if (!player) return;
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/compare/players?ids=${player.id},${player.id}`,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.kind).toBe('players');
    expect(body.a.name).toBe('Comparador Silva');
    expect(body.comparison.note).toContain('M4');
  });

  it('404 quando jogador não existe', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/compare/players?ids=00000000-0000-4000-8000-000000000000,00000000-0000-4000-8000-000000000001',
    });
    expect(res.statusCode).toBe(404);
  });
});
