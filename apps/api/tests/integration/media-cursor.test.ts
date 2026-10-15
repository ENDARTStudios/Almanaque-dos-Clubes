/**
 * T547 — o invariante que permite QUATRO jobs de mídia conviverem: gravar a tentativa de
 * uma mídia MESCLA no registro, nunca substitui o objeto. Se um job apagasse as chaves do
 * outro, cada um voltaria ao início da fila (o defeito do T536).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../src/config/prisma.js';
import {
  selectPendingClubs,
  selectPendingPlayers,
  stampMediaAttempt,
  stampMediaAttempts,
  stampPlayerAttempt,
} from '../../src/modules/etl/media-cursor.js';

let dbOk = true;
const suf = Date.now();
let aId = '';
let bId = '';
// T550 — jogadores: nunca tentado, estagnado (>7d) e recente.
let pNovoId = '';
let pEstagnadoId = '';
let pRecenteId = '';

const diasAtras = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

beforeAll(async () => {
  try {
    await prisma.club.count();
  } catch {
    dbOk = false;
    return;
  }
  const a = await prisma.club.create({
    data: { name: `T547 A ${suf}`, qid: `Q99${suf}`, importedFrom: 't547-test' },
  });
  const b = await prisma.club.create({
    data: { name: `T547 B ${suf}`, qid: `Q98${suf}`, importedFrom: 't547-test' },
  });
  aId = a.id;
  bId = b.id;

  const novo = await prisma.player.create({
    data: { fullName: `T550 novo ${suf}`, qid: `Q95${suf}`, importedFrom: 't550-test' },
  });
  const estagnado = await prisma.player.create({
    data: { fullName: `T550 estagnado ${suf}`, qid: `Q94${suf}`, importedFrom: 't550-test' },
  });
  const recente = await prisma.player.create({
    data: { fullName: `T550 recente ${suf}`, qid: `Q93${suf}`, importedFrom: 't550-test' },
  });
  pNovoId = novo.id;
  pEstagnadoId = estagnado.id;
  pRecenteId = recente.id;
  // Carimbos com data controlada (o `at` é parâmetro justamente para poder testar isso).
  await stampPlayerAttempt(prisma, estagnado.id, 'profile', 'no_source', diasAtras(10));
  await stampPlayerAttempt(prisma, recente.id, 'profile', 'enriched', diasAtras(1));
});

afterAll(async () => {
  if (!dbOk) return;
  await prisma.club.deleteMany({ where: { importedFrom: 't547-test' } });
  await prisma.player.deleteMany({ where: { importedFrom: 't550-test' } });
});

describe('T547 — cursor de mídia', () => {
  it('gravar uma mídia NÃO apaga a chave das outras (mescla, não substituição)', async () => {
    if (!dbOk) return;
    await stampMediaAttempt(prisma, aId, 'logo', 'no_source');
    await stampMediaAttempt(prisma, aId, 'editorial', 'enriched');
    await stampMediaAttempts(prisma, aId, { kits: 'enriched', anthem: 'no_source' });

    const row = await prisma.club.findUnique({
      where: { id: aId },
      select: { mediaEnrichment: true },
    });
    const reg = (row?.mediaEnrichment ?? {}) as Record<string, { status?: string }>;
    expect(Object.keys(reg).sort()).toEqual(['anthem', 'editorial', 'kits', 'logo']);
    expect(reg.logo?.status).toBe('no_source');
    expect(reg.editorial?.status).toBe('enriched');
  });

  it('quem já foi tentado SAI da fila; quem não foi entra (é o que faz o lote avançar)', async () => {
    if (!dbOk) return;
    const pendentes = await selectPendingClubs(prisma, { limit: 5000, media: ['logo'] });
    const ids = pendentes.map((p) => p.id);
    expect(ids).not.toContain(aId); // já tentado (mesmo sem dado na fonte)
    expect(ids).toContain(bId); // ainda não tentado
  });

  it('mídias diferentes têm filas independentes', async () => {
    if (!dbOk) return;
    await prisma.club.update({
      where: { id: bId },
      data: { mediaEnrichment: { logo: { at: new Date().toISOString(), status: 'no_source' } } },
    });
    const soEditorial = await selectPendingClubs(prisma, { limit: 5000, media: ['editorial'] });
    expect(soEditorial.map((p) => p.id)).toContain(bId); // 'editorial' ainda pendente
    const soLogo = await selectPendingClubs(prisma, { limit: 5000, media: ['logo'] });
    expect(soLogo.map((p) => p.id)).not.toContain(bId); // 'logo' já tentado
  });

  it('T552 — carimbar `stadium` NÃO tira o clube das filas de logo/colors', async () => {
    if (!dbOk) return;
    // Era o defeito real: com a chave única `logo`, um clube que achou o estádio saía da
    // fila e nunca tentava as cores (teamColors em 2 de 12.003 clubes).
    const c = await prisma.club.create({
      data: { name: `T552 C ${suf}`, qid: `Q97${suf}`, importedFrom: 't547-test' },
    });
    await stampMediaAttempts(prisma, c.id, { stadium: 'enriched' });

    const tresChaves = await selectPendingClubs(prisma, {
      limit: 5000,
      media: ['logo', 'stadium', 'colors'],
    });
    expect(tresChaves.map((p) => p.id)).toContain(c.id); // ainda deve logo e colors
    const soStadium = await selectPendingClubs(prisma, { limit: 5000, media: ['stadium'] });
    expect(soStadium.map((p) => p.id)).not.toContain(c.id); // estádio já tentado
  });
});

/**
 * T550 — o cursor de JOGADOR. Limite alto de propósito: a fila é global, e a asserção tem
 * de valer com o acervo cheio (105.211 jogadores em produção), não só com a fixture.
 */
const LIMITE_TUDO = 1_000_000;

describe('T550 — cursor de jogador (perfil)', () => {
  it('recente (tentado ontem) fica fora da fila; nunca tentado entra', async () => {
    if (!dbOk) return;
    const fila = await selectPendingPlayers(prisma, { limit: LIMITE_TUDO });
    const ids = fila.map((p) => p.id);
    expect(ids).toContain(pNovoId);
    expect(ids).not.toContain(pRecenteId);
  });

  it('estagnado só volta quando `refreshDays` é pedido (a revisita é decisão explícita)', async () => {
    if (!dbOk) return;
    const semRefresh = await selectPendingPlayers(prisma, { limit: LIMITE_TUDO });
    expect(semRefresh.map((p) => p.id)).not.toContain(pEstagnadoId);
    const comRefresh = await selectPendingPlayers(prisma, { limit: LIMITE_TUDO, refreshDays: 7 });
    expect(comRefresh.map((p) => p.id)).toContain(pEstagnadoId);
  });

  it('nunca tentado vem ANTES do estagnado (a revisita não inane o fim da fila)', async () => {
    if (!dbOk) return;
    const fila = await selectPendingPlayers(prisma, { limit: LIMITE_TUDO, refreshDays: 7 });
    const ids = fila.map((p) => p.id);
    expect(ids.indexOf(pNovoId)).toBeGreaterThanOrEqual(0);
    expect(ids.indexOf(pEstagnadoId)).toBeGreaterThanOrEqual(0);
    expect(ids.indexOf(pNovoId)).toBeLessThan(ids.indexOf(pEstagnadoId));
  });

  it('o carimbo do jogador não toca o registro do clube (tabelas separadas)', async () => {
    if (!dbOk) return;
    const clube = await prisma.club.findUnique({
      where: { id: bId },
      select: { mediaEnrichment: true },
    });
    expect(clube?.mediaEnrichment ?? null).not.toBeNull(); // segue com o registro do T547
    const jogadorNovo = await prisma.player.findUnique({
      where: { id: pNovoId },
      select: { mediaEnrichment: true },
    });
    expect(jogadorNovo?.mediaEnrichment ?? null).toBeNull(); // nunca tentado, sem registro
  });
});
