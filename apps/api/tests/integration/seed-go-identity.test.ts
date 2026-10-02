/**
 * T448b-2d GO — Integração do seed de identidade (reduzido 2023–2024).
 * Postgres real (test DB). NÃO cria arestas WON. Homônimos intocados.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../src/config/prisma.js';
import {
  applyGoSeed,
  createPrismaGoSeedRepo,
  loadGoSeedPack,
  planGoSeed,
} from '../../src/lib/rsssf/go/index.js';

let dbOk = true;
const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');
const pack = loadGoSeedPack();
const QID_MOTHER = 'Q931386';
const QID_ATLETICO = 'Q198034';
const QID_VILA_NOVA_GO = 'Q1513287';
const QID_VILA_NOVA_RN = 'Q10391045';
const QID_VILA_NOVA_ES = 'Q10391046';
const QID_CONFLICT = 'Q94804001';
const createdClubIds: string[] = [];

async function ensureClub(qid: string, name: string): Promise<string> {
  const existing = await prisma.club.findUnique({ where: { qid }, select: { id: true } });
  if (existing) return existing.id;
  const c = await prisma.club.create({ data: { name, country: 'BR', qid }, select: { id: true } });
  createdClubIds.push(c.id);
  return c.id;
}

async function cleanup(): Promise<void> {
  if (!isPostgres) return;
  await prisma.competition.deleteMany({ where: { qid: { in: [QID_MOTHER, QID_CONFLICT] } } });
  if (createdClubIds.length)
    await prisma.club.deleteMany({ where: { id: { in: createdClubIds } } });
}

beforeAll(async () => {
  if (!isPostgres) return;
  try {
    await prisma.knowledgeGraph.count();
  } catch {
    dbOk = false;
    if (process.env.TEST_REQUIRE_DB === 'true')
      throw new Error('[R1/TEST_REQUIRE_DB] banco ausente no CI — falha, não skip (D-2026-09-18)');
    return;
  }
  // Estado base: sem mãe; Atlético presente; homônimos presentes; Vila Nova GO ausente.
  await prisma.competition.deleteMany({ where: { qid: QID_MOTHER } });
  await ensureClub(QID_ATLETICO, 'Atlético Clube Goianiense');
  await ensureClub(QID_VILA_NOVA_RN, 'Vila Nova Futebol Clube');
  await ensureClub(QID_VILA_NOVA_ES, 'Vila Nova FC (ES)');
});

afterAll(async () => {
  if (dbOk && isPostgres) await cleanup();
});

describe('T448b-2d GO — seed de identidade (Postgres real)', () => {
  it('dry-run: create mãe, noop Atlético, sem erros', async () => {
    if (!dbOk || !isPostgres) return;
    const plan = await planGoSeed(pack, createPrismaGoSeedRepo(prisma));
    expect(plan.pilotScope).toBe('go-2023-2024');
    expect(plan.competition).toMatchObject({ qid: QID_MOTHER, action: 'create', conflicts: [] });
    expect(plan.clubs).toEqual([{ qid: QID_ATLETICO, action: 'noop', conflicts: [] }]);
    expect(plan.errors).toEqual([]);
    expect(plan.wouldWrite).toBe(true);
  });

  it('apply: cria apenas a mãe; nenhum clube escrito; homônimos intactos', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await applyGoSeed(pack, createPrismaGoSeedRepo(prisma));
    expect(res.created).toBe(1);

    const mother = await prisma.competition.findMany({
      where: { qid: QID_MOTHER },
      select: { qid: true, type: true, country: true, importedFrom: true, sourceUrl: true },
    });
    expect(mother).toHaveLength(1);
    expect(mother[0]).toMatchObject({
      qid: QID_MOTHER,
      type: 'LEAGUE',
      country: 'BR',
      importedFrom: 'wikidata-go-pre',
      sourceUrl: 'https://www.wikidata.org/wiki/Q931386',
    });

    expect(await prisma.club.count({ where: { qid: QID_VILA_NOVA_GO } })).toBe(0);
    const rn = await prisma.club.findUnique({
      where: { qid: QID_VILA_NOVA_RN },
      select: { name: true },
    });
    const es = await prisma.club.findUnique({
      where: { qid: QID_VILA_NOVA_ES },
      select: { name: true },
    });
    expect(rn?.name).toBe('Vila Nova Futebol Clube');
    expect(es?.name).toBe('Vila Nova FC (ES)');
  });

  it('re-run ⇒ mother noop (idempotente)', async () => {
    if (!dbOk || !isPostgres) return;
    const plan = await planGoSeed(pack, createPrismaGoSeedRepo(prisma));
    expect(plan.competition.action).toBe('noop');
    expect(await prisma.competition.count({ where: { qid: QID_MOTHER } })).toBe(1);
  });

  it('nenhuma aresta WON criada para a mãe', async () => {
    if (!dbOk || !isPostgres) return;
    const mother = await prisma.competition.findUniqueOrThrow({
      where: { qid: QID_MOTHER },
      select: { id: true },
    });
    const edges = await prisma.knowledgeGraph.count({
      where: { relation: 'WON', targetId: mother.id },
    });
    expect(edges).toBe(0);
  });

  it('negativo: conflito de nome de competição ⇒ conflicting_competition_name', async () => {
    if (!dbOk || !isPostgres) return;
    await prisma.competition.deleteMany({ where: { qid: QID_MOTHER } }); // força o branch de create
    await prisma.competition.create({
      data: {
        name: 'Campeonato Goiano Teste Conflito',
        type: 'LEAGUE',
        country: 'BR',
        qid: QID_CONFLICT,
        importedFrom: 'manual',
      },
    });
    const plan = await planGoSeed(pack, createPrismaGoSeedRepo(prisma));
    expect(plan.competition.conflicts).toContain('conflicting_competition_name');
    await prisma.competition.deleteMany({ where: { qid: QID_CONFLICT } });
  });

  it('negativo: Atlético soft-deleted ⇒ soft_deleted_required_club', async () => {
    if (!dbOk || !isPostgres) return;
    await prisma.club.update({ where: { qid: QID_ATLETICO }, data: { deletedAt: new Date() } });
    const plan = await planGoSeed(pack, createPrismaGoSeedRepo(prisma));
    expect(plan.clubs[0].conflicts).toContain('soft_deleted_required_club');
    await prisma.club.update({ where: { qid: QID_ATLETICO }, data: { deletedAt: null } });
  });
});
