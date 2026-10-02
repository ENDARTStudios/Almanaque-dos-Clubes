/**
 * WS-C-5 — Integração (Postgres real): GET /clubs/:id/timeline e /clubs/:id/related.
 * Fixtures isoladas ('WSC5'); limpa antes/depois. Prova ordenação por ano, vazio-honesto,
 * dedupe de categorias, exclusão de self e rival-só-com-aresta-explícita. Zero escrita
 * fora das fixtures.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

const QIDS = {
  a: 'Q9950001',
  b: 'Q9950002',
  c: 'Q9950003',
  d: 'Q9950004',
  comp: 'Q9950099',
};
const PREFIX = 'WSC5';

async function clubIdByQid(qid: string): Promise<string> {
  const c = await prisma.club.findFirst({ where: { qid }, select: { id: true } });
  if (!c) throw new Error(`fixture ausente: ${qid}`);
  return c.id;
}

async function cleanup(): Promise<void> {
  const qids = Object.values(QIDS);
  const ids = await prisma.club.findMany({ where: { qid: { in: qids } }, select: { id: true } });
  const clubIds = ids.map((c) => c.id);
  const comp = await prisma.competition.findFirst({ where: { qid: QIDS.comp } });
  await prisma.knowledgeGraph.deleteMany({
    where: {
      OR: [
        { sourceId: { in: clubIds } },
        { targetId: { in: clubIds } },
        ...(comp ? [{ sourceId: comp.id }, { targetId: comp.id }] : []),
      ],
    },
  });
  await prisma.club.deleteMany({ where: { qid: { in: qids } } });
  await prisma.competition.deleteMany({ where: { qid: QIDS.comp } });
}

beforeAll(async () => {
  await cleanup();
  app = await buildApp();
  await app.ready();

  const comp = await prisma.competition.create({
    data: { name: `${PREFIX} Cup`, qid: QIDS.comp, country: 'ZZ', type: 'CUP' },
    select: { id: true },
  });
  const { a, b, c, d } = QIDS;
  const created = await prisma.club.createMany({
    data: [
      { name: `${PREFIX} Alfa`, qid: a, city: 'Cidade X', state: 'ST-X', country: 'ZZ' },
      { name: `${PREFIX} Beta`, qid: b, city: 'Cidade X', state: null, country: 'ZZ' },
      { name: `${PREFIX} Gama`, qid: c, city: 'Cidade Y', state: 'ST-X', country: 'ZZ' },
      { name: `${PREFIX} Delta`, qid: d, city: 'Cidade X', state: null, country: 'ZZ' },
    ],
  });
  expect(created.count).toBe(4);

  const [ida, idb, idc] = await Promise.all([clubIdByQid(a), clubIdByQid(b), clubIdByQid(c)]);
  const provenance = {
    dataSource: 'wikidata',
    sourceUrl: 'https://www.wikidata.org/wiki/' + QIDS.comp,
    license: 'CC0',
  };
  await prisma.knowledgeGraph.createMany({
    data: [
      // A campeão em 2020 e 2023 (mesma competição, edições distintas) → ordenação
      {
        sourceId: ida,
        sourceType: 'Club',
        targetId: comp.id,
        targetType: 'Competition',
        relation: 'WON',
        metadata: { year: 2020, hierarchy: 'nacional', ...provenance },
      },
      {
        sourceId: ida,
        sourceType: 'Club',
        targetId: comp.id,
        targetType: 'Competition',
        relation: 'WON',
        metadata: { year: 2023, hierarchy: 'nacional', ...provenance },
      },
      // B campeão da mesma competição → same_competition p/ A
      {
        sourceId: idb,
        sourceType: 'Club',
        targetId: comp.id,
        targetType: 'Competition',
        relation: 'WON',
        metadata: { year: 2021, hierarchy: 'nacional', ...provenance },
      },
      // rival explícito A ↔ C (não inferido)
      {
        sourceId: ida,
        sourceType: 'Club',
        targetId: idc,
        targetType: 'Club',
        relation: 'RIVAL',
        metadata: { sourceUrl: 'https://www.wikidata.org/wiki/RIVAL' },
      },
    ],
  });
});

afterAll(async () => {
  await cleanup();
  await app.close();
});

describe('WS-C-5 GET /clubs/:id/timeline', () => {
  it('clube com títulos: ordena por ano DESC e preserva proveniência', async () => {
    const ida = await clubIdByQid(QIDS.a);
    const res = await app.inject({ method: 'GET', url: `/api/v1/clubs/${ida}/timeline` });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body).data;
    expect(body.clubId).toBe(ida);
    expect(body.qid).toBe(QIDS.a);
    expect(body.totalTitles).toBe(2);
    expect(body.timeline[0].year).toBe(2023);
    expect(body.timeline[1].year).toBe(2020);
    expect(body.timeline[0].competitionQid).toBe(QIDS.comp);
    expect(body.timeline[0].competitionName).toBe(`${PREFIX} Cup`);
    expect(body.timeline[0].source).toBe('wikidata');
    expect(body.timeline[0].sourceUrl).toContain('wikidata.org');
    expect(body.byHierarchy.nacional).toBe(2);
  });

  it('clube sem títulos: timeline vazia honesta', async () => {
    const idd = await clubIdByQid(QIDS.d);
    const res = await app.inject({ method: 'GET', url: `/api/v1/clubs/${idd}/timeline` });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body).data;
    expect(body.totalTitles).toBe(0);
    expect(body.timeline).toEqual([]);
    expect(body.byHierarchy).toEqual({
      mundial: 0,
      continental: 0,
      nacional: 0,
      estadual: 0,
      municipal: 0,
    });
  });

  it('clube inexistente → 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/clubs/wsc5-inexistente/timeline' });
    expect(res.statusCode).toBe(404);
  });
});

describe('WS-C-5 GET /clubs/:id/related', () => {
  it('mesma cidade + rival explícito; sem duplicatas; sem self', async () => {
    const ida = await clubIdByQid(QIDS.a);
    const res = await app.inject({ method: 'GET', url: `/api/v1/clubs/${ida}/related` });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body).data;
    expect(body.clubId).toBe(ida);

    const ids = body.related.map((r: { clubId: string }) => r.clubId);
    expect(new Set(ids).size).toBe(ids.length); // sem duplicatas
    expect(ids).not.toContain(ida); // exclui self
    expect(ids.length).toBeLessThanOrEqual(12);

    const byName = new Map(body.related.map((r: { name: string }) => [r.name, r]));
    const rival = byName.get(`${PREFIX} Gama`);
    expect(rival).toBeDefined();
    expect(rival.relationType).toBe('rival'); // aresta explícita vence
    expect(rival.confidence).toBe(1);

    const beta = byName.get(`${PREFIX} Beta`);
    expect(beta).toBeDefined();
    // B é same_city (0.9) E same_competition (0.8) — dedupe mantém a melhor
    expect(beta.relationType).toBe('same_city');
    expect(beta.confidence).toBe(0.9);

    const delta = byName.get(`${PREFIX} Delta`);
    expect(delta).toBeDefined();
    expect(delta.relationType).toBe('same_city'); // mesma cidade sem aresta NÃO é rival
    expect(delta.relationType).not.toBe('rival');
  });

  it('rival só por aresta explícita: Delta (mesma cidade, sem aresta) nunca vira rival', async () => {
    const idd = await clubIdByQid(QIDS.d);
    const res = await app.inject({ method: 'GET', url: `/api/v1/clubs/${idd}/related` });
    const body = JSON.parse(res.body).data;
    expect(body.related.every((r: { relationType: string }) => r.relationType !== 'rival')).toBe(
      true,
    );
  });

  it('clube inexistente → 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/clubs/wsc5-inexistente/related' });
    expect(res.statusCode).toBe(404);
  });
});
