/**
 * T448 — Integração: ingestão de arestas WON com Prisma real + efeitos de
 * produto (GET /clubs/:id/titles e leitura congelada no GET /champions).
 *
 * Fixture com nomes/QIDs/anos únicos (regra R2 — escopo por fixture, sem
 * colisão P2002). Requer Postgres (metadata Json); local sem Postgres → skip
 * honesto; CI com TEST_REQUIRE_DB=true → falha (D-2026-09-18).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import {
  createPrismaWonEdgeRepo,
  syncWonEdges,
  type WonEdgeCandidate,
} from '../../src/modules/etl/won-edges.service.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let dbOk = true;
const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');

let clubId = '';
let compId = '';
const QID_CLUB = 'Q94800448';
const QID_COMP = 'Q94800449';
const QID_COMP_AUSENTE = 'Q94800999';
const QID_EDITION = 'Q94800450';
// Ano ÚNICO e BAIXO (R2): a aresta desta fixture entra no estado GLOBAL de
// campeões (o KG é compartilhado) — 1901 garante que o campeão vigente
// nacional do T441 (anos 2037/2038) não seja desbancado quando os arquivos
// rodam juntos no CI.
const YEAR = 1901;

const candidate: WonEdgeCandidate = {
  editionQid: QID_EDITION,
  motherQid: QID_COMP,
  winnerQid: QID_CLUB,
  year: YEAR,
  motherName: 'Liga de Teste T448',
};

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

  const club = await prisma.club.create({
    data: { name: 'Won Edges FC T448', country: 'BR', qid: QID_CLUB },
  });
  clubId = club.id;
  const comp = await prisma.competition.create({
    data: { name: 'Liga de Teste T448', type: 'LEAGUE', qid: QID_COMP, importedFrom: 'manual' },
  });
  compId = comp.id;
});

afterAll(async () => {
  if (dbOk && isPostgres) {
    await prisma.knowledgeGraph.deleteMany({
      where: {
        OR: [
          { sourceId: clubId },
          { targetId: compId },
          {
            metadata: {
              path: ['sourceUrl'],
              equals: `https://www.wikidata.org/wiki/${QID_EDITION}`,
            },
          },
        ],
      },
    });
    await prisma.club.deleteMany({ where: { id: clubId } });
    await prisma.competition.deleteMany({ where: { id: compId } });
  }
  await app.close();
});

describe('T448 — syncWonEdges com Prisma real', () => {
  it('cria aresta WON com proveniência POR ARESTA e hierarquia congelada', async () => {
    if (!dbOk || !isPostgres) return;
    const result = await syncWonEdges([candidate], createPrismaWonEdgeRepo(prisma));
    expect(result.counts.created).toBe(1);

    const edge = await prisma.knowledgeGraph.findFirst({
      where: { sourceId: clubId, targetId: compId, relation: 'WON' },
    });
    expect(edge).not.toBeNull();
    const meta = (edge!.metadata ?? {}) as Record<string, unknown>;
    expect(meta.year).toBe(YEAR);
    expect(meta.season).toBe(String(YEAR));
    expect(meta.hierarchy).toBe('nacional'); // congelada via resolveHierarchy (nome sem keyword → default)
    expect(meta.gender).toBe('men');
    expect(meta.dataSource).toBe('wikidata');
    expect(meta.license).toBe('CC0');
    expect(meta.sourceUrl).toBe(`https://www.wikidata.org/wiki/${QID_EDITION}`); // EDIÇÃO, não mãe
  });

  it('re-run idempotente: zero criação, zero duplicação', async () => {
    if (!dbOk || !isPostgres) return;
    // Contagem ESCOPADA ao fixture: contagem global de WON é corrida quando
    // outros arquivos de teste inserem arestas em paralelo (R2).
    const totalBefore = await prisma.knowledgeGraph.count({
      where: { relation: 'WON', sourceId: clubId },
    });
    const result = await syncWonEdges([candidate], createPrismaWonEdgeRepo(prisma));
    expect(result.counts.created).toBe(0);
    expect(result.counts.skipped).toBe(1);
    const totalAfter = await prisma.knowledgeGraph.count({
      where: { relation: 'WON', sourceId: clubId },
    });
    expect(totalAfter).toBe(totalBefore);
  });

  it('mãe ausente → aresta NÃO gravada + gap contado por hierarquia', async () => {
    if (!dbOk || !isPostgres) return;
    const totalBefore = await prisma.knowledgeGraph.count({
      where: { relation: 'WON', sourceId: clubId },
    });
    const result = await syncWonEdges(
      [
        {
          ...candidate,
          editionQid: 'Q94800998',
          motherQid: QID_COMP_AUSENTE,
          motherName: 'Copa Libertadores (inexistente no acervo)',
        },
      ],
      createPrismaWonEdgeRepo(prisma),
    );
    expect(result.counts.created).toBe(0);
    expect(result.gaps).toHaveLength(1);
    expect(result.gapByHierarchy.continental).toBe(1);
    const totalAfter = await prisma.knowledgeGraph.count({
      where: { relation: 'WON', sourceId: clubId },
    });
    expect(totalAfter).toBe(totalBefore);
  });

  it('GET /clubs/:id/titles — galeria de honra com fonte e hierarquia', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await app.inject({ method: 'GET', url: `/api/v1/clubs/${clubId}/titles` });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.total).toBeGreaterThanOrEqual(1);
    const title = body.data.find(
      (t: { competition: { id: string } | null }) => t.competition?.id === compId,
    );
    expect(title).toBeTruthy();
    expect(title.hierarchy).toBe('nacional');
    expect(title.year).toBe(YEAR);
    expect(title.sourceUrl).toBe(`https://www.wikidata.org/wiki/${QID_EDITION}`);
  });

  it('GET /clubs/:id/titles — clube inexistente → 404', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await app.inject({ method: 'GET', url: '/api/v1/clubs/nao-existe-t448/titles' });
    expect(res.statusCode).toBe(404);
  });

  // A leitura CONGELADA pelo GET /champions é verificada em teste unitário com
  // prisma mockado (tests/unit/ingest/won-edges-wikidata.test.ts) — gravar uma
  // aresta 'mundial' aqui contaminaria o DB compartilhado e quebraria as
  // assertions de campeão do T441 (classe R2: estado compartilhado entre
  // arquivos de teste paralelos).
});
