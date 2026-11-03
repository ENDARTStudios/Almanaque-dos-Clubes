/**
 * ENTRADAS DE RANKING COM NOME — a cobertura do ajuste feito para `/rankings/[id]`.
 *
 * ── O QUE ESTE TESTE PROVA ────────────────────────────────────────────────────────────────
 * O `findEntries` passou a resolver `clubName`/`playerName` na mesma query, porque as entradas
 * traziam só `clubId`/`playerId` — UUIDs — e a tela mostraria UUID na coluna "Clube".
 *
 * Três invariantes que só um banco confirma:
 *
 *   1. O NOME VEM. Se o `include` estiver errado, `clubName` é `null` e a tela fica com "—" em
 *      todas as linhas sem erro nenhum.
 *   2. ORDEM: `position` crescente com NULL no FIM. No Postgres o NULL sobe no ASC, então sem
 *      `nulls: 'last'` a entrada "sem posição publicada" (T425) encabeçaria o ranking.
 *   3. RANKING DE JOGADOR não usa `clubName`: a entrada aponta para `playerId`.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';

let app: FastifyInstance;
let dbOk = true;
const suffix = Date.now();

const rankingIds: string[] = [];
const clubIds: string[] = [];
const playerIds: string[] = [];

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  try {
    await prisma.ranking.count();
  } catch {
    dbOk = false;
    if (process.env.TEST_REQUIRE_DB === 'true')
      throw new Error('[R1/TEST_REQUIRE_DB] banco ausente no CI — falha, não skip');
  }
});

afterAll(async () => {
  if (dbOk) {
    if (rankingIds.length) await prisma.ranking.deleteMany({ where: { id: { in: rankingIds } } });
    if (clubIds.length) await prisma.club.deleteMany({ where: { id: { in: clubIds } } });
    if (playerIds.length) await prisma.player.deleteMany({ where: { id: { in: playerIds } } });
  }
  if (app) await app.close();
});

async function criarClube(nome: string) {
  const c = await prisma.club.create({
    data: { name: `${nome} ${suffix}`, country: 'BR' },
  });
  clubIds.push(c.id);
  return c;
}

async function criarJogador(nome: string) {
  const p = await prisma.player.create({
    data: { fullName: `${nome} ${suffix}` },
  });
  playerIds.push(p.id);
  return p;
}

async function criarRanking(dados: { name: string; type?: string }) {
  const r = await prisma.ranking.create({
    data: {
      name: `${dados.name} ${suffix}`,
      type: dados.type ?? 'club',
      season: '2024',
      publishedAt: new Date(),
    },
  });
  rankingIds.push(r.id);
  return r;
}

async function entrada(rankingId: string, campos: Record<string, unknown>) {
  return prisma.rankingEntry.create({ data: { rankingId, ...campos } as never });
}

describe('GET /rankings/:id/entries — nomes resolvidos', () => {
  it('traz clubName (não só o uuid) e ordena por posição', async () => {
    const ranking = await criarRanking({ name: 'Ranking Nomes' });
    const primeiro = await criarClube('Clube Primeiro');
    const segundo = await criarClube('Clube Segundo');

    await entrada(ranking.id, { clubId: segundo.id, position: 2, points: 80 });
    await entrada(ranking.id, { clubId: primeiro.id, position: 1, points: 95 });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/rankings/${ranking.id}/entries`,
    });
    expect(res.statusCode).toBe(200);

    const { data } = res.json() as {
      data: Array<{ position: number | null; clubName: string | null; points: number | null }>;
    };

    expect(data).toHaveLength(2);
    // 1) o NOME vem resolvido — é o ponto do ajuste
    expect(data[0].clubName).toBe(`Clube Primeiro ${suffix}`);
    expect(data[1].clubName).toBe(`Clube Segundo ${suffix}`);
    // 2) ordem por posição
    expect(data[0].position).toBe(1);
    expect(data[1].position).toBe(2);
  });

  it('posição NULL vai para o FIM — não encabeça o ranking', async () => {
    const ranking = await criarRanking({ name: 'Ranking Nulo' });
    const comPosicao = await criarClube('Com Posição');
    const semPosicao = await criarClube('Sem Posição');

    // criado PRIMEIRO de propósito: se a ordenação estivesse errada, o NULL apareceria em [0]
    await entrada(ranking.id, {
      clubId: semPosicao.id,
      position: null,
      points: null,
      reason: 'dados insuficientes',
    });
    await entrada(ranking.id, { clubId: comPosicao.id, position: 1, points: 90 });

    const res = await app.inject({ method: 'GET', url: `/api/v1/rankings/${ranking.id}/entries` });
    const { data } = res.json() as {
      data: Array<{ position: number | null; clubName: string | null }>;
    };

    expect(data[0].position).toBe(1);
    expect(data[0].clubName).toBe(`Com Posição ${suffix}`);
    expect(data[1].position).toBeNull();
  });

  it('ranking de JOGADOR resolve playerName e deixa clubName nulo', async () => {
    const ranking = await criarRanking({ name: 'Ranking Jogadores', type: 'player' });
    const j = await criarJogador('Jogador Um');

    await entrada(ranking.id, { playerId: j.id, clubId: null, position: 1, points: 88 });

    const res = await app.inject({ method: 'GET', url: `/api/v1/rankings/${ranking.id}/entries` });
    const { data } = res.json() as {
      data: Array<{ clubName: string | null; playerName: string | null }>;
    };

    expect(data[0].playerName).toBe(`Jogador Um ${suffix}`);
    expect(data[0].clubName).toBeNull();
  });

  it('404 para ranking inexistente', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/rankings/00000000-0000-4000-8000-000000000000/entries',
    });
    expect(res.statusCode).toBe(404);
  });
});
