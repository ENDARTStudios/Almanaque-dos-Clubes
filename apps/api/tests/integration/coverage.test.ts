/**
 * DQ-01 — cobertura: service + GET /coverage com fixture mínima
 * (3 partidas: 2 com placar + 1 agendada). Postgres obrigatório (JSONB/aggregate);
 * skip honesto sem banco, falha com TEST_REQUIRE_DB=true.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import { buildCoverageMatrix } from '../../src/modules/coverage/coverage.service.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let dbOk = true;
const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');

let compId = '';
let clubA = '';
let clubB = '';

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  if (!isPostgres) return;
  try {
    await prisma.knowledgeGraph.count();
  } catch {
    dbOk = false;
    if (process.env.TEST_REQUIRE_DB === 'true')
      throw new Error('[R1/TEST_REQUIRE_DB] banco ausente no CI — falha, não skip (D-2026-09-18)');
    return;
  }
  const suffix = Date.now();
  const comp = await prisma.competition.create({
    data: {
      name: `Cobertura League ${suffix}`,
      type: 'LEAGUE',
      qid: `Q98${suffix % 1000000}`,
      country: 'BR',
      importedFrom: 'manual',
    },
  });
  compId = comp.id;
  const [a, b] = await Promise.all([
    prisma.club.create({ data: { name: `Cobertura FC A ${suffix}`, country: 'BR' } }),
    prisma.club.create({ data: { name: `Cobertura FC B ${suffix}`, country: 'BR' } }),
  ]);
  clubA = a.id;
  clubB = b.id;
  const base = { homeClubId: clubA, awayClubId: clubB, competitionId: compId };
  await prisma.match.createMany({
    data: [
      // 2 encerradas COM placar + fonte
      {
        ...base,
        date: new Date('2025-03-01T19:30:00Z'),
        homeScore: 2,
        awayScore: 1,
        status: 'FINISHED',
        importedFrom: 'rsssf',
        sourceUrl: 'https://rsssf.test/1',
      },
      {
        ...base,
        date: new Date('2025-03-08T19:30:00Z'),
        homeScore: 0,
        awayScore: 0,
        status: 'FINISHED',
        importedFrom: 'rsssf',
        sourceUrl: 'https://rsssf.test/2',
      },
      // 1 agendada SEM placar (calendário, não lacuna)
      {
        ...base,
        date: new Date('2030-03-15T19:30:00Z'),
        status: 'SCHEDULED',
        importedFrom: 'manual',
      },
    ],
  });
});

afterAll(async () => {
  if (dbOk && isPostgres) {
    await prisma.match.deleteMany({ where: { competitionId: compId } });
    await prisma.competition.delete({ where: { id: compId } }).catch(() => undefined);
    await prisma.club.deleteMany({ where: { id: { in: [clubA, clubB] } } });
  }
  await app.close();
});

describe.skipIf(!dbOk || !isPostgres)('DQ-01 — matriz de cobertura', () => {
  it('agrega por competição×ano: total, placar, agendadas, fonte e atualização', async () => {
    const matrix = await buildCoverageMatrix();
    // Temporada = ano da data: 2025 (2 partidas com placar) e 2030 (1 agendada)
    // são RECORTEs distintos — é assim que a matriz mostra a lacuna real.
    const row2025 = matrix.rows.find((r) => r.competitionId === compId && r.year === 2025);
    const row2030 = matrix.rows.find((r) => r.competitionId === compId && r.year === 2030);
    expect(row2025).toBeDefined();
    expect(row2025!.matchesTotal).toBe(2);
    expect(row2025!.matchesWithScore).toBe(2);
    expect(row2025!.matchesScheduled).toBe(0);
    expect(row2025!.matchesWithSourceUrl).toBe(2);
    expect(row2025!.sources).toEqual(['rsssf']);
    expect(row2025!.firstMatchDate).toBe('2025-03-01');
    expect(row2025!.lastMatchDate).toBe('2025-03-08');
    expect(row2025!.lastUpdatedAt).toBeTruthy();
    expect(row2025!.pilot).toBe(false); // QID da fixture não está no escopo do MVP
    expect(row2025!.freshnessDays).toBe(0); // acabou de criar (DATA-03)
    expect(row2025!.stale).toBe(false);
    expect(row2030).toBeDefined();
    expect(row2030!.matchesTotal).toBe(1);
    expect(row2030!.matchesWithScore).toBe(0);
    expect(row2030!.matchesScheduled).toBe(1);
    expect(row2030!.sources).toEqual(['manual']);
  });

  it('pilotOnly corta para os 3 recortes do MVP', async () => {
    const matrix = await buildCoverageMatrix(true);
    expect(matrix.pilotQids).toEqual(['Q206813', 'Q9448', 'Q184795']);
    expect(matrix.rows.every((r) => r.pilot)).toBe(true);
  });

  it('GET /coverage responde a matriz (read-only, sem auth)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/coverage' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.pilotQids).toEqual(['Q206813', 'Q9448', 'Q184795']);
    expect(Array.isArray(body.data.rows)).toBe(true);
  });
});
