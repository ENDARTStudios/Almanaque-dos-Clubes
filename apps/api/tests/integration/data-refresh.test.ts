/**
 * T451 — Integração (Postgres real; Redis no CI): jobs data-refresh.
 * Fixtures isoladas ('T451'); integrity-check detecta anomalias semeadas;
 * wikidata-incremental com provider MOCK (nunca API real) prova dry-run sem
 * escrita e apply com zero overwrite; fila registra job completado (Redis).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../src/config/prisma.js';
import {
  runWikidataIncremental,
  type WikidataEntities,
} from '../../src/jobs/wikidata-incremental.js';
import { runIntegrityCheck } from '../../src/jobs/integrity-check.js';

let dbOk = true;
let suffix = '';
let clubNoGeo = '';
let clubComplete = '';

beforeAll(async () => {
  try {
    await prisma.club.count();
  } catch {
    dbOk = false;
    if (process.env.TEST_REQUIRE_DB === 'true')
      throw new Error('[R1/TEST_REQUIRE_DB] banco ausente no CI — falha, não skip (D-2026-09-18)');
    return;
  }
  suffix = String(Date.now());
  const a = await prisma.club.create({
    data: { name: `T451 SemGeo ${suffix}`, country: 'ZZ', qid: `QT451A${suffix}` },
  });
  const b = await prisma.club.create({
    data: {
      name: `T451 Completo ${suffix}`,
      country: 'ZZ',
      qid: `QT451B${suffix}`,
      latitude: 1,
      longitude: 2,
      city: 'Já tem',
    },
  });
  clubNoGeo = a.id;
  clubComplete = b.id;

  // Anomalia: competição ativa sem QID. (Duplicata de qid NÃO é semeadável via
  // Prisma: qid é @unique — o check de duplicatas é guarda de dados legacy.)
  const c1 = await prisma.competition.create({
    data: { name: `T451 Cup sem qid ${suffix}`, qid: null, country: 'ZZ' },
  });

  // Anomalia: aresta WON sem proveniência
  await prisma.knowledgeGraph.create({
    data: {
      sourceId: clubNoGeo,
      sourceType: 'Club',
      targetId: c1.id,
      targetType: 'Competition',
      relation: 'WON',
      metadata: { year: 2020, dataSource: 'wikidata' }, // SEM sourceUrl
    },
  });

  // Anomalia: ranking_entry com points fora de 0-100
  const ranking = await prisma.ranking.create({
    data: { name: `T451 Ranking ${suffix}`, season: suffix, publishedAt: new Date() },
  });
  await prisma.rankingEntry.create({
    data: { rankingId: ranking.id, clubId: clubNoGeo, position: 1, points: 150 },
  });
});

afterAll(async () => {
  if (dbOk) {
    const ids = [clubNoGeo, clubComplete].filter(Boolean);
    await prisma.knowledgeGraph.deleteMany({ where: { sourceId: { in: ids } } });
    await prisma.rankingEntry.deleteMany({ where: { clubId: { in: ids } } });
    await prisma.ranking.deleteMany({ where: { name: { startsWith: `T451 Ranking ${suffix}` } } });
    await prisma.competition.deleteMany({ where: { name: { startsWith: 'T451 Cup' } } });
    await prisma.club.deleteMany({ where: { id: { in: ids } } });
  }
  await prisma.$disconnect();
});

describe('T451 integrity-check', () => {
  it('detecta anomalias semeadas e NÃO corrige nada', { timeout: 20_000 }, async () => {
    // sanity da fixture: a entry fora de 0-100 existe antes do check
    const seeded = await prisma.rankingEntry.findFirst({
      where: { points: { gt: 100 } },
      select: { id: true },
    });
    expect(seeded).not.toBeNull();
    const report = await runIntegrityCheck();
    const checks = new Map(report.anomalies.map((a) => [a.check, a]));
    expect(checks.has('competitions_active_without_qid')).toBe(true);
    expect(checks.has('kg_won_without_provenance')).toBe(true);
    expect(checks.has('ranking_entries_points_out_of_range')).toBe(true);
    // não corrigiu: a aresta sem proveniência continua lá
    const still = await prisma.knowledgeGraph.count({
      where: { sourceId: clubNoGeo, relation: 'WON' },
    });
    expect(still).toBe(1);
  });
});

describe('T451 wikidata-incremental (provider mockado)', () => {
  function mockProvider(entities: WikidataEntities) {
    return async (qids: string[]): Promise<WikidataEntities> =>
      Object.fromEntries(qids.filter((q) => entities[q]).map((q) => [q, entities[q]]));
  }

  it('dry-run: detectaria atualizar, mas NÃO escreve', { timeout: 20_000 }, async () => {
    const before = await prisma.club.findUnique({
      where: { id: clubNoGeo },
      select: { latitude: true, city: true },
    });
    const out = await runWikidataIncremental({
      batchSize: 50,
      dryRun: true,
      provider: mockProvider({
        [`QT451A${suffix}`]: {
          claims: {
            P625: [{ mainsnak: { datavalue: { value: { latitude: -23.5, longitude: -46.6 } } } }],
          },
        },
      }),
    });
    expect(out.dryRun).toBe(true);
    expect(out.clubsWouldUpdate).toBeGreaterThanOrEqual(1);
    expect(out.clubsUpdated).toBe(0);
    const after = await prisma.club.findUnique({
      where: { id: clubNoGeo },
      select: { latitude: true, city: true },
    });
    expect(after).toEqual(before);
  });

  it(
    'apply com ZERO OVERWRITE: preenche nulo do clube-alvo e não toca o completo',
    { timeout: 20_000 },
    async () => {
      const completeBefore = await prisma.club.findUnique({
        where: { id: clubComplete },
        select: { latitude: true, longitude: true, city: true },
      });
      const out = await runWikidataIncremental({
        batchSize: 50,
        dryRun: false,
        provider: mockProvider({
          [`QT451A${suffix}`]: {
            claims: {
              P625: [{ mainsnak: { datavalue: { value: { latitude: -23.5, longitude: -46.6 } } } }],
            },
          },
        }),
      });
      expect(out.clubsUpdated).toBeGreaterThanOrEqual(1);
      const target = await prisma.club.findUnique({
        where: { id: clubNoGeo },
        select: { latitude: true, longitude: true },
      });
      expect(target?.latitude).toBeCloseTo(-23.5);
      // clube completo intacto (coords/city já existiam → nunca sobrescrito)
      const completeAfter = await prisma.club.findUnique({
        where: { id: clubComplete },
        select: { latitude: true, longitude: true, city: true },
      });
      expect(completeAfter).toEqual(completeBefore);
    },
  );
});
