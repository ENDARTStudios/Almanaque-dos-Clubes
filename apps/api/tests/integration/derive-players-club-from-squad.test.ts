/**
 * T582 — integração da derivação jogador → clube com FIXTURES reais (Postgres do CI).
 *
 * Prova o caminho completo contra o schema: arestas `PLAYED_FOR` já gravadas no
 * `knowledge_graph`, `clubId` escrito na aresta mais recente, clube fora do acervo e
 * sem aresta virando `no_source`, cursor `clubFromSquad` mesclado sem apagar a chave
 * `club` do P54, e re-run noop.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../src/config/prisma.js';
import { derivePlayersClubFromSquadBatch } from '../../src/modules/etl/derive-players-club-from-squad.service.js';

const suf = Date.now();
let dbOk = true;
let atualId = '';
let antigoId = '';
let foraId = '';
let pLinkId = '';
let pForaId = '';
let pSemId = '';

const now = new Date('2026-10-17T00:00:00Z');

beforeAll(async () => {
  try {
    await prisma.club.count();
  } catch {
    dbOk = false;
    return;
  }
  const atual = await prisma.club.create({
    data: { name: `T582 atual ${suf}`, qid: `Q891${suf}`, kind: 'club' },
  });
  const antigo = await prisma.club.create({
    data: { name: `T582 antigo ${suf}`, qid: `Q892${suf}`, kind: 'club' },
  });
  // Alvo que NÃO é clube do acervo (seleção): não pode virar clubId.
  const fora = await prisma.club.create({
    data: { name: `T582 selecao ${suf}`, qid: `Q893${suf}`, kind: 'national_team' },
  });
  atualId = atual.id;
  antigoId = antigo.id;
  foraId = fora.id;

  const pLink = await prisma.player.create({
    data: {
      fullName: `0000000001 T582 link ${suf}`,
      qid: `Q894${suf}`,
      importedFrom: 't582-test',
      // Cursor do P54 já existente: NÃO pode ser apagado pelo merge do T582.
      mediaEnrichment: { club: { at: '2026-10-16T00:00:00.000Z', status: 'no_source' } },
    },
  });
  const pFora = await prisma.player.create({
    data: {
      fullName: `0000000002 T582 fora ${suf}`,
      qid: `Q895${suf}`,
      importedFrom: 't582-test',
    },
  });
  const pSem = await prisma.player.create({
    data: {
      fullName: `0000000003 T582 sem ${suf}`,
      qid: `Q896${suf}`,
      importedFrom: 't582-test',
    },
  });
  pLinkId = pLink.id;
  pForaId = pFora.id;
  pSemId = pSem.id;

  // pLink: 2023 no clube antigo, 2025 no atual → a mais recente vence.
  await prisma.knowledgeGraph.create({
    data: {
      sourceId: pLinkId,
      sourceType: 'Player',
      targetId: antigoId,
      targetType: 'Club',
      relation: 'PLAYED_FOR',
      metadata: { P54: true, year: 2023, season: '2023', dataSource: 'wikidata' },
    },
  });
  await prisma.knowledgeGraph.create({
    data: {
      sourceId: pLinkId,
      sourceType: 'Player',
      targetId: atualId,
      targetType: 'Club',
      relation: 'PLAYED_FOR',
      metadata: { P54: true, year: 2025, season: '2025', dataSource: 'wikidata' },
    },
  });
  // pFora: aresta mais recente aponta para seleção (fora do acervo).
  await prisma.knowledgeGraph.create({
    data: {
      sourceId: pForaId,
      sourceType: 'Player',
      targetId: foraId,
      targetType: 'Club',
      relation: 'PLAYED_FOR',
      metadata: { P54: true, year: 2025, season: '2025', dataSource: 'wikidata' },
    },
  });
  // pSem: nenhuma aresta.
});

afterAll(async () => {
  if (!dbOk) return;
  const ids = [pLinkId, pForaId, pSemId].filter(Boolean);
  await prisma.knowledgeGraph.deleteMany({ where: { sourceId: { in: ids } } });
  await prisma.player.deleteMany({ where: { id: { in: ids } } });
  await prisma.club.deleteMany({
    where: { id: { in: [atualId, antigoId, foraId].filter(Boolean) } },
  });
});

describe('T582 — integração jogador → clube a partir de PLAYED_FOR', () => {
  it('grava a aresta mais recente, declara no_source e preserva o cursor do P54', async () => {
    if (!dbOk) return;
    const out = await derivePlayersClubFromSquadBatch(10, {
      apply: true,
      now,
      playerIds: [pLinkId, pForaId, pSemId],
    });
    expect(out).toMatchObject({
      processed: 3,
      linked: 1,
      outsideArchive: 1,
      noEdge: 1,
    });

    const [link, fora, sem] = await Promise.all([
      prisma.player.findUnique({ where: { id: pLinkId } }),
      prisma.player.findUnique({ where: { id: pForaId } }),
      prisma.player.findUnique({ where: { id: pSemId } }),
    ]);
    expect(link?.clubId).toBe(atualId);
    expect(fora?.clubId).toBeNull();
    expect(sem?.clubId).toBeNull();

    const cursor = (p: typeof link) => (p?.mediaEnrichment ?? {}) as Record<string, unknown>;
    expect(cursor(link).clubFromSquad).toMatchObject({
      status: 'enriched',
      source: 'knowledge_graph:PLAYED_FOR',
      year: 2025,
    });
    expect(cursor(fora).clubFromSquad).toMatchObject({
      status: 'no_source',
      reason: 'outside_archive',
      source: 'knowledge_graph:PLAYED_FOR',
    });
    expect(cursor(sem).clubFromSquad).toMatchObject({
      status: 'no_source',
      reason: 'no_edge',
    });
    // O cursor do P54 continua lá (merge, não sobrescrita).
    expect(cursor(link).club).toMatchObject({ status: 'no_source' });
  });

  it('re-run é noop: o cursor próprio tira os três da fila', async () => {
    if (!dbOk) return;
    const out = await derivePlayersClubFromSquadBatch(10, {
      apply: true,
      now,
      playerIds: [pLinkId, pForaId, pSemId],
    });
    expect(out.processed).toBe(0);
  });
});
