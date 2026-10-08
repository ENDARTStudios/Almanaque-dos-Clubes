/**
 * Mapeamento do portal (Entregas 2/3) — extensões ADITIVAS dos perfis.
 * API: GET /competitions/:id → overview; GET /players/:id → profile.
 * Padrão jobs-observability: app real + JWT; DB probe com guarda.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let dbOk = true;
const suffix = Date.now();
let compId = '';
let clubId = '';
let playerId = '';

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
  const comp = await prisma.competition.create({
    data: { name: `Comp Portal ${suffix}`, gender: 'men', importedFrom: 'portal-test' },
  });
  const club = await prisma.club.create({
    data: { name: `Clube Portal ${suffix}`, importedFrom: 'portal-test' },
  });
  const player = await prisma.player.create({
    data: { fullName: `Atleta Portal ${suffix}`, importedFrom: 'portal-test' },
  });
  compId = comp.id;
  clubId = club.id;
  playerId = player.id;
  // Arestas reais do grafo: WON (clube→comp, 2 edições) + PLAYED_FOR (player→clube)
  await prisma.knowledgeGraph.create({
    data: {
      sourceId: club.id,
      sourceType: 'Club',
      targetId: comp.id,
      targetType: 'Competition',
      relation: 'WON',
      metadata: { year: 2024, source: 'portal-test' },
    },
  });
  await prisma.knowledgeGraph.create({
    data: {
      sourceId: club.id,
      sourceType: 'Club',
      targetId: comp.id,
      targetType: 'Competition',
      relation: 'WON',
      metadata: { year: 2023, source: 'portal-test' },
    },
  });
  await prisma.knowledgeGraph.create({
    data: {
      sourceId: player.id,
      sourceType: 'Player',
      targetId: club.id,
      targetType: 'Club',
      relation: 'PLAYED_FOR',
      metadata: { year: 2024, source: 'portal-test' },
    },
  });
});

afterAll(async () => {
  if (dbOk) {
    await prisma.knowledgeGraph.deleteMany({
      where: { OR: [{ targetId: compId }, { sourceId: playerId }, { sourceId: clubId }] },
    });
    await prisma.competition.deleteMany({ where: { id: compId } });
    await prisma.club.deleteMany({ where: { id: clubId } });
    await prisma.player.deleteMany({ where: { id: playerId } });
  }
  if (app) await app.close();
});

describe('GET /competitions/:id — overview aditivo (Entrega 2)', () => {
  it('data intacta + overview com edições/participantes/maiores campeões', async () => {
    if (!dbOk) return;
    const res = await app.inject({ method: 'GET', url: `/api/v1/competitions/${compId}` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.name).toContain('Comp Portal');
    expect(body.overview.totalEditions).toBe(2);
    expect(body.overview.editions[0].year).toBe(2024);
    expect(body.overview.editions[0].champion.id).toBe(clubId);
    expect(body.overview.participants.map((p: { id: string }) => p.id)).toEqual([clubId]);
    expect(body.overview.topWinners[0].titles).toBe(2);
  });

  it('404 honesto em competição inexistente', async () => {
    if (!dbOk) return;
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/competitions/00000000-0000-0000-0000-000000000000',
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /players/:id — profile aditivo (Entrega 3)', () => {
  it('data intacta + currentClub/career/clubs derivados de PLAYED_FOR; achievements vazio-honesto', async () => {
    if (!dbOk) return;
    const res = await app.inject({ method: 'GET', url: `/api/v1/players/${playerId}` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.fullName).toContain('Atleta Portal');
    expect(body.profile.currentClub).toEqual({ id: clubId, name: `Clube Portal ${suffix}` });
    expect(body.profile.career).toHaveLength(1);
    expect(body.profile.career[0].year).toBe(2024);
    expect(body.profile.clubs.map((c: { id: string }) => c.id)).toEqual([clubId]);
    expect(body.profile.achievements).toEqual([]); // jogador sem WON → honesto
  });

  it('GET /competitions?gender=women filtra por gênero (Entrega 4)', async () => {
    if (!dbOk) return;
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/competitions?gender=women&limit=5',
    });
    expect(res.statusCode).toBe(200);
    for (const c of res.json().data) expect(c.gender).toBe('women');
  });
});
