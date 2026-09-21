/**
 * T441 — GET /api/v1/champions: campeão vigente por hierarquia.
 *
 * Fixture cria arestas WON em duas hierarquias (mundial via nome, nacional via
 * default) com anos distintos → o mais recente vence. Hierarquias sem arestas
 * voltam null com reason (honestidade 1.3). Requer Postgres (metadata Json);
 * local sem Postgres → skip honesto.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let dbOk = true;
const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');
let clubWorld = '';
let clubNational = '';
let compWorld = '';
let compNational = '';
let rankingId = '';

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  if (!isPostgres) return;
  try {
    await prisma.knowledgeGraph.count();
  } catch {
    dbOk = false;
    if (process.env.TEST_REQUIRE_DB === 'true') throw new Error('[R1/TEST_REQUIRE_DB] banco ausente no CI — falha, não skip (D-2026-09-18)');
    return;
  }

  const cw = await prisma.club.create({
    data: { name: 'Champions World FC', country: 'BR', qid: null },
  });
  const cn = await prisma.club.create({
    data: { name: 'Champions National FC', country: 'BR', qid: null },
  });
  clubWorld = cw.id;
  clubNational = cn.id;

  const w = await prisma.competition.create({
    data: {
      name: 'FIFA Club World Cup T441',
      type: 'CUP',
      qid: 'Q91000441',
      importedFrom: 'manual',
    },
  });
  compWorld = w.id;
  const n = await prisma.competition.create({
    data: {
      name: 'Campeonato Nacional T441',
      type: 'LEAGUE',
      qid: 'Q91000442',
      importedFrom: 'manual',
    },
  });
  compNational = n.id;

  // Mundial: 2003 e 2004 → 2004 vence (mais recente; anos únicos — regra R2 de
  // fixtures escopados). T448d: anos PRECISAM ser <= ano corrente — a guarda de
  // vigência trata edição futura (year > hoje) como inexistente para o carrossel,
  // então 2037/2038 (anos únicos originais) viraram fixture inválido.
  for (const year of [2003, 2004]) {
    await prisma.knowledgeGraph.create({
      data: {
        sourceId: clubWorld,
        sourceType: 'Club',
        targetId: compWorld,
        targetType: 'Competition',
        relation: 'WON',
        metadata: { year, dataSource: 'manual' },
      },
    });
  }
  await prisma.knowledgeGraph.create({
    data: {
      sourceId: clubNational,
      sourceType: 'Club',
      targetId: compNational,
      targetType: 'Competition',
      relation: 'WON',
      metadata: { year: 2004, dataSource: 'manual' },
    },
  });

  const ranking = await prisma.ranking.create({
    data: { name: 'Ranking 0-100 T441 — Masculino', season: '2039', publishedAt: new Date() },
  });
  rankingId = ranking.id;
  await prisma.rankingEntry.create({
    data: { rankingId: ranking.id, clubId: clubWorld, position: 1, points: 100, gender: 'men' },
  });
});

afterAll(async () => {
  if (dbOk && isPostgres) {
    await prisma.rankingEntry.deleteMany({ where: { rankingId } });
    await prisma.ranking.deleteMany({ where: { id: rankingId } });
    await prisma.knowledgeGraph.deleteMany({
      where: { relation: 'WON', sourceId: { in: [clubWorld, clubNational] } },
    });
    await prisma.club.deleteMany({ where: { id: { in: [clubWorld, clubNational] } } });
    await prisma.competition.deleteMany({ where: { id: { in: [compWorld, compNational] } } });
  }
  await app.close();
});

describe('GET /api/v1/champions (T441)', () => {
  it('200: campeão vigente por hierarquia — ano mais recente vence; demais honestamente vazias', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await app.inject({ method: 'GET', url: '/api/v1/champions' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const byHierarchy = new Map(body.data.map((d: { hierarchy: string }) => [d.hierarchy, d]));

    const mundial = byHierarchy.get('mundial');
    expect(mundial.champion).not.toBeNull();
    expect(mundial.champion.club.name).toBe('Champions World FC');
    expect(mundial.champion.season).toBe(2004); // mais recente vence
    expect(mundial.champion.competition.name).toContain('World Cup');
    expect(mundial.champion.trophy).toBeNull(); // acervo sem imagens ainda

    const nacional = byHierarchy.get('nacional');
    expect(nacional.champion.club.name).toBe('Champions National FC');

    // Hierarquias sem arestas → null com reason (honestidade 1.3)
    for (const h of ['continental', 'estadual', 'municipal']) {
      expect(byHierarchy.get(h).champion).toBeNull();
      expect(byHierarchy.get(h).reason).toContain('dados');
    }
  });

  it('badge do ranking vigente quando o clube está ranqueado', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await app.inject({ method: 'GET', url: '/api/v1/champions' });
    const body = JSON.parse(res.body);
    const mundial = body.data.find((d: { hierarchy: string }) => d.hierarchy === 'mundial');
    expect(mundial.champion.ranking).toMatchObject({ position: 1, points: 100 });
  });

  it('filtro gender=women: hierarquias sem campeã feminina voltam null com reason', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await app.inject({ method: 'GET', url: '/api/v1/champions?gender=women' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.every((d: { champion: unknown }) => d.champion === null)).toBe(true);
  });

  it('400 com gender inválido', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await app.inject({ method: 'GET', url: '/api/v1/champions?gender=x' });
    expect(res.statusCode).toBe(400);
  });
});
